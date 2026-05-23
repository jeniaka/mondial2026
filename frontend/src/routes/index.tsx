import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalIcon, Sparkles } from "lucide-react";
import { getMatches, type Match } from "@/server/matches.functions";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { EmptyState, CardSkeleton } from "@/components/States";
import { ParticleBurst } from "@/components/ParticleBurst";
import { PinLiveButton } from "@/components/PinLiveButton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { GoalCelebration } from "@/components/GoalCelebration";
import { CountdownTimer } from "@/components/CountdownTimer";
import { usePinned } from "@/hooks/usePinned";
import { haptic } from "@/hooks/useHaptic";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const { ids: pinned } = usePinned();
  const [goalTrigger, setGoalTrigger] = useState(0);
  const prevScoresRef = useRef<Record<string, string>>({});

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(),
    refetchInterval: 30_000,
  });

  if (!user) return null;

  const matches = data?.matches ?? [];
  const live = matches.filter((m) => isLive(m.status));
  const upcoming = matches.filter((m) => !isLive(m.status) && m.status !== "FINISHED");
  const finished = matches.filter((m) => m.status === "FINISHED");
  const pinnedMatches = matches.filter((m) => pinned.includes(m.id));
  const nextMatch = upcoming[0];

  // Trigger goal celebration when a PINNED LIVE match scores
  useEffect(() => {
    for (const m of live) {
      if (!pinned.includes(m.id)) continue;
      const key = `${m.homeScore}-${m.awayScore}`;
      const prev = prevScoresRef.current[m.id];
      if (prev && prev !== key && m.homeScore != null) {
        setGoalTrigger((n) => n + 1);
        haptic("success");
      }
      prevScoresRef.current[m.id] = key;
    }
  }, [live, pinned]);

  // Group upcoming by date in Israel time (UTC+3)
  const byDate = upcoming.reduce<Record<string, Match[]>>((acc, m) => {
    const k = idtDateLabel(m.utcDate, lang);
    (acc[k] ??= []).push(m);
    return acc;
  }, {});

  return (
    <AppShell>
      <PullToRefresh onRefresh={() => refetch()} />
      <GoalCelebration trigger={goalTrigger} />

      {/* Hero */}
      <div className="shine-sweep card-lift mb-4 overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div className="flex items-center gap-2 text-primary-foreground/85">
          <Sparkles className="h-4 w-4 tab-icon-bounce" /> <span className="text-xs font-bold uppercase tracking-wider">USA · CAN · MEX 2026</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-black leading-tight text-primary-foreground">{t("tagline")}</h1>
        <p className="mt-1.5 text-xs text-primary-foreground/85">{t("score365rules")}</p>
        {nextMatch && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary-foreground/15 px-3 py-2 backdrop-blur">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/70">
                {lang === "he" ? "המשחק הבא" : "Next match"}
              </div>
              <div className="truncate text-xs font-bold text-primary-foreground">
                {(lang === "he" ? nextMatch.homeTeamHe : nextMatch.homeTeam)} vs {(lang === "he" ? nextMatch.awayTeamHe : nextMatch.awayTeam)}
              </div>
            </div>
            <div className="text-primary-foreground">
              <CountdownTimer target={nextMatch.utcDate} lang={lang as "he" | "en"} compact />
            </div>
          </div>
        )}
      </div>

      {pinnedMatches.length > 0 && (
        <Section title={`📌 ${t("pinLive")}`}>
          {pinnedMatches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
        </Section>
      )}

      {live.length > 0 && (
        <Section title={t("live")} live>
          {live.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
        </Section>
      )}

      {isLoading ? (
        <>
          <h2 className="mb-2 mt-2 flex items-center gap-2 font-display text-lg font-bold">
            <CalIcon className="h-4 w-4 text-primary" /> {t("upcoming")}
          </h2>
          <CardSkeleton count={4} />
        </>
      ) : isError ? (
        <EmptyState
          title={lang === "he" ? "שגיאת רשת" : "Network error"}
          hint={lang === "he" ? "לא ניתן לטעון משחקים" : "Could not load matches"}
          action={<button onClick={() => refetch()} className="press rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{lang === "he" ? "נסה שוב" : "Try again"}</button>}
        />
      ) : matches.length === 0 ? (
        <EmptyState title={lang === "he" ? "המשחקים יפורסמו עם פרסומם הרשמי" : "Fixtures will appear once published"} hint={lang === "he" ? "המונדיאל מתחיל ב-11 ביוני 2026" : "World Cup starts June 11, 2026"} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="mb-2 mt-2 flex items-center gap-2 font-display text-lg font-bold">
                <CalIcon className="h-4 w-4 text-primary" /> {t("upcoming")}
              </h2>
              {Object.entries(byDate).map(([date, ms]) => (
                <div key={date} className="mb-4">
                  <div className="sticky-slide sticky top-14 z-10 -mx-4 mb-2 bg-background/85 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {date}
                  </div>
                  <div className="grid gap-2">
                    {ms.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
                  </div>
                </div>
              ))}
            </>
          )}
          {finished.length > 0 && (
            <Section title={t("finished")}>
              {finished.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
            </Section>
          )}
        </>
      )}
    </AppShell>
  );
}

function Section({ title, children, live }: { title: string; children: React.ReactNode; live?: boolean }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
        {live && <span className="h-2 w-2 rounded-full bg-live live-pulse" />}
        {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

const GB_FLAGS: Record<string, string> = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "GB-WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "GB-NIR": "🇬🇧",
};

function toFlag(iso2: string): string {
  const code = iso2.toUpperCase();
  if (GB_FLAGS[code]) return GB_FLAGS[code];
  const base = code.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(base)) return base;
  return [...base].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

// Server sends kickoff_utc as a naive Israel-time string "YYYY-MM-DDTHH:MM:SS".
// Slice directly — no Date parsing, no timezone API, works in every browser.
function idtTime(s: string): string {
  return s.slice(11, 16); // "22:00"
}

function idtDateLabel(s: string, lang: string): string {
  const [y, mo, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(
    lang === "he" ? "he-IL" : "en-GB",
    { weekday: "long", day: "2-digit", month: "long" },
  );
}

function MatchCard({ match, index = 0 }: { match: Match; index?: number }) {
  const nav = useNavigate();
  const { lang } = useI18n();
  const live = isLive(match.status);
  const finished = match.status === "FINISHED";
  const time = idtTime(match.utcDate);
  const homeName = lang === "he" ? match.homeTeamHe : match.homeTeam;
  const awayName = lang === "he" ? match.awayTeamHe : match.awayTeam;
  const scoreKey = `${match.homeScore}-${match.awayScore}`;
  const prevScoreRef = useRef(scoreKey);
  const [goalBurst, setGoalBurst] = useState(0);

  useEffect(() => {
    if (prevScoreRef.current !== scoreKey && live && match.homeScore != null) {
      setGoalBurst((n) => n + 1);
      haptic("success");
    }
    prevScoreRef.current = scoreKey;
  }, [scoreKey, live, match.homeScore]);

  return (
    <div
      onClick={() => { haptic("light"); nav({ to: "/match/$id", params: { id: match.id } }); }}
      className={`reveal press card-lift relative flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-gradient-card p-3 shadow-soft ${live ? "breathing-live" : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {goalBurst > 0 && <ParticleBurst trigger={goalBurst} count={14} />}
      <div className="flex flex-1 items-center justify-end gap-1.5 overflow-hidden">
        <span className="truncate text-sm font-semibold">{homeName}</span>
        <span className="flag-wave shrink-0 text-xl leading-none">{toFlag(match.homeIso2)}</span>
      </div>
      <div className="grid min-w-[60px] shrink-0 place-items-center">
        {match.homeScore != null ? (
          <div key={scoreKey} className={`num font-display text-2xl font-black ${live ? "score-pop" : ""}`}>
            {match.homeScore}<span className="px-0.5 text-muted-foreground">:</span>{match.awayScore}
          </div>
        ) : (
          <div className="num rounded-md bg-secondary px-2 py-0.5 text-sm font-semibold">{time}</div>
        )}
        {live && (
          <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live live-pulse" />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </div>
        )}
      </div>
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
        <span className="flag-wave shrink-0 text-xl leading-none">{toFlag(match.awayIso2)}</span>
        <span className="truncate text-sm font-semibold">{awayName}</span>
      </div>
      {!finished && (
        <div onClick={(e) => e.stopPropagation()}>
          <PinLiveButton matchId={match.id} live={live} size="sm" lang={lang as "he" | "en"} />
        </div>
      )}
    </div>
  );
}

function isLive(s: Match["status"]) {
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
