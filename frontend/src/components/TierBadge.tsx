export type Tier = "bronze" | "silver" | "gold" | "diamond" | "champion";

export function tierFromPoints(pts: number): Tier {
  if (pts >= 1000) return "champion";
  if (pts >= 500)  return "diamond";
  if (pts >= 200)  return "gold";
  if (pts >= 50)   return "silver";
  return "bronze";
}

const NEXT: Record<Tier, number> = {
  bronze: 50, silver: 200, gold: 500, diamond: 1000, champion: 0,
};

const LABEL = { en: { bronze: "Bronze", silver: "Silver", gold: "Gold", diamond: "Diamond", champion: "Champion" }, he: { bronze: "ארד", silver: "כסף", gold: "זהב", diamond: "יהלום", champion: "אלוף" } };

/**
 * Animated tier badge with progress to next tier.
 */
export function TierBadge({ points, lang = "en" }: { points: number; lang?: "he" | "en" }) {
  const tier = tierFromPoints(points);
  const next = NEXT[tier];
  const prevThreshold = tier === "champion" ? 1000
                       : tier === "diamond" ? 500
                       : tier === "gold"    ? 200
                       : tier === "silver"  ? 50
                       : 0;
  const progress = tier === "champion" ? 1 : Math.min(1, (points - prevThreshold) / (next - prevThreshold));

  return (
    <div className="reveal flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className={`tier-${tier} grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-warm`}>
        <span className="text-xl">
          {tier === "champion" ? "👑" : tier === "diamond" ? "💎" : tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm font-black uppercase tracking-wider">
            {LABEL[lang][tier]}
          </span>
          {tier !== "champion" && (
            <span className="num text-[10px] text-muted-foreground">
              {points} / {next}
            </span>
          )}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`stat-bar-fill tier-${tier}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
