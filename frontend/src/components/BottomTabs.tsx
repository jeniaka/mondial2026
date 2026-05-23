import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, Trophy, Star, Crown, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/hooks/useHaptic";

type TabPath = "/" | "/bets" | "/bonus" | "/leagues" | "/friends";

export function BottomTabs() {
  const { t } = useI18n();
  const loc = useLocation();
  const tabs: Array<{ to: TabPath; icon: typeof Calendar; label: string; exact?: boolean }> = [
    { to: "/", icon: Calendar, label: t("matches"), exact: true },
    { to: "/bets", icon: Trophy, label: t("bets") },
    { to: "/bonus", icon: Star, label: t("bonusBets") },
    { to: "/leagues", icon: Crown, label: t("leagues") },
    { to: "/friends", icon: User, label: t("profile") },
  ];

  const isActive = (to: TabPath, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-[480px] border-t border-border/60 bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);
          return (
            <li key={to} className="relative flex-1">
              <Link
                to={to}
                activeOptions={{ exact: !!exact }}
                onClick={() => !active && haptic("light")}
                className={`group ripple relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-200 active:scale-[0.94] ${active ? "text-primary tab-active-ring" : "text-muted-foreground"}`}
              >
                <Icon
                  key={active ? `${to}-on` : `${to}-off`}
                  className={`h-5 w-5 transition-transform duration-200 ${active ? "tab-icon-bounce" : ""}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="truncate leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
