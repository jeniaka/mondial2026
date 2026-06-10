import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Trash2, Star, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Prediction, type Group } from '@/lib/api';
import { getMatches, type Match } from '@/server/matches.functions';
import { AppShell } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { EmptyState, CardSkeleton } from '@/components/States';
import { useCountUp } from '@/hooks/useCountUp';
import { haptic } from '@/hooks/useHaptic';
import { FireStreak } from '@/components/FireStreak';
import { FlipCard } from '@/components/FlipCard';
import { BonusPicksSection } from '@/components/BonusPicksSection';

export const Route = createFileRoute('/bets')({ component: BetsPage });

function BetsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);

  const handleDeleteBet = async (groupId: string, matchId: string) => {
    try {
      await api.deletePrediction(groupId, matchId);
      haptic('medium');
      toast.success(lang === 'he' ? 'ההימור נמחק' : 'Bet deleted');
      qc.invalidateQueries({ queryKey: ['my-predictions'] });
    } catch (e: unknown) {
      const err = e as { message?: string };
      const m = err?.message ?? '';
      if (m === 'match_locked') {
        toast.error(lang === 'he' ? 'המשחק כבר התחיל — לא ניתן למחוק' : 'Match started — cannot delete');
      } else {
        toast.error(lang === 'he' ? 'שגיאה במחיקה' : 'Delete failed');
      }
      haptic('error');
    }
  };

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.groups(),
    enabled: !!user,
  });

  const { data: matchData } = useQuery({
    queryKey: ['matches'],
    queryFn: () => getMatches(),
  });

  const gid = selectedGroup ?? groups?.[0]?.id ?? null;

  const { data: preds, isLoading } = useQuery<Prediction[]>({
    queryKey: ['my-predictions', gid],
    queryFn: () => api.myPredictions(gid!),
    enabled: !!gid,
  });

  const matchMap = new Map<string, Match>(
    (matchData?.matches ?? []).map((m) => [m.id, m])
  );

  const bets = (preds ?? []).filter((p) => p.home_score != null);
  const total = bets.reduce((s, b) => s + (b.points_awarded ?? 0), 0);
  const totalAnim = useCountUp(total, 900);

  // Compute current streak: consecutive correct (pts > 0) from most recent backward
  const sortedDesc = [...bets].sort((a, b) => {
    const am = matchMap.get(a.match_id);
    const bm = matchMap.get(b.match_id);
    return (bm?.utcDate ?? '').localeCompare(am?.utcDate ?? '');
  });
  let currentStreak = 0;
  for (const b of sortedDesc) {
    if ((b.points_awarded ?? 0) > 0) currentStreak++;
    else break;
  }

  if (!user) return null;

  const exactCount = bets.filter((b) => {
    const m = matchMap.get(b.match_id);
    return m?.homeScore != null && m.homeScore === b.home_score && m.awayScore === b.away_score;
  }).length;
  const scoredCount = bets.filter((b) => (b.points_awarded ?? 0) > 0).length;

  return (
    <AppShell title={t('bets')}>
      <div className="hero-banner shine-sweep mb-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/75">{t('points')}</div>
            <div className="num count-up score-display text-[56px] leading-none text-primary-foreground">{totalAnim}</div>
          </div>
          <span className="hero-chip grid h-12 w-12 place-items-center rounded-2xl">
            <Trophy className="h-6 w-6 text-primary-foreground wobble" />
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="hero-chip flex-1 rounded-xl px-3 py-2 text-center text-primary-foreground">
            <span className="num block font-display text-lg font-black">{bets.length}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider opacity-75">{lang === 'he' ? 'ניחושים' : 'Picks'}</span>
          </span>
          <span className="hero-chip flex-1 rounded-xl px-3 py-2 text-center text-primary-foreground">
            <span className="num block font-display text-lg font-black">{scoredCount}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider opacity-75">{lang === 'he' ? 'קלעו' : 'Scored'}</span>
          </span>
          <span className="hero-chip flex-1 rounded-xl px-3 py-2 text-center text-primary-foreground">
            <span className="num block font-display text-lg font-black">{exactCount}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider opacity-75">{lang === 'he' ? 'מדויקים' : 'Exact'}</span>
          </span>
          {currentStreak > 0 && (
            <span className="hero-chip flex-1 rounded-xl px-2 py-2 text-center">
              <FireStreak count={currentStreak} label={lang === 'he' ? 'רצף' : 'streak'} />
            </span>
          )}
        </div>
      </div>

      {groups && groups.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { haptic('light'); setSelectedGroup(g.id); }}
              className={`press ripple shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ${(selectedGroup ?? groups[0].id) === g.id ? 'bg-primary text-primary-foreground scale-105 shadow-warm' : 'bg-secondary text-secondary-foreground'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Bonus picks — collapsible (was a separate tab) */}
      <div className="card-surface mb-5 overflow-hidden">
        <button
          onClick={() => { haptic('light'); setBonusOpen((v) => !v); }}
          aria-expanded={bonusOpen}
          className="press ripple flex w-full items-center justify-between gap-2 px-4 py-4"
        >
          <span className="flex items-center gap-3">
            <span className="icon-tile h-10 w-10">
              <Star className="h-[18px] w-[18px] rotate-slow" />
            </span>
            <span className="text-start">
              <span className="block font-display text-base font-bold">{t('bonusBets')}</span>
              <span className="block text-[11px] text-muted-foreground">
                {lang === 'he' ? 'אלוף, מלך שערים וגמר' : 'Champion, top scorer & final'}
              </span>
            </span>
          </span>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${bonusOpen ? 'rotate-180' : ''}`} />
        </button>
        {bonusOpen && (
          <div className="border-t border-border/60 px-3 pb-4">
            <BonusPicksSection gid={gid} />
          </div>
        )}
      </div>

      {!gid ? (
        <EmptyState
          title={lang === 'he' ? 'הצטרף לקבוצה תחילה' : 'Join a group first'}
          hint={lang === 'he' ? 'עבור ללשונית הקבוצות' : 'Go to the Leagues tab'}
        />
      ) : isLoading ? <CardSkeleton count={4} /> : bets.length === 0 ? (
        <EmptyState
          title={lang === 'he' ? 'עוד אין ניחושים' : 'No predictions yet'}
          hint={lang === 'he' ? 'פתח משחק ונחש את התוצאה' : 'Open a match and predict the score'}
        />
      ) : (
        <div className="grid gap-2">
          {bets.map((b, i) => {
            const m = matchMap.get(b.match_id);
            const homeName = m ? (lang === 'he' ? m.homeTeamHe : m.homeTeam) : b.match_id;
            const awayName = m ? (lang === 'he' ? m.awayTeamHe : m.awayTeam) : '';
            const pts = b.points_awarded ?? 0;
            const exact = m?.homeScore != null && m.homeScore === b.home_score && m.awayScore === b.away_score;
            const dateStr = m?.utcDate ? `${m.utcDate.slice(8,10)}/${m.utcDate.slice(5,7)} ${m.utcDate.slice(11,16)}` : '';

            const front = (
              <div className={`reveal card-lift card-surface flex h-full items-center gap-2 p-3.5 ${pts > 0 ? 'success-halo' : ''}`}>
                <div className="flex flex-1 items-center justify-end gap-1.5 truncate text-sm font-bold">
                  <span className="truncate">{homeName}</span>
                  {m && <Flag country={m.homeTeam} size="sm" />}
                </div>
                <div className="grid min-w-[80px] place-items-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{lang === 'he' ? 'ניחוש' : 'Pick'}</div>
                  <div className="num score-display text-xl">{b.home_score}<span className="px-0.5 font-sans not-italic text-muted-foreground">:</span>{b.away_score}</div>
                  {m?.homeScore != null && (
                    <div className="num text-[10px] font-semibold text-muted-foreground">{lang === 'he' ? 'סופי' : 'Final'} {m.homeScore}:{m.awayScore}</div>
                  )}
                </div>
                <div className="flex flex-1 items-center gap-1.5 truncate text-sm font-bold">
                  {m && <Flag country={m.awayTeam} size="sm" />}
                  <span className="truncate">{awayName}</span>
                </div>
                <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${exact ? 'bg-accent text-accent-foreground' : pts > 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  +{pts}
                </div>
              </div>
            );

            const matchStarted = m
              ? (m.status !== 'SCHEDULED' && m.status !== 'TIMED') || new Date(m.utcDate).getTime() <= Date.now()
              : true;

            const back = (
              <div className="reveal flex h-full flex-col justify-center gap-1 rounded-3xl border border-primary/40 bg-gradient-card p-3 text-xs shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-primary">{exact ? '🎯 ' + (lang === 'he' ? 'מדויק!' : 'EXACT!') : (lang === 'he' ? 'פרטי הימור' : 'Bet Detail')}</span>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                </div>
                <div className="flex justify-between"><span>{lang === 'he' ? 'הניחוש שלך' : 'Your pick'}</span><span className="num font-bold">{b.home_score}:{b.away_score}</span></div>
                {m?.homeScore != null && <div className="flex justify-between"><span>{lang === 'he' ? 'תוצאה סופית' : 'Final score'}</span><span className="num font-bold">{m.homeScore}:{m.awayScore}</span></div>}
                <div className="flex justify-between"><span>{lang === 'he' ? 'נקודות' : 'Points'}</span><span className={`num font-black ${pts > 0 ? 'text-success' : 'text-muted-foreground'}`}>+{pts}</span></div>

                {!matchStarted && gid && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); haptic('light'); }}
                        className="press ripple mt-1 inline-flex items-center justify-center gap-1.5 self-end rounded-full bg-destructive/15 px-3 py-1 text-[10px] font-bold text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        {lang === 'he' ? 'מחק הימור' : 'Delete bet'}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{lang === 'he' ? 'מחיקת הימור' : 'Delete bet'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {lang === 'he'
                            ? `${homeName} ${b.home_score}:${b.away_score} ${awayName} — לא ניתן לבטל את המחיקה.`
                            : `${homeName} ${b.home_score}:${b.away_score} ${awayName} — this cannot be undone.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{lang === 'he' ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteBet(gid, b.match_id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {lang === 'he' ? 'מחק' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );

            return (
              <div key={b.id} style={{ animationDelay: `${i * 55}ms` }} className="reveal">
                <FlipCard front={front} back={back} minHeight={72} />
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
