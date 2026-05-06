import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { AppHeader } from "@/components/AppHeader";
import { BottomTabs } from "@/components/BottomTabs";

export function AppShell({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  const { dir } = useI18n();
  return (
    <div dir={dir} className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background">
        <AppHeader title={title} action={action} />
        <main
          className="px-4 pb-28 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
        >
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
