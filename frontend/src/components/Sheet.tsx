import { useState, type ReactNode } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export function Sheet({
  open, onOpenChange, title, children,
}: { open: boolean; onOpenChange: (o: boolean) => void; title?: string; children: ReactNode }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[480px]">
        {title && (
          <DrawerHeader className="text-center">
            <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
          </DrawerHeader>
        )}
        <div className="px-4 pb-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ScoreStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: ReactNode }) {
  return (
    <div className="card-surface flex flex-1 min-w-0 flex-col items-center gap-3 p-3">
      <div className="flex h-10 items-center justify-center text-sm font-bold text-center w-full truncate">{label}</div>
      <div className="flex w-full items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="press ripple grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground active:bg-muted"
          aria-label="-"
        >−</button>
        <div key={value} className="num score-pop grid h-16 flex-1 min-w-0 place-items-center rounded-2xl bg-gradient-warm score-display text-4xl text-primary-foreground shadow-warm">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="press ripple grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground active:bg-muted"
          aria-label="+"
        >+</button>
      </div>
    </div>
  );
}

export function useStepper(initial = 0) {
  const [v, setV] = useState(initial);
  return [v, setV] as const;
}
