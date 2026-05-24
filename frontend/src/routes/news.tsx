import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type NewsArticle } from '@/lib/api';
import { haptic } from '@/hooks/useHaptic';

export const Route = createFileRoute('/news')({ component: NewsPage });

type SourceKey = 'sport5' | 'maariv';
const SOURCES: Array<{ key: SourceKey; label: string }> = [
  { key: 'sport5', label: 'Sport5' },
  { key: 'maariv', label: 'Maariv' },
];

function NewsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { lang } = useI18n();
  const [source, setSource] = useState<SourceKey>('sport5');

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['news', source],
    queryFn: () => api.news(source),
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!user) return null;

  const articles: NewsArticle[] = data?.articles ?? [];

  return (
    <AppShell title={lang === 'he' ? 'חדשות' : 'News'}>
      {/* Hero */}
      <div className="shine-sweep card-lift mb-4 overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
              <Newspaper className="h-5 w-5 text-primary-foreground wobble" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-black text-primary-foreground">
                {lang === 'he' ? 'חדשות ספורט' : 'Sports News'}
              </h1>
              <p className="truncate text-xs text-primary-foreground/85">
                {lang === 'he' ? 'כותרות מהאתרים הישראליים — תוכן מלא באתר המקור' : 'Israeli headlines — full story on source site'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { haptic('light'); refetch(); }}
            disabled={isRefetching}
            aria-label="refresh"
            className="press ripple grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground backdrop-blur"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'rotate-slow' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted/40 p-1">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => { haptic('light'); setSource(s.key); }}
            className={`ripple rounded-full px-3 py-2 text-sm font-bold transition-all duration-300 ${source === s.key
              ? 'bg-primary text-primary-foreground shadow-warm scale-[1.02]'
              : 'text-muted-foreground'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {data?.stale && (
        <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {lang === 'he' ? 'מציג מטמון — מנסה לרענן…' : 'Showing cached results — refreshing…'}
        </div>
      )}

      {isLoading ? (
        <NewsListSkeleton />
      ) : isError || (!data?.ok && articles.length === 0) || articles.length === 0 ? (
        <NewsError lang={lang as 'he' | 'en'} onRetry={() => refetch()} />
      ) : (
        <ul className="glass overflow-hidden rounded-2xl">
          {articles.map((a, i) => (
            <NewsRow key={a.url + i} article={a} index={i} isLast={i === articles.length - 1} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function NewsRow({ article, index, isLast }: { article: NewsArticle; index: number; isLast: boolean }) {
  return (
    <li
      className={`reveal ${isLast ? '' : 'border-b border-border/40'}`}
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => haptic('light')}
        className="press ripple flex items-start gap-3 px-3 py-3 active:bg-muted/40"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-black text-primary">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">
            {article.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="font-bold">{article.source}</span>
            <span>·</span>
            <span className="truncate" dir="ltr">{cleanHost(article.url)}</span>
          </div>
        </div>
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    </li>
  );
}

function cleanHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function NewsListSkeleton() {
  return (
    <ul className="glass overflow-hidden rounded-2xl">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className={`flex items-start gap-3 px-3 py-3 ${i < 7 ? 'border-b border-border/40' : ''}`}>
          <div className="skeleton h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-11/12 rounded" />
            <div className="skeleton h-3.5 w-7/12 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function NewsError({ lang, onRetry }: { lang: 'he' | 'en'; onRetry: () => void }) {
  return (
    <div className="reveal flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">
        {lang === 'he'
          ? 'לא הצלחנו לטעון חדשות, נסה שוב מאוחר יותר'
          : 'Could not load news, please try again later'}
      </p>
      <button
        onClick={() => { haptic('light'); onRetry(); }}
        className="press ripple mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {lang === 'he' ? 'נסה שוב' : 'Retry'}
      </button>
    </div>
  );
}
