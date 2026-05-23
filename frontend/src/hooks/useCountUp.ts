import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates from previous value to next when `target` changes.
 * Uses requestAnimationFrame, easeOutCubic, ~700ms.
 */
export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const startRef = useRef(target);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reduced.current) { setValue(target); return; }
    const from = startRef.current;
    const to = target;
    if (from === to) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else startRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
}
