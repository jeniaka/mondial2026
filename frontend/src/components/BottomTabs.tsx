import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, Trophy, Crown, User, Newspaper } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/hooks/useHaptic";

type TabPath = "/" | "/bets" | "/leagues" | "/news" | "/friends";

export function BottomTabs() {
  const { t, lang } = useI18n();
  const loc = useLocation();
  const tabs: Array<{ to: TabPath; icon: typeof Calendar; label: string; exact?: boolean }> = [
    { to: "/",        icon: Calendar,  label: t("matches"), exact: true },
    { to: "/bets",    icon: Trophy,    label: t("bets") },
    { to: "/leagues", icon: Crown,     label: t("leagues") },
    { to: "/news",    icon: Newspaper, label: lang === "he" ? "חדשות" : "News" },
    { to: "/friends", icon: User,      label: t("profile") },
  ];

  const isActive = (to: TabPath, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname.startsWith(to);

  return (
    <nav className="dock" aria-label="Main navigation">
      <ul className="flex items-stretch justify-around px-1.5 py-1">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);
          return (
            <li key={to} className="relative flex-1">
              <Link
                to={to}
                activeOptions={{ exact: !!exact }}
                onClick={() => !active && haptic("light")}
                className="dock-item"
                data-active={active}
              >
                <span className="dock-bubble">
                  <Icon
                    key={active ? `${to}-on` : `${to}-off`}
                    className={`h-[21px] w-[21px] ${active ? "tab-icon-bounce" : ""}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </span>
                <span className="truncate leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
