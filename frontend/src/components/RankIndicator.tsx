import { ArrowUp, ArrowDown, Minus } from "lucide-react";

/**
 * Shows ↑N / ↓N / — based on rank change since last visit.
 */
export function RankIndicator({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="rank-same inline-flex items-center gap-0.5 text-[10px] font-bold">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="rank-up inline-flex items-center gap-0.5 text-[10px] font-black">
        <ArrowUp className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="rank-down inline-flex items-center gap-0.5 text-[10px] font-black">
      <ArrowDown className="h-3 w-3" />
      {-delta}
    </span>
  );
}
