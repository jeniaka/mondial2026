import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pin } from 'lucide-react';
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

export const Route = createFileRoute('/match/$id')({ component: MatchDetail });

function MatchDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [pinned, setPinned] = useState(false);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ home_score: number; away_score: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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

  if (!user) return null;
  if (isLoading || !match) return <AppShell><CardSkeleton count={3} /></AppShell>;

  const live = match.status === 'LIVE' || match.status === 'IN_PLAY' || match.status === 'PAUSED';
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
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title={lang === 'he' ? 'משחק' : 'Match'} action={
      <Link to="/" className="press grid h-10 w-10 place-items-center rounded-full text-muted-foreground" aria-label="back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
    }>
      <div className="overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">{match.competition}</span>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold text-live-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-live-foreground live-pulse" />
              {match.minute ? `${match.minute}'` : t('live')}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 items-center gap-2 text-primary-foreground">
          <div className="text-center">
            <Flag country={match.homeTeam} size="lg" />
            <div className="mt-2 truncate text-sm font-bold">{homeName}</div>
          </div>
          <div className="text-center">
            {match.homeScore != null ? (
              <div className="num font-display text-5xl font-black">
                {match.homeScore} <span className="text-primary-foreground/60">:</span> {match.awayScore}
              </div>
            ) : (
              <div className="num font-display text-lg">
                {kickoff.toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })}
              </div>
            )}
          </div>
          <div className="text-center">
            <Flag country={match.awayTeam} size="lg" />
            <div className="mt-2 truncate text-sm font-bold">{awayName}</div>
          </div>
        </div>

        {live && (
          <div className="mt-4 flex gap-2">
            <Button onClick={togglePin} size="sm" className="flex-1 bg-primary-foreground text-primary press">
              <Pin className={`mr-2 h-4 w-4 ${pinned ? 'fill-current' : ''}`} />
              {pinned ? t('unpin') : t('pinLive')}
            </Button>
            <FloatingScore match={match} label={t('floatScore')} />
          </div>
        )}
      </div>

      {groups && groups.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${(selectedGroup ?? groups[0].id) === g.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">{t('placeBet')}</h3>
            <p className="text-xs text-muted-foreground">{t('yourPrediction')}</p>
          </div>
          {existing && !locked && (
            <span className="num rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{existing.home_score}:{existing.away_score}</span>
          )}
        </div>

        {locked ? (
          <div className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t('matchStarted')}</div>
        ) : !gid ? (
          <div className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {lang === 'he' ? 'הצטרף לקבוצה כדי לנחש' : 'Join a group to place a prediction'}
          </div>
        ) : (
          <Button onClick={() => setSheetOpen(true)} size="lg" className="press mt-3 w-full bg-gradient-warm shadow-warm">
            {existing ? (lang === 'he' ? 'ערוך ניחוש' : 'Edit prediction') : t('placeBet')}
          </Button>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t('score365rules')}</p>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={t('yourPrediction')}>
        <div className="flex gap-3">
          <ScoreStepper value={home} onChange={setHome} label={<><Flag country={match.homeTeam} size="sm" /><span className="ms-1 truncate">{homeName}</span></>} />
          <ScoreStepper value={away} onChange={setAway} label={<><Flag country={match.awayTeam} size="sm" /><span className="ms-1 truncate">{awayName}</span></>} />
        </div>
        <Button onClick={saveBet} disabled={saving} size="lg" className="press mt-5 w-full bg-gradient-warm shadow-warm">
          {saving ? t('loading') : t('save')}
        </Button>
      </Sheet>
    </AppShell>
  );
}
