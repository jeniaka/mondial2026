import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { api, type Group } from '@/lib/api';
import { Flag } from '@/components/Flag';
import { ScoreStepper } from '@/components/Sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BurstConfetti } from '@/components/BurstConfetti';
import { haptic } from '@/hooks/useHaptic';
import { FlagCarousel } from '@/components/FlagCarousel';
import { CountdownTimer } from '@/components/CountdownTimer';

const wc26Nations = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Cape Verde',
  'Colombia', "Côte d'Ivoire", 'Croatia', 'Ecuador', 'Egypt', 'England', 'France',
  'Germany', 'Ghana', 'Iran', 'Italy', 'Japan', 'Jordan', 'South Korea', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Paraguay', 'Portugal',
  'Qatar', 'Saudi Arabia', 'Scotland', 'Senegal', 'Serbia', 'Spain', 'Sweden',
  'Switzerland', 'Tunisia', 'Türkiye', 'Ukraine', 'United States', 'Uruguay',
  'Uzbekistan', 'Wales',
].sort();

/**
 * Bonus picks form — extracted from the old /bonus route so it can render
 * inline inside the My Bets tab via a collapsible.
 *
 * Takes `gid` from caller (the selected league in My Bets).
 */
export function BonusPicksSection({ gid }: { gid: string | null }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [winner, setWinner] = useState('');
  const [player, setPlayer] = useState('');
  const [finalHome, setFinalHome] = useState('');
  const [finalAway, setFinalAway] = useState('');
  const [finalHomeScore, setFinalHomeScore] = useState(0);
  const [finalAwayScore, setFinalAwayScore] = useState(0);
  const [bonusPts, setBonusPts] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveBurst, setSaveBurst] = useState(0);

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
      haptic('error');
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
      qc.invalidateQueries({ queryKey: ['tournament-bet', gid] });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Hero card */}
      <div className="shine-sweep mb-2 overflow-hidden rounded-2xl bg-gradient-warm p-4 shadow-warm">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <Star className="h-4 w-4 text-primary-foreground rotate-slow" />
          </span>
          <div>
            <p className="text-xs text-primary-foreground/85">{t('bonusIntro')}</p>
          </div>
        </div>
        <div className="mt-2 inline-flex rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur">
          {t('bonusRules')}
        </div>
        {lockTs && !locked && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary-foreground/15 px-3 py-2 backdrop-blur">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
              {lang === 'he' ? 'נעילה בעוד' : 'Locks in'}
            </span>
            <div className="text-primary-foreground">
              <CountdownTimer target={lockTs} lang={lang as 'he' | 'en'} compact />
            </div>
          </div>
        )}
      </div>

      {locked && (
        <div className="shake rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {t('bonusLocked')} {lockTs && `(${new Date(lockTs).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')})`}
        </div>
      )}

      <BonusSubSection title={t('pickChampion')} pts={15} icon={<Trophy className="h-4 w-4" />}>
        <FlagCarousel options={wc26Nations} value={winner} onChange={setWinner} disabled={locked} />
      </BonusSubSection>

      <BonusSubSection title={t('pickTopPlayer')} pts={10} icon={<span>👟</span>}>
        <Input
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          disabled={locked}
          placeholder={lang === 'he' ? 'הרי קיין · אמבפה · הולנד...' : 'Harry Kane · Mbappé · Haaland...'}
          className="h-12 text-base"
        />
      </BonusSubSection>

      <BonusSubSection title={t('pickFinalScore')} pts={10} icon={<span>🏆</span>}>
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
      </BonusSubSection>

      <div className="relative">
        {saveBurst > 0 && <BurstConfetti trigger={saveBurst} count={32} />}
        <Button onClick={save} disabled={locked || saving || !gid} size="lg" className="press btn-glow ripple w-full bg-gradient-warm shadow-warm">
          {saving ? t('loading') : t('saveBonus')}
        </Button>
      </div>
      {bonusPts > 0 && (
        <div className="success-halo inline-block w-full rounded-full text-center text-xs font-bold text-success">+{bonusPts} {t('points')}</div>
      )}
    </div>
  );
}

function BonusSubSection({ title, pts, icon, children }: { title: string; pts: number; icon: React.ReactNode; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-sm font-bold">
        <span className="text-primary">{icon}</span> {title}
        <span className="ms-auto rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{pts} {t('points')}</span>
      </h3>
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
