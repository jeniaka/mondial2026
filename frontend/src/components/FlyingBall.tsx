import { useEffect, useRef } from "react";
import {
  BallTelstar, BallTango, BallBrazuca, BallTelstar18, BallAlRihla, BallTrionda,
} from "@/components/BallDesigns";
import { haptic } from "@/hooks/useHaptic";

/**
 * Ambient flying World Cup balls — 6 designs, drift + spin.
 * Tap/click ANY ball (even when sitting "behind" UI cards) → it bounces away
 * from your finger with physics. Uses a window-level pointerdown listener
 * + manual hit-testing of each ball's bounding rect, so it's not blocked
 * by overlapping content / z-index stacking.
 */

type Ball = {
  el: HTMLDivElement | null;
  vx: number; vy: number;        // velocity (px/frame)
  ox: number; oy: number;        // offset from CSS origin
  ang: number; spin: number;     // rotation + spin velocity
  active: boolean;               // is in bounce mode
  released: number;              // ts when last bounced — used to restore CSS drift
};

const FRICTION = 0.94;
const SPIN_FRICTION = 0.97;
const MAX_INITIAL_VEL = 16;
const REST_THRESHOLD = 0.18;
const HIT_PADDING = 6;            // extra px around ball bounds for easier taps

export function FlyingBall() {
  const refs = useRef<Ball[]>([]);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // init ball physics state once
  if (refs.current.length === 0) {
    for (let i = 0; i < 6; i++) {
      refs.current.push({
        el: null, vx: 0, vy: 0, ox: 0, oy: 0, ang: 0, spin: 0,
        active: false, released: 0,
      });
    }
  }

  useEffect(() => {
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      let anyActive = false;
      const containerRect = containerRef.current?.getBoundingClientRect();

      for (const b of refs.current) {
        if (!b.active) continue;
        anyActive = true;
        b.ox += b.vx;
        b.oy += b.vy;
        b.ang += b.spin;
        b.vx *= FRICTION;
        b.vy *= FRICTION;
        b.spin *= SPIN_FRICTION;
        b.vy += 0.18;                       // mild gravity

        // bounce off container edges
        if (containerRect && b.el) {
          const r = b.el.getBoundingClientRect();
          const cx = r.left + r.width / 2 - containerRect.left;
          const cy = r.top + r.height / 2 - containerRect.top;
          const half = r.width / 2;
          if (cx < half && b.vx < 0)                          b.vx = -b.vx * 0.55;
          if (cx > containerRect.width - half && b.vx > 0)    b.vx = -b.vx * 0.55;
          if (cy < half && b.vy < 0)                          b.vy = -b.vy * 0.55;
          if (cy > containerRect.height - half && b.vy > 0)   b.vy = -b.vy * 0.55;
        }

        // settle
        if (Math.abs(b.vx) < REST_THRESHOLD && Math.abs(b.vy) < REST_THRESHOLD && Math.abs(b.spin) < 0.3) {
          b.ox *= 0.85; b.oy *= 0.85;
          if (Math.abs(b.ox) < 0.5 && Math.abs(b.oy) < 0.5) {
            b.ox = 0; b.oy = 0; b.active = false; b.released = performance.now();
          }
        }

        if (b.el) {
          b.el.style.transform = `translate3d(${b.ox.toFixed(1)}px, ${b.oy.toFixed(1)}px, 0) rotate(${b.ang.toFixed(1)}deg)`;
        }
      }

      // restore CSS drift after settle
      const now = performance.now();
      for (const b of refs.current) {
        if (!b.active && b.released && now - b.released > 250 && b.el) {
          b.el.style.transform = "";
          b.el.style.animationPlayState = "";
          b.released = 0;
        }
      }

      if (anyActive) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const ensureLoop = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };

    // Window-level pointerdown handler. Manually hit-tests each ball's rect,
    // so overlapping UI doesn't block taps reaching the balls.
    const onPointerDown = (e: PointerEvent) => {
      const px = e.clientX, py = e.clientY;
      for (let i = 0; i < refs.current.length; i++) {
        const b = refs.current[i];
        if (!b.el) continue;
        const r = b.el.getBoundingClientRect();
        if (
          px >= r.left - HIT_PADDING &&
          px <= r.right + HIT_PADDING &&
          py >= r.top - HIT_PADDING &&
          py <= r.bottom + HIT_PADDING
        ) {
          // Bounce!
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = cx - px;
          const dy = cy - py;
          const len = Math.hypot(dx, dy) || 1;
          b.vx = (dx / len) * MAX_INITIAL_VEL;
          b.vy = (dy / len) * MAX_INITIAL_VEL - 4;
          b.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
          b.active = true;
          if (b.el) b.el.style.animationPlayState = "paused";
          haptic("light");
          ensureLoop();
          // Don't stop propagation — let underlying UI still receive the tap.
          // But hit only ONE ball per tap (first match wins).
          return;
        }
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      stopped = true;
      window.removeEventListener("pointerdown", onPointerDown);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const balls = [
    BallTrionda, BallTelstar, BallBrazuca, BallTango, BallTelstar18, BallAlRihla,
  ];

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      {balls.map((BallSvg, i) => (
        <div
          key={i}
          ref={(node) => { refs.current[i].el = node; }}
          className={`flying-ball flying-ball-${i + 1}`}
        >
          <BallSvg className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}
