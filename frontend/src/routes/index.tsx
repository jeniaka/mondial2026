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
  const anchorRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(),
    refetchInterval: 30_000,
  });

  // Compute lists from data (safe when data is undefined)
  const matches = data?.matches ?? [];
  const live = matches.filter((m) => isLive(m.status));
  const upcoming = matches.filter((m) => !isLive(m.status) && m.status !== "FINISHED");
  const pinnedMatches = matches.filter((m) => pinned.includes(m.id));
  const nextMatch = upcoming[0];

  // Anchor = first match whose kickoff is in the future (>= now); if every
  // match is already over, the last match. Computed from kickoff datetime
  // (stored as naive Israel/UTC+3 wall-clock) so it's correct regardless of the
  // viewer's own timezone. See kickoffMs().
  const anchorId = (() => {
    if (matches.length === 0) return null;
    const sorted = [...matches].sort((a, b) => kickoffMs(a.utcDate) - kickoffMs(b.utcDate));
    const now = Date.now();
    const next = sorted.find((m) => kickoffMs(m.utcDate) >= now);
    return (next ?? sorted[sorted.length - 1]).id;
  })();

  // Auto-scroll the Matches tab to the anchor match — ONCE per tab entry.
  // AppShell remounts this page (key={pathname}) on every tab switch, so the
  // guard ref resets on re-entry and the scroll runs again exactly once.
  // After it positions the view it never fires again: no interval, no re-assert.
  // We wait for document.fonts.ready first — the web-font swap changes row
  // heights, so measuring earlier mis-positions / clamps the scroll — capped at
  // 600ms so a slow font load can't stall it, then position once after a frame.
  // "instant" is required because the global html{scroll-behavior:smooth} would
  // otherwise animate it. If the user starts scrolling before we position, we
  // bail so we never fight them.
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    if (!user || isLoading || !anchorId) return;
    hasAutoScrolledRef.current = true;

    let cancelled = false;
    const cleanup = () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
    function stop() { cancelled = true; cleanup(); }
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);

    const position = () => {
      if (cancelled) return;
      const el = anchorRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: Math.max(0, y), behavior: "instant" as ScrollBehavior });
      }
      cleanup();
    };

    let ran = false;
    const run = () => {
      if (ran) return;
      ran = true;
      requestAnimationFrame(() => requestAnimationFrame(position));
    };
    const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(run);
    const cap = window.setTimeout(run, 600);

    return () => { cancelled = true; cleanup(); clearTimeout(cap); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, anchorId]);

  // Trigger goal celebration when a PINNED LIVE match scores
  // (must be BEFORE any early return — Rules of Hooks)
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

  if (!user) return null;

  // One chronological list: finished (with scores) + upcoming, grouped by date in
  // Israel time (UTC+3). Live matches keep their own section above; everything else
  // flows oldest→newest so the whole tournament is scrollable from the start.
  // `matches` arrives sorted by kickoff (API), so the date groups stay in order.
  const listMatches = matches.filter((m) => !isLive(m.status));
  const byDate = listMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const k = idtDateLabel(m.utcDate, lang);
    (acc[k] ??= []).push(m);
    return acc;
  }, {});

  return (
    <AppShell>
      <PullToRefresh onRefresh={() => refetch()} />
      <GoalCelebration trigger={goalTrigger} />

      {/* Hero */}
      <div className="hero-banner shine-sweep mb-5 p-5">
        <div className="flex items-center justify-between gap-2 text-primary-foreground/90">
          <span className="hero-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> USA · CAN · MEX 2026
          </span>
        </div>
        <h1 className="mt-3 font-display text-[26px] font-black italic leading-tight text-primary-foreground">{t("tagline")}</h1>
        {nextMatch ? (
          <div className="hero-chip mt-4 rounded-2xl px-4 py-3 text-primary-foreground">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground/75">
              {lang === "he" ? "המשחק הבא" : "Next match"}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <span className="flag-wave text-3xl leading-none">{toFlag(nextMatch.homeIso2)}</span>
                <span className="score-display text-lg text-primary-foreground/70">VS</span>
                <span className="flag-wave text-3xl leading-none">{toFlag(nextMatch.awayIso2)}</span>
              </div>
              <CountdownTimer target={nextMatch.utcDate} lang={lang as "he" | "en"} compact />
            </div>
            <div className="mt-1 truncate text-center text-xs font-bold">
              {(lang === "he" ? nextMatch.homeTeamHe : nextMatch.homeTeam)} — {(lang === "he" ? nextMatch.awayTeamHe : nextMatch.awayTeam)}
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-primary-foreground/85">{t("score365rules")}</p>
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
          <h2 className="section-label mb-3 mt-2">{t("upcoming")}</h2>
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
          {Object.entries(byDate).map(([date, ms]) => (
            <div key={date} className="mb-5">
              <div className="sticky-slide sticky top-[60px] z-10 -mx-4 mb-2 bg-background/85 px-4 py-1.5 backdrop-blur">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground">
                  <CalIcon className="h-3 w-3 text-primary" /> {date}
                </span>
              </div>
              <div className="grid gap-2.5">
                {ms.map((m, i) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    index={i}
                    cardRef={m.id === anchorId ? anchorRef : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </AppShell>
  );
}

function Section({ title, children, live }: { title: string; children: React.ReactNode; live?: boolean }) {
  return (
    <section className="mb-5">
      <h2 className="section-label mb-3">
        {title}
        {live && <span className="h-2 w-2 rounded-full bg-live live-pulse" />}
      </h2>
      <div className="grid gap-2.5">{children}</div>
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

// Absolute epoch ms for a kickoff. The string is Israel wall-clock (UTC+3 all
// tournament — June/July 2026 is IDT), so subtract 3h to get UTC. Built from
// parts (not new Date(str)) so it's identical in every browser/timezone.
function kickoffMs(s: string): number {
  const [datePart = "", timePart = "00:00:00"] = s.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h = 0, mi = 0, se = 0] = timePart.split(":").map(Number);
  if (!y || !mo || !d) return Number.POSITIVE_INFINITY; // unknown date → treat as far future
  return Date.UTC(y, mo - 1, d, h, mi, se) - 3 * 60 * 60 * 1000;
}

function idtDateLabel(s: string, lang: string): string {
  const [y, mo, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(
    lang === "he" ? "he-IL" : "en-GB",
    { weekday: "long", day: "2-digit", month: "long" },
  );
}

function MatchCard({ match, index = 0, cardRef }: { match: Match; index?: number; cardRef?: React.Ref<HTMLDivElement> }) {
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
      ref={cardRef}
      data-match-id={match.id}
      dir="ltr"
      onClick={() => { haptic("light"); nav({ to: "/match/$id", params: { id: match.id } }); }}
      className={`reveal press card-lift card-surface relative flex cursor-pointer items-center gap-2 p-3.5 ${live ? "breathing-live" : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {goalBurst > 0 && <ParticleBurst trigger={goalBurst} count={14} />}
      <div className="flex flex-1 items-center justify-end gap-2 overflow-hidden">
        <span className="truncate text-sm font-bold">{homeName}</span>
        <span className="flag-wave shrink-0 text-2xl leading-none">{toFlag(match.homeIso2)}</span>
      </div>
      <div className="grid min-w-[64px] shrink-0 place-items-center">
        {match.homeScore != null ? (
          <div key={scoreKey} className={`num score-display text-[26px] ${live ? "score-pop" : ""}`}>
            {match.homeScore}<span className="px-0.5 font-sans not-italic text-muted-foreground">:</span>{match.awayScore}
          </div>
        ) : (
          <div className="num rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">{time}</div>
        )}
        {live && (
          <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live live-pulse" />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </div>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <span className="flag-wave shrink-0 text-2xl leading-none">{toFlag(match.awayIso2)}</span>
        <span className="truncate text-sm font-bold">{awayName}</span>
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
