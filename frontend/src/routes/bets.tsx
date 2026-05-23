import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Prediction, type Group } from '@/lib/api';
import { getMatches, type Match } from '@/server/matches.functions';
import { AppShell } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { EmptyState, CardSkeleton } from '@/components/States';
import { Trophy } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { haptic } from '@/hooks/useHaptic';
import { FireStreak } from '@/components/FireStreak';
import { TierBadge } from '@/components/TierBadge';
import { FlipCard } from '@/components/FlipCard';

export const Route = createFileRoute('/bets')({ component: BetsPage });

function BetsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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

  return (
    <AppShell title={t('bets')}>
      <div className="shine-sweep card-lift mb-4 flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">{t('points')}</div>
          <div className="num count-up font-display text-5xl font-black text-primary-foreground">{totalAnim}</div>
          {currentStreak > 0 && (
            <div className="mt-2">
              <FireStreak count={currentStreak} label={lang === 'he' ? 'רצף' : 'streak'} />
            </div>
          )}
        </div>
        <Trophy className="h-12 w-12 text-primary-foreground/60 wobble" />
      </div>

      <div className="mb-3">
        <TierBadge points={total} lang={lang as 'he' | 'en'} />
      </div>

      {groups && groups.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { haptic('light'); setSelectedGroup(g.id); }}
              className={`press ripple shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 ${(selectedGroup ?? groups[0].id) === g.id ? 'bg-primary text-primary-foreground scale-105 shadow-warm' : 'bg-secondary text-secondary-foreground'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

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
              <div className={`reveal card-lift flex h-full items-center gap-2 rounded-2xl border border-border bg-card p-3 ${pts > 0 ? 'success-halo' : ''}`}>
                <div className="flex flex-1 items-center justify-end gap-1.5 truncate text-sm font-semibold">
                  <span className="truncate">{homeName}</span>
                  {m && <Flag country={m.homeTeam} size="sm" />}
                </div>
                <div className="grid min-w-[80px] place-items-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{lang === 'he' ? 'ניחוש' : 'Pick'}</div>
                  <div className="num font-display text-lg font-bold">{b.home_score} : {b.away_score}</div>
                  {m?.homeScore != null && (
                    <div className="num text-[10px] text-muted-foreground">{lang === 'he' ? 'סופי' : 'Final'} {m.homeScore}:{m.awayScore}</div>
                  )}
                </div>
                <div className="flex flex-1 items-center gap-1.5 truncate text-sm font-semibold">
                  {m && <Flag country={m.awayTeam} size="sm" />}
                  <span className="truncate">{awayName}</span>
                </div>
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${pts > 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  +{pts}
                </div>
              </div>
            );

            const back = (
              <div className="reveal flex h-full flex-col justify-center gap-1 rounded-2xl border border-primary/40 bg-gradient-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-primary">{exact ? '🎯 ' + (lang === 'he' ? 'מדויק!' : 'EXACT!') : (lang === 'he' ? 'פרטי הימור' : 'Bet Detail')}</span>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                </div>
                <div className="flex justify-between"><span>{lang === 'he' ? 'הניחוש שלך' : 'Your pick'}</span><span className="num font-bold">{b.home_score}:{b.away_score}</span></div>
                {m?.homeScore != null && <div className="flex justify-between"><span>{lang === 'he' ? 'תוצאה סופית' : 'Final score'}</span><span className="num font-bold">{m.homeScore}:{m.awayScore}</span></div>}
                <div className="flex justify-between"><span>{lang === 'he' ? 'נקודות' : 'Points'}</span><span className={`num font-black ${pts > 0 ? 'text-success' : 'text-muted-foreground'}`}>+{pts}</span></div>
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
