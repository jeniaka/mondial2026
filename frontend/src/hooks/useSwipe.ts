import { useEffect, useRef } from "react";

type Opts = {
  onLeft?: () => void;   // swipe left → next
  onRight?: () => void;  // swipe right → previous
  threshold?: number;    // min |dx| to count as swipe
  ratio?: number;        // |dx| must be ≥ ratio * |dy|
  ignoreSelector?: string; // skip if target matches (e.g. ".scrollbar-none")
};

/**
 * Attach horizontal swipe detection to a ref. Ignores vertical scrolling.
 * Optionally skips when touch starts inside a matching ignoreSelector.
 */
export function useSwipe<T extends HTMLElement>(opts: Opts) {
  const ref = useRef<T | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const { ignoreSelector } = optsRef.current;
      if (ignoreSelector && e.target instanceof Element && e.target.closest(ignoreSelector)) {
        active = false;
        return;
      }
      // Skip if touched inside a horizontally scrollable region
      if (e.target instanceof Element) {
        let n: Element | null = e.target;
        while (n && n !== el) {
          const s = window.getComputedStyle(n);
          if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth) {
            active = false;
            return;
          }
          n = n.parentElement;
        }
      }
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const { threshold = 60, ratio = 1.6, onLeft, onRight } = optsRef.current;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < ratio * Math.abs(dy)) return; // too vertical
      if (dx < 0) onLeft?.();
      else onRight?.();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  return ref;
}
