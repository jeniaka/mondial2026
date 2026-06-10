import { Trophy } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="reveal rounded-[1.75rem] border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="icon-tile-soft float-soft mx-auto mb-4 h-16 w-16" style={{ borderRadius: '1.25rem' }}>
        {icon ?? <Trophy className="h-7 w-7" />}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-20" />
      ))}
    </div>
  );
}
