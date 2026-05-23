import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BottomTabs } from "@/components/BottomTabs";
import { FlyingBall } from "@/components/FlyingBall";

export function AppShell({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  const { dir } = useI18n();
  const loc = useLocation();
  return (
    <div dir={dir} className="overflow-x-hidden min-h-screen bg-background">
      <div className="relative mx-auto overflow-x-hidden min-h-screen w-full max-w-[480px] bg-background">
        <FlyingBall />
        <AppHeader title={title} action={action} />
        <main
          key={loc.pathname}
          className="page-enter relative z-10 px-4 pb-28 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
        >
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
