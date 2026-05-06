import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/login')({ component: LoginPage });

function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: '/' }); }, [user, loading, nav]);

  const signIn = () => {
    setBusy(true);
    window.location.href = '/auth/google/start';
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-gradient-warm opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-gradient-ember opacity-30 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'he' : 'en')}>
          {lang === 'en' ? 'עברית' : 'English'}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-warm shadow-warm">
            <Trophy className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight">
            <span className="text-gradient-warm">{t('appName')}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-soft">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{t('signInSub')}</span>
          </div>
          <Button
            onClick={signIn}
            disabled={busy}
            size="lg"
            className="w-full gap-3 bg-foreground text-background hover:bg-foreground/90"
          >
            <GoogleIcon />
            {t('signInGoogle')}
          </Button>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t('score365rules')}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
