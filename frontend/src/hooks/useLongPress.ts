import { useCallback, useRef } from "react";

type Options = {
  ms?: number;       // press duration (default 500)
  moveTolerance?: number;  // px finger may travel before canceling (default 10)
};

/**
 * Returns pointer event handlers that fire `onLongPress` after `ms` of
 * stationary press. Also returns `onPress` for the short-tap case.
 * Cancels on movement, pointer leave, or pointer up before threshold.
 */
export function useLongPress(
  onLongPress: (e: React.PointerEvent) => void,
  opts: Options = {}
) {
  const ms = opts.ms ?? 500;
  const tol = opts.moveTolerance ?? 10;
  const timer = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    firedRef.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    timer.current = window.setTimeout(() => {
      firedRef.current = true;
      onLongPress(e);
    }, ms);
  }, [ms, onLongPress]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (timer.current == null) return;
    if (Math.abs(e.clientX - startX.current) > tol ||
        Math.abs(e.clientY - startY.current) > tol) {
      clear();
    }
  }, [tol, clear]);

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerLeave = useCallback(() => clear(), [clear]);
  const onPointerCancel = useCallback(() => clear(), [clear]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel };
}
