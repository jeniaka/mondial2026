import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Group } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { BonusPicksSection } from '@/components/BonusPicksSection';

/**
 * Standalone /bonus page — kept for backwards-compat (bookmarks, deep links).
 * The primary entry is now the collapsible section in /bets ("My Bets").
 */
export const Route = createFileRoute('/bonus')({ component: BonusPage });

function BonusPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.groups(),
    enabled: !!user,
  });

  const gid = selectedGroup ?? groups?.[0]?.id ?? null;

  if (!user) return null;

  return (
    <AppShell title={t('bonusBets')}>
      {groups && groups.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`press ripple shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 ${(selectedGroup ?? groups[0].id) === g.id ? 'bg-primary text-primary-foreground scale-105 shadow-warm' : 'bg-secondary text-secondary-foreground'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
      <BonusPicksSection gid={gid} />
    </AppShell>
  );
}
