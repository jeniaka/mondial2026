import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Group } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Flag } from '@/components/Flag';
import { ScoreStepper } from '@/components/Sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BurstConfetti } from '@/components/BurstConfetti';
import { haptic } from '@/hooks/useHaptic';

export const Route = createFileRoute('/bonus')({ component: BonusPage });

const wc26Nations = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Cape Verde',
  'Colombia', "Côte d'Ivoire", 'Croatia', 'Ecuador', 'Egypt', 'England', 'France',
  'Germany', 'Ghana', 'Iran', 'Italy', 'Japan', 'Jordan', 'South Korea', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Paraguay', 'Portugal',
  'Qatar', 'Saudi Arabia', 'Scotland', 'Senegal', 'Serbia', 'Spain', 'Sweden',
  'Switzerland', 'Tunisia', 'Türkiye', 'Ukraine', 'United States', 'Uruguay',
  'Uzbekistan', 'Wales',
].sort();

function BonusPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [winner, setWinner] = useState('');
  const [player, setPlayer] = useState('');
  const [finalHome, setFinalHome] = useState('');
  const [finalAway, setFinalAway] = useState('');
  const [finalHomeScore, setFinalHomeScore] = useState(0);
  const [finalAwayScore, setFinalAwayScore] = useState(0);
  const [bonusPts, setBonusPts] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveBurst, setSaveBurst] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.groups(),
    enabled: !!user,
  });

  const gid = selectedGroup ?? groups?.[0]?.id ?? null;

  const { data: betData } = useQuery({
    queryKey: ['tournament-bet', gid],
    queryFn: () => api.tournamentBetGet(gid!),
    enabled: !!gid,
  });

  const locked = betData?.locked ?? false;
  const lockTs = betData?.lock_ts ?? '';

  useEffect(() => {
    const b = betData?.bet as Record<string, unknown> | null;
    if (!b) return;
    setWinner((b.winner as string) ?? '');
    setPlayer((b.top_scorer as string) ?? '');
    setFinalHome((b.finalist_1 as string) ?? '');
    setFinalAway((b.finalist_2 as string) ?? '');
    setFinalHomeScore((b.final_score_1 as number) ?? 0);
    setFinalAwayScore((b.final_score_2 as number) ?? 0);
    setBonusPts((b.bonus_pts as number) ?? 0);
  }, [betData]);

  const save = async () => {
    if (!gid) { toast.error(lang === 'he' ? 'הצטרף לקבוצה תחילה' : 'Join a group first'); return; }
    if (!winner || !player.trim() || !finalHome || !finalAway) {
      toast.error(lang === 'he' ? 'מלא את כל הניחושים' : 'Fill in all picks');
      return;
    }
    setSaving(true);
    try {
      await api.tournamentBetSave(gid, {
        winner: winner,
        top_scorer: player.trim(),
        finalist_1: finalHome,
        finalist_2: finalAway,
        final_score_1: finalHomeScore,
        final_score_2: finalAwayScore,
      });
      toast.success(t('saved'));
      setSaveBurst((n) => n + 1);
      haptic('success');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title={t('bonusBets')}>
      <div className="shine-sweep card-lift mb-4 overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <Star className="h-5 w-5 text-primary-foreground rotate-slow" />
          </span>
          <div>
            <h1 className="font-display text-xl font-black text-primary-foreground">{t('bonusBets')}</h1>
            <p className="text-xs text-primary-foreground/85">{t('bonusIntro')}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur">
          {t('bonusRules')}
        </div>
      </div>

      {groups && groups.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

      {locked && (
        <div className="shake mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {t('bonusLocked')} {lockTs && `(${new Date(lockTs).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')})`}
        </div>
      )}

      <BonusSection title={t('pickChampion')} pts={15} icon={<Trophy className="h-4 w-4" />}>
        <CountrySelect value={winner} onChange={setWinner} disabled={locked} options={wc26Nations} />
      </BonusSection>

      <BonusSection title={t('pickTopPlayer')} pts={10} icon={<span>⭐</span>}>
        <Input
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          disabled={locked}
          placeholder="Lionel Messi"
          className="h-12 text-base"
        />
      </BonusSection>

      <BonusSection title={t('pickFinalScore')} pts={10} icon={<span>🏆</span>}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">{t('finalsTeam')} 1</Label>
            <CountrySelect value={finalHome} onChange={setFinalHome} disabled={locked} options={wc26Nations} />
          </div>
          <div>
            <Label className="text-[10px]">{t('finalsTeam')} 2</Label>
            <CountrySelect value={finalAway} onChange={setFinalAway} disabled={locked} options={wc26Nations} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className={finalHome && finalAway ? 'flag-clash-l flex-1' : 'flex-1'}>
            <ScoreStepper
              value={finalHomeScore}
              onChange={(n) => { if (!locked) { setFinalHomeScore(n); haptic('light'); } }}
              label={finalHome ? <Flag country={finalHome} size="sm" /> : <span className="text-xs text-muted-foreground">{t('finalsTeam')} 1</span>}
            />
          </div>
          <div className={finalHome && finalAway ? 'flag-clash-r flex-1' : 'flex-1'}>
            <ScoreStepper
              value={finalAwayScore}
              onChange={(n) => { if (!locked) { setFinalAwayScore(n); haptic('light'); } }}
              label={finalAway ? <Flag country={finalAway} size="sm" /> : <span className="text-xs text-muted-foreground">{t('finalsTeam')} 2</span>}
            />
          </div>
        </div>
      </BonusSection>

      <div className="sticky bottom-24 mt-4">
        <div className="relative">
          {saveBurst > 0 && <BurstConfetti trigger={saveBurst} count={32} />}
          <Button onClick={save} disabled={locked || saving || !gid} size="lg" className="press btn-glow ripple w-full bg-gradient-warm shadow-warm">
            {saving ? t('loading') : t('saveBonus')}
          </Button>
        </div>
        {bonusPts > 0 && (
          <div className="success-halo mt-2 inline-block w-full rounded-full text-center text-xs font-bold text-success">+{bonusPts} {t('points')}</div>
        )}
      </div>
    </AppShell>
  );
}

function BonusSection({ title, pts, icon, children }: { title: string; pts: number; icon: React.ReactNode; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="mb-4 rounded-3xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
        <span className="text-primary">{icon}</span> {title}
        <span className="ms-auto rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{pts} {t('points')}</span>
      </h2>
      {children}
    </section>
  );
}

function CountrySelect({ value, onChange, disabled, options }: { value: string; onChange: (v: string) => void; disabled?: boolean; options: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {value && <Flag country={value} size="sm" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="">—</option>
        {options.map((c) => (<option key={c} value={c}>{c}</option>))}
      </select>
    </div>
  );
}
