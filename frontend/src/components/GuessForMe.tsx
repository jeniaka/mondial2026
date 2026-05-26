import { useState } from 'react';
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

  return (
    <div className="mt-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">{t('guessForMe')}</h3>
          <p className="text-xs text-muted-foreground">{t('guessForMeSub')}</p>
        </div>
        {data?.sources_used && (
          <span className="text-xs text-muted-foreground">
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
          className="press mt-3 w-full"
        >
          {loading ? t('loading') : t('guessBtn')}
        </Button>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Win probability bar */}
          <div>
            <div className="flex overflow-hidden rounded-xl text-[11px] font-bold">
              <div
                className="flex items-center justify-center bg-primary/80 py-2 text-primary-foreground"
                style={{ width: `${Math.round((data.home_win_pct ?? 0) * 100)}%` }}
              >
                {Math.round((data.home_win_pct ?? 0) * 100)}%
              </div>
              <div
                className="flex items-center justify-center bg-muted py-2 text-muted-foreground"
                style={{ width: `${Math.round((data.draw_pct ?? 0) * 100)}%` }}
              >
                {Math.round((data.draw_pct ?? 0) * 100)}%
              </div>
              <div
                className="flex items-center justify-center bg-secondary py-2 text-secondary-foreground"
                style={{ width: `${Math.round((data.away_win_pct ?? 0) * 100)}%` }}
              >
                {Math.round((data.away_win_pct ?? 0) * 100)}%
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{homeName}</span>
              <span>{t('draw')}</span>
              <span>{awayName}</span>
            </div>
          </div>

          {/* Risk slider */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t('safeLabel')}</span>
              <span className="font-bold text-foreground">
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
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="num font-display text-5xl font-black">
                {variant.home_score}
                <span className="px-2 text-muted-foreground">:</span>
                {variant.away_score}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'he' ? variant.reason_he : variant.reason_en}
              </p>
            </div>
          )}

          {/* Use this bet */}
          {variant && (
            <Button
              onClick={() => onUseBet(variant.home_score, variant.away_score)}
              size="lg"
              className="press btn-glow ripple w-full bg-gradient-warm shadow-warm"
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
