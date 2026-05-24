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

type SourceKey = 'one' | 'sport5';
const SOURCES: Array<{ key: SourceKey; label: string }> = [
  { key: 'one',    label: 'ONE' },
  { key: 'sport5', label: 'Sport5' },
];

function NewsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { lang } = useI18n();
  const [source, setSource] = useState<SourceKey>('one');

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['news', source],
    queryFn: () => api.news(source),
    enabled: !!user,
    staleTime: 5 * 60_000,        // 5 min — cards don't change that fast
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
                {lang === 'he' ? 'מהאתרים המובילים בישראל' : 'From the top Israeli sports sites'}
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

      {/* Status / Grid */}
      {isLoading ? (
        <NewsGridSkeleton />
      ) : isError || (!data?.ok && articles.length === 0) ? (
        <NewsError lang={lang as 'he' | 'en'} onRetry={() => refetch()} />
      ) : articles.length === 0 ? (
        <NewsError lang={lang as 'he' | 'en'} onRetry={() => refetch()} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {articles.map((a, i) => <NewsCard key={a.url} article={a} index={i} />)}
        </ul>
      )}
    </AppShell>
  );
}

function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <li
      className="reveal card-lift overflow-hidden rounded-2xl border border-border bg-card"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => haptic('light')}
        className="press flex h-full flex-col"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={article.image}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              const t = e.currentTarget;
              t.style.display = 'none';
            }}
          />
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {article.source}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-3 font-display text-sm font-bold leading-snug">
            {article.title}
          </h3>
          {article.snippet && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {article.snippet}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
            <span className="font-semibold">{article.source}</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      </a>
    </li>
  );
}

function NewsGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="skeleton aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-4 w-3/5 rounded" />
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
