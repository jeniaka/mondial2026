import { Trophy, Flame, Target, Crown, Zap, Star, Award, Medal, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type AchievementDef = {
  id: string;
  icon: ReactNode;
  label: { he: string; en: string };
  desc: { he: string; en: string };
  /** function that returns true if unlocked, given user stats */
  check: (s: AchievementStats) => boolean;
};

export type AchievementStats = {
  total_predictions: number;
  exact_predictions: number;
  best_rank: number | null;
  current_streak: number;
  total_points: number;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_pick",    icon: <Target className="h-5 w-5" />,    label: { he: "ניחוש ראשון", en: "First Pick" },     desc: { he: "ביצעת את הניחוש הראשון", en: "Made your first prediction" }, check: (s) => s.total_predictions >= 1 },
  { id: "perfect_pick",  icon: <Sparkles className="h-5 w-5" />,  label: { he: "פיקוח מדויק", en: "Perfect Pick" },    desc: { he: "ניחוש מדויק ראשון", en: "First exact prediction" }, check: (s) => s.exact_predictions >= 1 },
  { id: "streak_3",      icon: <Flame className="h-5 w-5" />,     label: { he: "אש x3", en: "On Fire" },               desc: { he: "3 ניחושים נכונים ברצף", en: "3 correct in a row" }, check: (s) => s.current_streak >= 3 },
  { id: "streak_5",      icon: <Zap className="h-5 w-5" />,       label: { he: "ברק", en: "Lightning" },               desc: { he: "5 ניחושים נכונים ברצף", en: "5 correct in a row" }, check: (s) => s.current_streak >= 5 },
  { id: "ten_picks",     icon: <Award className="h-5 w-5" />,     label: { he: "טוטו פעיל", en: "Active Predictor" },  desc: { he: "10 ניחושים בסך הכל", en: "10 total predictions" }, check: (s) => s.total_predictions >= 10 },
  { id: "century",       icon: <Star className="h-5 w-5" />,      label: { he: "מאה נקודות", en: "Century" },          desc: { he: "100 נקודות צבורות", en: "100 points earned" }, check: (s) => s.total_points >= 100 },
  { id: "podium",        icon: <Medal className="h-5 w-5" />,     label: { he: "פודיום", en: "Podium" },               desc: { he: "מקום 1-3 בליגה", en: "Reached top 3 in a league" }, check: (s) => (s.best_rank ?? 99) <= 3 },
  { id: "crown",         icon: <Crown className="h-5 w-5" />,     label: { he: "כתר", en: "Crown Holder" },            desc: { he: "מקום 1 בליגה", en: "Held #1 in a league" }, check: (s) => s.best_rank === 1 },
  { id: "champion",      icon: <Trophy className="h-5 w-5" />,    label: { he: "אלוף", en: "Champion" },               desc: { he: "1000 נקודות", en: "1000 points" }, check: (s) => s.total_points >= 1000 },
];

export function AchievementWall({ stats, lang }: { stats: AchievementStats; lang: "he" | "en" }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACHIEVEMENTS.map((a, i) => {
        const unlocked = a.check(stats);
        return (
          <div
            key={a.id}
            className={`reveal relative flex flex-col items-center gap-1 rounded-2xl border border-border p-3 text-center ${unlocked ? "bg-gradient-card shadow-soft badge-unlock" : "bg-card badge-locked"}`}
            style={{ animationDelay: `${i * 50}ms` }}
            title={lang === "he" ? a.desc.he : a.desc.en}
          >
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${unlocked ? "bg-gradient-warm text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {a.icon}
            </span>
            <span className="text-[10px] font-bold leading-tight">
              {lang === "he" ? a.label.he : a.label.en}
            </span>
          </div>
        );
      })}
    </div>
  );
}
