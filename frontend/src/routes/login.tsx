import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { haptic } from '@/hooks/useHaptic';

export const Route = createFileRoute('/login')({ component: LoginPage });

type Mode = 'signin' | 'register';

function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { if (!loading && user) nav({ to: '/' }); }, [user, loading, nav]);

  const signInGoogle = () => {
    haptic('light');
    setBusy(true);
    window.location.href = '/auth/google/start';
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      toast.error(lang === 'he' ? 'מלא את כל השדות' : 'Fill all fields');
      haptic('error');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      toast.error(lang === 'he' ? 'הזן שם' : 'Enter your name');
      haptic('error');
      return;
    }
    if (password.length < 8) {
      toast.error(lang === 'he' ? 'סיסמה צריכה להיות לפחות 8 תווים' : 'Password must be at least 8 characters');
      haptic('error');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        await api.register({ name: name.trim(), email: emailTrim, password });
      } else {
        await api.login({ email: emailTrim, password });
      }
      haptic('success');
      // Force a hard reload so /auth/me is fetched fresh and AuthCtx picks up cookie.
      // If there's a pending invite (from /invite/<token> visited before login), go there.
      const pending = (typeof sessionStorage !== 'undefined')
        ? sessionStorage.getItem('pending_invite')
        : null;
      window.location.href = pending ? `/invite/${pending}` : '/';
    } catch (err: unknown) {
      const e = err as { message?: string };
      const m = e?.message ?? '';
      const msg = errorLabel(m, lang, mode);
      toast.error(msg);
      haptic('error');
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-gradient-warm opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-gradient-ember opacity-30 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="sm" onClick={() => { haptic('light'); setLang(lang === 'en' ? 'he' : 'en'); }}>
          {lang === 'en' ? 'עברית' : 'English'}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-warm shadow-warm shine-sweep">
            <Trophy className="h-10 w-10 text-primary-foreground wobble" />
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight">
            <span className="text-gradient-warm">{t('appName')}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{t('tagline')}</p>
        </div>

        <div className="glass rounded-3xl p-6 shadow-soft">
          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-muted/40 p-1">
            <button
              onClick={() => { haptic('light'); setMode('signin'); }}
              className={`ripple rounded-full px-3 py-2 text-sm font-bold transition-all duration-300 ${mode === 'signin' ? 'bg-primary text-primary-foreground shadow-warm' : 'text-muted-foreground'}`}
            >
              {lang === 'he' ? 'התחברות' : 'Sign in'}
            </button>
            <button
              onClick={() => { haptic('light'); setMode('register'); }}
              className={`ripple rounded-full px-3 py-2 text-sm font-bold transition-all duration-300 ${mode === 'register' ? 'bg-primary text-primary-foreground shadow-warm' : 'text-muted-foreground'}`}
            >
              {lang === 'he' ? 'הרשמה' : 'Register'}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <Field
                id="name"
                label={lang === 'he' ? 'שם' : 'Name'}
                icon={<UserIcon className="h-4 w-4" />}
                value={name}
                onChange={setName}
                autoComplete="name"
                placeholder={lang === 'he' ? 'השם המלא שלך' : 'Your full name'}
              />
            )}
            <Field
              id="email"
              label={lang === 'he' ? 'אימייל' : 'Email'}
              icon={<Mail className="h-4 w-4" />}
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              placeholder="you@example.com"
              dir="ltr"
            />
            <div>
              <Label htmlFor="pw" className="mb-1 ms-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {lang === 'he' ? 'סיסמה' : 'Password'}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={lang === 'he' ? 'לפחות 8 תווים' : 'At least 8 characters'}
                  className="h-11 pl-9 pr-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => { haptic('light'); setShowPw((v) => !v); }}
                  className="press absolute inset-y-0 right-2 grid place-items-center rounded-md px-2 text-muted-foreground"
                  aria-label={showPw ? 'Hide' : 'Show'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              size="lg"
              className="press btn-glow ripple shine-sweep w-full bg-gradient-warm shadow-warm"
            >
              {busy ? '…' : mode === 'register'
                ? (lang === 'he' ? 'הירשם' : 'Create account')
                : (lang === 'he' ? 'התחבר' : 'Sign in')}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {lang === 'he' ? 'או' : 'or'}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <Button
            onClick={signInGoogle}
            disabled={busy}
            size="lg"
            variant="secondary"
            className="ripple w-full gap-3"
          >
            <GoogleIcon />
            {lang === 'he' ? 'המשך עם Google' : t('signInGoogle')}
          </Button>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            {t('score365rules')}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, icon, value, onChange, type = 'text', autoComplete, placeholder, dir,
}: {
  id: string; label: string; icon: React.ReactNode;
  value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string; placeholder?: string; dir?: 'ltr' | 'rtl';
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 ms-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 pl-9"
          dir={dir}
        />
      </div>
    </div>
  );
}

function errorLabel(code: string, lang: string, mode: Mode): string {
  const he = lang === 'he';
  if (code.includes('email_exists') || code.includes('409'))
    return he ? 'אימייל כבר רשום' : 'Email already registered';
  if (code.includes('invalid_credentials') || code.includes('401'))
    return he ? 'אימייל או סיסמה שגויים' : 'Invalid email or password';
  if (code.includes('password_too_short'))
    return he ? 'סיסמה חייבת להיות לפחות 8 תווים' : 'Password must be at least 8 characters';
  if (code.includes('invalid_email'))
    return he ? 'כתובת אימייל לא תקינה' : 'Invalid email';
  if (code.includes('too_many'))
    return he ? 'יותר מדי ניסיונות, נסה שוב בעוד מספר דקות' : 'Too many attempts, try again later';
  return he
    ? (mode === 'register' ? 'הרשמה נכשלה' : 'התחברות נכשלה')
    : (mode === 'register' ? 'Registration failed' : 'Sign in failed');
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
