import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

export const Route = createFileRoute('/news')({ component: NewsPage });

function NewsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { lang } = useI18n();

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);
  if (!user) return null;

  return (
    <AppShell title={lang === 'he' ? 'חדשות' : 'News'}>
      <div className="shine-sweep card-lift mb-4 overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <Newspaper className="h-5 w-5 text-primary-foreground" />
          </span>
          <div>
            <h1 className="font-display text-xl font-black text-primary-foreground">
              {lang === 'he' ? 'חדשות' : 'News'}
            </h1>
            <p className="text-xs text-primary-foreground/85">
              {lang === 'he' ? 'בקרוב…' : 'Coming soon…'}
            </p>
          </div>
        </div>
      </div>

      <div className="reveal flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
        <Newspaper className="h-10 w-10 text-muted-foreground wobble" />
        <p className="max-w-xs text-sm text-muted-foreground">
          {lang === 'he'
            ? 'אזור החדשות יתאכלס בקרוב.'
            : 'The news feed will live here soon.'}
        </p>
      </div>
    </AppShell>
  );
}
