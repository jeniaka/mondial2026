import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { getMatches, type Match } from "@/server/matches.functions";
import { usePinned } from "@/hooks/usePinned";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/hooks/useHaptic";

function isLive(s: Match["status"]) {
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}

/**
 * Always-on floating tray that surfaces pinned LIVE matches with auto-refresh.
 * Rendered at AppShell level so it persists across route changes.
 * On Chromium browsers, "PiP" button on each card pops out a Document PiP window
 * which keeps showing scores even when the user switches to another tab/app.
 */
export function PinnedTray() {
  const { ids, unpin } = usePinned();
  const { lang, t } = useI18n();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const { data } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(),
    refetchInterval: 15_000,
    enabled: ids.length > 0,
  });

  const matchById = new Map<string, Match>(
    (data?.matches ?? []).map((m) => [m.id, m])
  );

  // Only show pinned matches that are currently live
  const pinnedLive = ids
    .map((id) => matchById.get(id))
    .filter((m): m is Match => !!m && isLive(m.status));

  // Auto-remove pins for matches that just finished
  useEffect(() => {
    for (const id of ids) {
      const m = matchById.get(id);
      if (m && m.status === "FINISHED") unpin(id);
    }
  }, [ids, matchById, unpin]);

  if (pinnedLive.length === 0) return null;

  return (
    <div className="pinned-tray">
      <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 shadow-warm">
        <div className="flex items-center justify-between bg-live/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-live">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-live live-pulse" />
            {lang === "he" ? `${pinnedLive.length} משחקים חיים` : `${pinnedLive.length} live`}
          </span>
          <button
            onClick={() => { haptic("light"); setCollapsed((v) => !v); }}
            className="press grid h-6 w-6 place-items-center rounded-full"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        {!collapsed && (
          <ul className="divide-y divide-border/40">
            {pinnedLive.map((m) => (
              <li key={m.id} className="pinned-card flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => { haptic("light"); nav({ to: "/match/$id", params: { id: m.id } }); }}
                  className="press flex flex-1 items-center gap-2 text-start"
                >
                  <span className="truncate text-sm font-semibold">
                    {lang === "he" ? m.homeTeamHe : m.homeTeam}
                  </span>
                  <span className="num shrink-0 rounded-md bg-card/70 px-2 py-0.5 text-sm font-black">
                    {m.homeScore ?? 0}<span className="opacity-50">:</span>{m.awayScore ?? 0}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {lang === "he" ? m.awayTeamHe : m.awayTeam}
                  </span>
                  <span className="ms-auto shrink-0 text-[9px] font-black uppercase tracking-wider text-live">
                    {m.minute ? `${m.minute}'` : "LIVE"}
                  </span>
                </button>
                <button
                  onClick={() => { haptic("medium"); unpin(m.id); }}
                  className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  aria-label={t("unpin")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
