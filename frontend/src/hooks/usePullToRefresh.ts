import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh from top of scrollable viewport.
 * Returns: { pullDist, refreshing, ref } — attach ref to a scroll container.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void, threshold = 80) {
  const ref = useRef<HTMLElement | null>(null);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = ref.current ?? document.scrollingElement ?? document.documentElement;
    const target: HTMLElement | Document = ref.current ?? document;

    const onStart = (e: TouchEvent) => {
      if ((el as HTMLElement).scrollTop > 4) { active.current = false; return; }
      const t = e.touches[0]; if (!t) return;
      startY.current = t.clientY;
      active.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active.current || refreshing) return;
      const t = e.touches[0]; if (!t) return;
      const dy = t.clientY - startY.current;
      if (dy <= 0) { setPullDist(0); return; }
      // resist for nicer feel
      const eased = Math.min(threshold * 1.5, Math.pow(dy, 0.85));
      setPullDist(eased);
    };
    const onEnd = async () => {
      if (!active.current) return;
      active.current = false;
      const d = pullDist;
      if (d >= threshold) {
        setRefreshing(true);
        setPullDist(threshold);
        try { await onRefreshRef.current(); }
        finally {
          setRefreshing(false);
          setPullDist(0);
        }
      } else {
        setPullDist(0);
      }
    };

    target.addEventListener("touchstart", onStart as EventListener, { passive: true });
    target.addEventListener("touchmove",  onMove  as EventListener, { passive: true });
    target.addEventListener("touchend",   onEnd   as EventListener, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onStart as EventListener);
      target.removeEventListener("touchmove",  onMove  as EventListener);
      target.removeEventListener("touchend",   onEnd   as EventListener);
    };
  }, [pullDist, refreshing, threshold]);

  return { pullDist, refreshing, ref };
}
