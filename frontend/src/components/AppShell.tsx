import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BottomTabs } from "@/components/BottomTabs";
import { FlyingBall } from "@/components/FlyingBall";
import { useSwipe } from "@/hooks/useSwipe";
import { haptic } from "@/hooks/useHaptic";

const TAB_ORDER = ["/", "/bets", "/bonus", "/leagues", "/friends"] as const;
type TabPath = (typeof TAB_ORDER)[number];

function topLevelIndex(pathname: string): number {
  if (pathname === "/") return 0;
  for (let i = 1; i < TAB_ORDER.length; i++) {
    if (pathname.startsWith(TAB_ORDER[i])) return i;
  }
  return -1;
}

export function AppShell({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  const { dir } = useI18n();
  const loc = useLocation();
  const nav = useNavigate();
  const prevIdxRef = useRef<number>(topLevelIndex(loc.pathname));
  const [direction, setDirection] = useState<"left" | "right" | "up">("up");

  // Detect direction of navigation when route changes (used for slide animation)
  useEffect(() => {
    const idx = topLevelIndex(loc.pathname);
    const prev = prevIdxRef.current;
    if (idx >= 0 && prev >= 0 && idx !== prev) {
      setDirection(idx > prev ? "left" : "right");
    } else {
      setDirection("up");
    }
    prevIdxRef.current = idx;
  }, [loc.pathname]);

  const swipeRef = useSwipe<HTMLElement>({
    onLeft: () => {
      const idx = topLevelIndex(loc.pathname);
      if (idx < 0 || idx >= TAB_ORDER.length - 1) return;
      const next = TAB_ORDER[idx + 1] as TabPath;
      haptic("light");
      nav({ to: next });
    },
    onRight: () => {
      const idx = topLevelIndex(loc.pathname);
      if (idx <= 0) return;
      const prev = TAB_ORDER[idx - 1] as TabPath;
      haptic("light");
      nav({ to: prev });
    },
    threshold: 70,
    ratio: 1.8,
  });

  const animClass =
    direction === "left" ? "page-slide-left" :
    direction === "right" ? "page-slide-right" :
    "page-enter";

  return (
    <div dir={dir} className="overflow-x-clip min-h-screen bg-background">
      <div className="relative mx-auto overflow-x-clip min-h-screen w-full max-w-[480px] bg-background">
        <FlyingBall />
        <AppHeader title={title} action={action} />
        <main
          ref={swipeRef as React.RefObject<HTMLElement>}
          key={loc.pathname}
          className={`${animClass} pan-y relative z-10 px-4 pb-28 pt-3`}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
        >
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
