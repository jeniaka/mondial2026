/**
 * Visual streak counter with flame size scaled to streak length.
 * Sparks animate when streak >= 3.
 */
export function FireStreak({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  const size = Math.min(48, 18 + count * 2);
  const showSparks = count >= 3;
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-red-500/15 px-2.5 py-1 text-xs font-black text-orange-500">
      <span className="flame" style={{ fontSize: size }} aria-hidden>🔥</span>
      <span className="num text-sm font-black tabular-nums">{count}</span>
      {label && <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>}
      {showSparks && (
        <>
          <span className="flame-spark" style={{ left: "30%", top: "20%", animationDelay: "0s",   ['--sx' as never]: "-8px" }} />
          <span className="flame-spark" style={{ left: "55%", top: "10%", animationDelay: "0.4s", ['--sx' as never]: "6px"  }} />
          <span className="flame-spark" style={{ left: "40%", top: "30%", animationDelay: "0.8s", ['--sx' as never]: "-4px" }} />
        </>
      )}
    </span>
  );
}
