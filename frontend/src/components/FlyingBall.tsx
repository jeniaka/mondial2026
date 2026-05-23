import { useEffect, useRef, useState } from "react";
import {
  BallTelstar, BallTango, BallBrazuca, BallTelstar18, BallAlRihla, BallTrionda,
} from "@/components/BallDesigns";
import { haptic } from "@/hooks/useHaptic";

/**
 * Ambient flying World Cup balls — 6 designs, ambient drift + spin.
 * TAP/CLICK a ball to bounce it away from your finger with a small physics nudge.
 * The drift animation pauses while a bounce is active; restarts after settle.
 */

type Ball = {
  el: React.RefObject<HTMLDivElement | null>;
  vx: number; vy: number;        // velocity (px/frame)
  ox: number; oy: number;        // offset from CSS origin
  ang: number; spin: number;     // rotation + spin velocity
  active: boolean;               // is in bounce mode
  released: number;              // ts when last bounced — used to restore CSS drift
};

const FRICTION = 0.94;          // velocity decay per frame
const SPIN_FRICTION = 0.97;
const MAX_INITIAL_VEL = 14;     // px/frame
const REST_THRESHOLD = 0.15;    // below this, snap to rest

export function FlyingBall() {
  const refs = useRef<Ball[]>([]);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [, force] = useState(0);

  // init ball physics state once
  if (refs.current.length === 0) {
    for (let i = 0; i < 6; i++) {
      refs.current.push({
        el: { current: null },
        vx: 0, vy: 0, ox: 0, oy: 0, ang: 0, spin: 0,
        active: false, released: 0,
      });
    }
  }

  useEffect(() => {
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      let anyActive = false;
      for (const b of refs.current) {
        if (!b.active) continue;
        anyActive = true;
        b.ox += b.vx;
        b.oy += b.vy;
        b.ang += b.spin;
        b.vx *= FRICTION;
        b.vy *= FRICTION;
        b.spin *= SPIN_FRICTION;
        // mild downward gravity so balls settle naturally
        b.vy += 0.18;

        // soft bounce off container edges (keeps balls within the 480px column)
        const rect = containerRef.current?.getBoundingClientRect();
        const half = 32;
        if (rect) {
          const elRect = b.el.current?.getBoundingClientRect();
          if (elRect) {
            const cxRel = elRect.left + elRect.width / 2 - rect.left;
            const cyRel = elRect.top + elRect.height / 2 - rect.top;
            if (cxRel < half && b.vx < 0)             b.vx = -b.vx * 0.55;
            if (cxRel > rect.width - half && b.vx > 0) b.vx = -b.vx * 0.55;
            if (cyRel < half && b.vy < 0)             b.vy = -b.vy * 0.55;
            if (cyRel > rect.height - half && b.vy > 0) b.vy = -b.vy * 0.55;
          }
        }

        // settle
        if (Math.abs(b.vx) < REST_THRESHOLD && Math.abs(b.vy) < REST_THRESHOLD && Math.abs(b.spin) < 0.2) {
          // ease offset back to 0 so CSS drift animation re-takes over smoothly
          b.ox *= 0.88; b.oy *= 0.88;
          if (Math.abs(b.ox) < 0.5 && Math.abs(b.oy) < 0.5) {
            b.ox = 0; b.oy = 0; b.active = false; b.released = performance.now();
          }
        }

        // apply to DOM
        if (b.el.current) {
          b.el.current.style.transform = `translate3d(${b.ox.toFixed(1)}px, ${b.oy.toFixed(1)}px, 0) rotate(${b.ang.toFixed(1)}deg)`;
        }
      }
      // remove inline transform once a ball has been idle for 250ms to restore CSS drift
      const now = performance.now();
      for (const b of refs.current) {
        if (!b.active && b.released && now - b.released > 250 && b.el.current) {
          b.el.current.style.transform = "";
          b.el.current.style.animationPlayState = "";
          b.released = 0;
        }
      }
      if (anyActive) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    // start loop if needed
    const ensureLoop = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };

    // expose so handlers can re-start
    (refs.current as Ball[] & { ensureLoop?: () => void }).ensureLoop = ensureLoop;

    return () => {
      stopped = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onBallPointer = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const b = refs.current[i];
    if (!b) return;
    const el = b.el.current;
    if (!el) return;

    // direction: vector FROM pointer TO ball center, then normalize, then add speed
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - e.clientX;
    const dy = cy - e.clientY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = MAX_INITIAL_VEL;
    b.vx = (dx / len) * speed;
    b.vy = (dy / len) * speed - 4;            // slight upward kick
    b.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
    b.active = true;
    // pause CSS drift animation while bouncing
    el.style.animationPlayState = "paused";
    haptic("light");

    const reg = refs.current as Ball[] & { ensureLoop?: () => void };
    reg.ensureLoop?.();
    force((n) => n + 1);
  };

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
          ref={(node) => { refs.current[i].el.current = node; }}
          className={`flying-ball flying-ball-${i + 1} pointer-events-auto cursor-pointer touch-manipulation`}
          onPointerDown={onBallPointer(i)}
        >
          <BallSvg className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}
