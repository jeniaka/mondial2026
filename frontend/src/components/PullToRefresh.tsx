import { BallTrionda } from "@/components/BallDesigns";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

/**
 * Visible pull-to-refresh ball indicator that hangs from the top.
 * Plays nicely with window scroll (mobile).
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  const { pullDist, refreshing } = usePullToRefresh(onRefresh, 80);
  const progress = Math.min(1, pullDist / 80);
  const visible = pullDist > 0 || refreshing;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${Math.min(48, pullDist * 0.6)}px)`,
        transition: refreshing ? "opacity 220ms" : "none",
      }}
    >
      <div
        className={`ptr-ball ${refreshing ? "spinning" : ""}`}
        style={{
          width: 40, height: 40,
          transform: refreshing ? undefined : `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
        }}
      >
        <BallTrionda className="h-full w-full" />
      </div>
    </div>
  );
}
