import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trophy } from 'lucide-react';
import { getMatches } from '@/server/matches.functions';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Group } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { FloatingScore } from '@/components/FloatingScore';
import { Sheet, ScoreStepper } from '@/components/Sheet';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/States';
import { toast } from 'sonner';
import { StadiumBg } from '@/components/StadiumBg';
import { BurstConfetti } from '@/components/BurstConfetti';
import { ParticleBurst } from '@/components/ParticleBurst';
import { haptic } from '@/hooks/useHaptic';
import { PinLiveButton } from '@/components/PinLiveButton';
import { CountdownTimer } from '@/components/CountdownTimer';
import { GuessForMe } from '@/components/GuessForMe';

export const Route = createFileRoute('/match/$id')({ component: MatchDetail });

function MatchDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();
  const [pinned, setPinned] = useState(false);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ home_score: number; away_score: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [goalBurst, setGoalBurst] = useState(0);
  const [saveBurst, setSaveBurst] = useState(0);
  const prevScoreRef = useRef<string>("");

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);
  useEffect(() => {
    const list: string[] = JSON.parse(localStorage.getItem('pinned') ?? '[]');
    setPinned(list.includes(id));
  }, [id]);

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => getMatches(),
    refetchInterval: 15_000,
  });

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.groups(),
    enabled: !!user,
  });

  const match = data?.matches.find((m) => m.id === id);

  const gid = selectedGroup ?? groups?.[0]?.id ?? null;

  useEffect(() => {
    if (!user || !match || !gid) return;
    api.predictions(gid, match.id)
      .then((r) => {
        const pred = r.predictions.find((p) => p.match_id === match.id);
        if (pred && pred.home_score != null && pred.away_score != null) {
          setExisting({ home_score: pred.home_score, away_score: pred.away_score });
          setHome(pred.home_score);
          setAway(pred.away_score);
        }
      })
      .catch(() => {});
  }, [user, match, gid]);

  const scoreKey = match ? `${match.homeScore}-${match.awayScore}` : '';
  const liveFlag = match ? (match.status === 'LIVE' || match.status === 'IN_PLAY' || match.status === 'PAUSED') : false;

  useEffect(() => {
    if (!liveFlag || !scoreKey) return;
    if (prevScoreRef.current && prevScoreRef.current !== scoreKey) {
      setGoalBurst((n) => n + 1);
      haptic('success');
    }
    prevScoreRef.current = scoreKey;
  }, [scoreKey, liveFlag]);

  if (!user) return null;
  if (isLoading || !match) return <AppShell><CardSkeleton count={3} /></AppShell>;

  const live = liveFlag;
  const finished = match.status === 'FINISHED';
  const kickoff = new Date(match.utcDate);
  const locked = kickoff.getTime() <= Date.now();
  const homeName = lang === 'he' ? match.homeTeamHe : match.homeTeam;
  const awayName = lang === 'he' ? match.awayTeamHe : match.awayTeam;

  const togglePin = () => {
    const list: string[] = JSON.parse(localStorage.getItem('pinned') ?? '[]');
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    localStorage.setItem('pinned', JSON.stringify(next));
    setPinned(next.includes(id));
  };

  const saveBet = async () => {
    if (!gid) { toast.error(lang === 'he' ? 'הצטרף לקבוצה תחילה' : 'Join a group first'); return; }
    if (home < 0 || away < 0) { toast.error(lang === 'he' ? 'תוצאה לא תקינה' : 'Invalid score'); return; }
    setSaving(true);
    try {
      await api.submitPrediction(gid, match.id, { home_score: home, away_score: away });
      setExisting({ home_score: home, away_score: away });
      setSheetOpen(false);
      toast.success(t('saved'));
      setSaveBurst((n) => n + 1);
      haptic('success');
      queryClient.invalidateQueries({ queryKey: ['my-predictions'] });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleUseBet = (h: number, a: number) => {
    setHome(h);
    setAway(a);
    setSheetOpen(true);
  };

  return (
    <AppShell title={lang === 'he' ? 'משחק' : 'Match'} action={
      <Link to="/" className="press grid h-10 w-10 place-items-center rounded-full text-muted-foreground" aria-label="back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
    }>
      <div className={`hero-banner shine-sweep card-lift relative p-5 ${live ? 'breathing-live' : ''}`}>
        <StadiumBg className="absolute inset-x-0 bottom-0 h-32 w-full text-primary-foreground opacity-40" />
        {goalBurst > 0 && <ParticleBurst trigger={goalBurst} count={20} />}
        <div className="relative flex items-center justify-between">
          <span className="hero-chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/90">{match.competition}</span>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold text-live-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-live-foreground live-pulse" />
              {match.minute ? `${match.minute}'` : t('live')}
            </span>
          )}
        </div>

        <div dir="ltr" className="relative mt-5 grid grid-cols-3 items-center gap-2 text-primary-foreground">
          <div className="text-center">
            <span className={`flag-wave inline-block drop-shadow-lg ${live ? 'flag-clash-l' : ''}`}><Flag country={match.homeTeam} size="lg" /></span>
            <div className="mt-2 truncate font-display text-sm font-bold">{homeName}</div>
          </div>
          <div className="text-center">
            {match.homeScore != null ? (
              <div key={scoreKey} className={`num score-display text-[52px] leading-none ${live ? 'score-pop' : ''}`}>
                {match.homeScore}<span className="px-1 font-sans not-italic text-primary-foreground/50">:</span>{match.awayScore}
              </div>
            ) : (
              <div className="hero-chip mx-auto inline-block rounded-2xl px-3 py-1.5">
                <div className="num font-display text-base font-bold">
                  {match.utcDate.slice(8,10)}/{match.utcDate.slice(5,7)}
                </div>
                <div className="num score-display text-2xl leading-none">{match.utcDate.slice(11,16)}</div>
              </div>
            )}
          </div>
          <div className="text-center">
            <span className={`flag-wave inline-block drop-shadow-lg ${live ? 'flag-clash-r' : ''}`}><Flag country={match.awayTeam} size="lg" /></span>
            <div className="mt-2 truncate font-display text-sm font-bold">{awayName}</div>
          </div>
        </div>

        <div className="relative mt-5 flex items-center gap-2">
          {!locked && !live && (
            <div className="hero-chip flex-1 rounded-2xl px-3 py-2 text-primary-foreground">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-75">{lang === 'he' ? 'בעוד' : 'Starts in'}</div>
              <CountdownTimer target={match.utcDate} lang={lang as 'he' | 'en'} compact />
            </div>
          )}
          {!finished && (
            <PinLiveButton
              matchId={match.id}
              live={live}
              size="lg"
              showLabel
              lang={lang as 'he' | 'en'}
              onChange={(p) => setPinned(p)}
            />
          )}
          {live && <FloatingScore match={match} label={t('floatScore')} />}
        </div>
      </div>

      {(live || finished) && (
        <div className="card-surface mt-4 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">⚽ {t('goalsTitle')}</h3>
            {match.htHome != null && match.htAway != null && (
              <span className="num shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                {t('halfTime')} {match.htHome}–{match.htAway}
              </span>
            )}
          </div>
          {match.events && match.events.length > 0 ? (
            <ul className="space-y-2.5">
              {[...match.events]
                .sort((a, b) => ((a.minute ?? 0) - (b.minute ?? 0)) || ((a.injury_time ?? 0) - (b.injury_time ?? 0)))
                .map((e, i) => {
                  const isHome = e.team === match.homeTla;
                  const teamName = isHome ? homeName : e.team === match.awayTla ? awayName : e.team;
                  const min = e.minute != null ? `${e.minute}${e.injury_time ? `+${e.injury_time}` : ''}'` : '';
                  return (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <span className="num w-12 shrink-0 text-end font-bold text-primary">{min}</span>
                      <span className="shrink-0 text-base">{e.type === 'OWN_GOAL' ? '🥅' : '⚽'}</span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-bold">{e.scorer ?? '—'}</span>
                        {e.type === 'PENALTY_SCORED' && <span className="ms-1 text-xs text-muted-foreground">({t('penaltyAbbr')})</span>}
                        {e.type === 'OWN_GOAL' && <span className="ms-1 text-xs text-muted-foreground">({t('ownGoalAbbr')})</span>}
                        {e.assist && <span className="ms-1 text-xs text-muted-foreground/70">· {e.assist}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{teamName}</span>
                    </li>
                  );
                })}
            </ul>
          ) : finished ? (
            <p className="text-sm text-muted-foreground">{t('goalDetailsUnavailable')}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noGoalsYet')}</p>
          )}
        </div>
      )}

      {groups && groups.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ${(selectedGroup ?? groups[0].id) === g.id ? 'bg-primary text-primary-foreground shadow-warm scale-105' : 'bg-secondary text-secondary-foreground'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="card-surface mt-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="icon-tile-soft h-10 w-10">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold">{t('placeBet')}</h3>
              <p className="text-xs text-muted-foreground">{t('yourPrediction')}</p>
            </div>
          </div>
          {existing && !locked && (
            <span className="num rounded-full bg-primary/10 px-3 py-1.5 font-display text-sm font-black text-primary">{existing.home_score}:{existing.away_score}</span>
          )}
        </div>

        {locked ? (
          <div className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t('matchStarted')}</div>
        ) : !gid ? (
          <div className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {lang === 'he' ? 'הצטרף לקבוצה כדי לנחש' : 'Join a group to place a prediction'}
          </div>
        ) : (
          <div className="relative mt-3">
            {saveBurst > 0 && <BurstConfetti trigger={saveBurst} count={28} />}
            <Button onClick={() => { haptic('light'); setSheetOpen(true); }} size="lg" className="press btn-glow ripple shine-sweep h-12 w-full rounded-2xl bg-gradient-warm font-display text-base font-bold shadow-warm">
              {existing ? (lang === 'he' ? 'ערוך ניחוש' : 'Edit prediction') : t('placeBet')}
            </Button>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t('score365rules')}</p>
      </div>

      {!locked && !!gid && (
        <GuessForMe
          matchId={match.id}
          homeNameEn={match.homeTeam}
          homeNameHe={match.homeTeamHe}
          awayNameEn={match.awayTeam}
          awayNameHe={match.awayTeamHe}
          onUseBet={handleUseBet}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={t('yourPrediction')}>
        <div className="flex gap-3">
          <ScoreStepper value={home} onChange={setHome} label={<><Flag country={match.homeTeam} size="sm" /><span className="ms-1 truncate">{homeName}</span></>} />
          <ScoreStepper value={away} onChange={setAway} label={<><Flag country={match.awayTeam} size="sm" /><span className="ms-1 truncate">{awayName}</span></>} />
        </div>
        <Button onClick={() => { haptic('medium'); saveBet(); }} disabled={saving} size="lg" className="press btn-glow ripple shine-sweep mt-5 h-12 w-full rounded-2xl bg-gradient-warm font-display text-base font-bold shadow-warm">
          {saving ? t('loading') : t('save')}
        </Button>
      </Sheet>
    </AppShell>
  );
}
