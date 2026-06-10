import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { api, type MatchPrediction } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  matchId: string;
  homeNameEn: string;
  homeNameHe: string;
  awayNameEn: string;
  awayNameHe: string;
  onUseBet: (home: number, away: number) => void;
}

export function GuessForMe({
  matchId,
  homeNameEn,
  homeNameHe,
  awayNameEn,
  awayNameHe,
  onUseBet,
}: Props) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<MatchPrediction | null>(null);
  const [risk, setRisk]       = useState(3);

  const homeName = lang === 'he' ? homeNameHe : homeNameEn;
  const awayName = lang === 'he' ? awayNameHe : awayNameEn;

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.prediction(matchId);
      if (!result.ok) {
        toast(t('noData'));
        return;
      }
      setData(result);
    } catch {
      toast.error(lang === 'he' ? 'שגיאה בטעינת הניחוש' : 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  const variant = data?.variants?.find((v) => v.risk === risk);
  const homePct = Math.round((data?.home_win_pct ?? 0) * 100);
  const drawPct = Math.round((data?.draw_pct ?? 0) * 100);
  const awayPct = Math.round((data?.away_win_pct ?? 0) * 100);

  return (
    <div className="card-surface mt-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-10 w-10">
            <Wand2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold">{t('guessForMe')}</h3>
            <p className="text-xs text-muted-foreground">{t('guessForMeSub')}</p>
          </div>
        </div>
        {data?.sources_used && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
            {data.sources_used.length} {lang === 'he' ? 'מקורות' : 'sources'}
          </span>
        )}
      </div>

      {!data ? (
        <Button
          onClick={load}
          disabled={loading}
          size="lg"
          variant="outline"
          className="press ripple mt-4 h-12 w-full rounded-2xl border-primary/30 font-display text-base font-bold text-primary"
        >
          {loading ? t('loading') : t('guessBtn')}
        </Button>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Win probability bar */}
          <div className="reveal">
            <div className="flex h-9 overflow-hidden rounded-xl text-[11px] font-bold">
              <div
                className="flex items-center justify-center bg-primary text-primary-foreground transition-all duration-700"
                style={{ width: `${homePct}%` }}
              >
                {homePct > 12 ? `${homePct}%` : ''}
              </div>
              <div
                className="flex items-center justify-center bg-muted text-muted-foreground transition-all duration-700"
                style={{ width: `${drawPct}%` }}
              >
                {drawPct > 12 ? `${drawPct}%` : ''}
              </div>
              <div
                className="flex items-center justify-center bg-accent text-accent-foreground transition-all duration-700"
                style={{ width: `${awayPct}%` }}
              >
                {awayPct > 12 ? `${awayPct}%` : ''}
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />{homeName}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{t('draw')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />{awayName}</span>
            </div>
          </div>

          {/* Risk slider */}
          <div className="reveal rounded-2xl bg-muted/40 p-3" style={{ animationDelay: '60ms' }}>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t('safeLabel')}</span>
              <span key={risk} className="num-flip rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                {lang === 'he' ? variant?.label_he : variant?.label_en}
              </span>
              <span>{t('wildLabel')}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Score result */}
          {variant && (
            <div key={`${variant.home_score}-${variant.away_score}`} className="pop-in rounded-2xl bg-gradient-pitch p-4 text-center text-primary-foreground shadow-warm">
              <div className="num score-display text-5xl">
                {variant.home_score}
                <span className="px-2 font-sans not-italic opacity-50">:</span>
                {variant.away_score}
              </div>
              <p className="mt-2 text-sm text-primary-foreground/85">
                {lang === 'he' ? variant.reason_he : variant.reason_en}
              </p>
            </div>
          )}

          {/* Use this bet */}
          {variant && (
            <Button
              onClick={() => onUseBet(variant.home_score, variant.away_score)}
              size="lg"
              className="press btn-glow ripple shine-sweep h-12 w-full rounded-2xl bg-gradient-warm font-display text-base font-bold shadow-warm"
            >
              {t('useThisBet')}
            </Button>
          )}
        </div>
      )}

      {data && (data.confidence ?? 1) < 0.4 && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t('lowConfidence')}
        </p>
      )}
    </div>
  );
}
