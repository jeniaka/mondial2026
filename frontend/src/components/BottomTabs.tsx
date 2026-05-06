import { Link } from "@tanstack/react-router";
import { Calendar, Trophy, Star, Crown, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomTabs() {
  const { t } = useI18n();
  const tabs: Array<{ to: "/" | "/bets" | "/bonus" | "/leagues" | "/friends"; icon: typeof Calendar; label: string; exact?: boolean }> = [
    { to: "/", icon: Calendar, label: t("matches"), exact: true },
    { to: "/bets", icon: Trophy, label: t("bets") },
    { to: "/bonus", icon: Star, label: t("bonusBets") },
    { to: "/leagues", icon: Crown, label: t("leagues") },
    { to: "/friends", icon: User, label: t("profile") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border/60 bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: !!exact }}
              className="group flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-transform duration-100 active:scale-[0.94]"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
