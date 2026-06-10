import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Target, Award, LogOut, Sun, Moon, Check, Bell, BellRing, Goal, UserPlus, Crown, Mail, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { haptic } from '@/hooks/useHaptic';
import { useTheme, type Palette } from '@/lib/theme';
import { api, type NotifPrefs, type EmailDigest } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { CardSkeleton } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BurstConfetti } from '@/components/BurstConfetti';

export const Route = createFileRoute('/friends')({ component: ProfilePage });

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, palette, setPalette } = useTheme();

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.userStats(),
    enabled: !!user,
  });


  if (!user) return null;

  return (
    <AppShell title={lang === 'he' ? 'פרופיל' : 'Profile'}>
      {/* Avatar + name */}
      <div className="hero-banner shine-sweep card-lift mb-4 flex items-center gap-4 p-5">
        {user.picture ? (
          <span className="avatar-ring inline-block shrink-0 rounded-full">
            <img src={user.picture} alt={user.name} className="h-[68px] w-[68px] rounded-full object-cover" />
          </span>
        ) : (
          <div className="avatar-ring grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-pitch font-display text-3xl font-black text-pitch-foreground">
            {user.name?.[0] ?? '?'}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-display text-[22px] font-black italic text-primary-foreground truncate">{user.name}</div>
          <div className="text-xs text-primary-foreground/80 truncate" dir="ltr">{user.email}</div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? <CardSkeleton count={3} /> : stats && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatCard icon={<Trophy className="h-5 w-5" />} value={stats.total_predictions} label={lang === 'he' ? 'ניחושים' : 'Picks'} />
          <StatCard icon={<Target className="h-5 w-5" />} value={stats.exact_predictions} label={lang === 'he' ? 'מדויקים' : 'Exact'} />
          <StatCard icon={<Award className="h-5 w-5" />} value={stats.best_rank ?? '—'} label={lang === 'he' ? 'דירוג מירב' : 'Best rank'} />
        </div>
      )}

      {/* Settings */}
      <h3 className="section-label mb-2 px-1">{lang === 'he' ? 'הגדרות' : 'Settings'}</h3>
      <div className="card-surface mb-4 p-4">
        <div className="space-y-3">

          {/* Language */}
          <button
            onClick={() => { haptic('light'); setLang(lang === 'en' ? 'he' : 'en'); }}
            className="press ripple flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium"
          >
            <span>{lang === 'he' ? 'שפה' : 'Language'}</span>
            <span key={lang} className="num-flip text-muted-foreground">{lang === 'he' ? 'עברית' : 'English'}</span>
          </button>

          {/* Dark / Light */}
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="mb-2 text-sm font-medium">{lang === 'he' ? 'מצב תצוגה' : 'Appearance'}</div>
            <div className="flex gap-2">
              <button
                onClick={() => { haptic('light'); setTheme('light'); }}
                className={`press ripple flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all duration-300 ${theme === 'light' ? 'border-primary bg-primary text-primary-foreground shadow-soft scale-105' : 'border-border bg-card text-muted-foreground'}`}
              >
                <Sun className={`h-3.5 w-3.5 ${theme === 'light' ? 'rotate-slow' : ''}`} />
                {lang === 'he' ? 'בהיר' : 'Light'}
              </button>
              <button
                onClick={() => { haptic('light'); setTheme('dark'); }}
                className={`press ripple flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all duration-300 ${theme === 'dark' ? 'border-primary bg-primary text-primary-foreground shadow-soft scale-105' : 'border-border bg-card text-muted-foreground'}`}
              >
                <Moon className="h-3.5 w-3.5" />
                {lang === 'he' ? 'כהה' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Color theme */}
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="mb-2.5 text-sm font-medium">{t('colorTheme')}</div>
            <div className="grid grid-cols-3 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { haptic('light'); setPalette(p.id); }}
                  className="press group flex flex-col items-center gap-1.5"
                  aria-label={lang === 'he' ? p.labelHe : p.label}
                >
                  <div
                    className={`swatch-shimmer relative grid h-10 w-10 place-items-center rounded-full transition-all duration-300 ${palette === p.id ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-warm' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`}
                    style={{ background: `linear-gradient(135deg, ${p.colorA}, ${p.colorB})` }}
                  >
                    {palette === p.id && <Check className="copy-check h-4 w-4 text-white drop-shadow" />}
                  </div>
                  <span className="text-[9px] font-medium leading-none text-muted-foreground">
                    {lang === 'he' ? p.labelHe : p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSettings />

      {/* Invite friends to app */}
      <AppInviteCard />

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={() => { haptic('light'); signOut(); }} variant="secondary" size="lg" className="press ripple w-full gap-2">
          <LogOut className="h-4 w-4" /> {t('signOut')}
        </Button>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="card-surface flex flex-col items-center rounded-2xl p-3.5">
      <span className="icon-tile-soft h-9 w-9">{icon}</span>
      <div className="num mt-1.5 score-display text-[26px]">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

const PALETTES: Array<{ id: Palette; label: string; labelHe: string; colorA: string; colorB: string }> = [
  { id: 'forest',   label: 'Forest',   labelHe: 'יער',         colorA: '#2d8a4e', colorB: '#1a5c32' },
  { id: 'ocean',    label: 'Ocean',    labelHe: 'אוקיינוס',    colorA: '#1e6aad', colorB: '#0e3d75' },
  { id: 'crimson',  label: 'Crimson',  labelHe: 'קרמזין',      colorA: '#c82030', colorB: '#801018' },
  { id: 'trionda',  label: 'Trionda',  labelHe: 'טריאונדה',    colorA: '#D32F2F', colorB: '#1565C0' },
  { id: 'stadium',  label: 'Stadium',  labelHe: 'אצטדיון',     colorA: '#0f2a5c', colorB: '#FFD54F' },
  { id: 'midnight', label: 'Midnight', labelHe: 'חצות',        colorA: '#0a0a14', colorB: '#5e6ad2' },
];

const DEFAULT_PREFS: Required<NotifPrefs> = {
  match_start: true,
  match_end: true,
  goal_in_pinned: true,
  friend_invite: true,
  leaderboard_change: true,
  email_digest: 'daily',
};

function NotificationSettings() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const initial: Required<NotifPrefs> = { ...DEFAULT_PREFS, ...(user?.notif_prefs ?? {}) };
  const [prefs, setPrefs] = useState<Required<NotifPrefs>>(initial);
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);

  // Sync from server when user loads/changes
  useEffect(() => {
    if (user?.notif_prefs) {
      setPrefs({ ...DEFAULT_PREFS, ...user.notif_prefs });
    }
  }, [user?.notif_prefs]);

  const set = <K extends keyof NotifPrefs>(k: K, v: NotifPrefs[K]) => {
    haptic('light');
    setPrefs((p) => ({ ...p, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.notifPrefs(prefs);
      toast.success(lang === 'he' ? 'נשמר' : 'Saved');
      haptic('success');
      setBurst((n) => n + 1);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<{ key: keyof NotifPrefs; icon: React.ReactNode; label: string; labelHe: string }> = [
    { key: 'match_start',        icon: <BellRing className="h-4 w-4" />, label: 'Match start',         labelHe: 'תחילת משחק' },
    { key: 'match_end',          icon: <Bell className="h-4 w-4" />,     label: 'Match end',           labelHe: 'סיום משחק' },
    { key: 'goal_in_pinned',     icon: <Goal className="h-4 w-4" />,     label: 'Goal in pinned match', labelHe: 'שער במשחק מקובע' },
    { key: 'friend_invite',      icon: <UserPlus className="h-4 w-4" />, label: 'Friend invitation',   labelHe: 'הזמנת חבר' },
    { key: 'leaderboard_change', icon: <Crown className="h-4 w-4" />,    label: 'Leaderboard change',  labelHe: 'שינוי בדירוג' },
  ];

  return (
    <div className="mb-4 mt-4">
      <h3 className="section-label mb-2 px-1">
        {lang === 'he' ? 'הגדרות התראות' : 'Notification settings'}
      </h3>
      <div className="reveal glass card-lift overflow-hidden rounded-3xl px-4 py-2 isolate">
        <ul className="divide-y divide-border/40">
          {rows.map((row, i) => (
            <li
              key={row.key}
              className="reveal flex items-center justify-between gap-3 rounded-xl px-3 py-3"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {row.icon}
                </span>
                <span className="truncate text-sm font-semibold">
                  {lang === 'he' ? row.labelHe : row.label}
                </span>
              </div>
              <Switch
                checked={!!prefs[row.key]}
                onCheckedChange={(v) => set(row.key, v)}
                aria-label={lang === 'he' ? row.labelHe : row.label}
              />
            </li>
          ))}
          <li
            className="reveal flex items-center justify-between gap-3 rounded-xl px-3 py-3"
            style={{ animationDelay: `${rows.length * 40}ms` }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              <span className="truncate text-sm font-semibold">
                {lang === 'he' ? 'תקציר במייל' : 'Email digest'}
              </span>
            </div>
            <Select value={prefs.email_digest} onValueChange={(v) => set('email_digest', v as EmailDigest)}>
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{lang === 'he' ? 'כבוי' : 'Off'}</SelectItem>
                <SelectItem value="daily">{lang === 'he' ? 'יומי' : 'Daily'}</SelectItem>
                <SelectItem value="matchdays_only">{lang === 'he' ? 'ימי משחק בלבד' : 'Matchdays only'}</SelectItem>
              </SelectContent>
            </Select>
          </li>
        </ul>
      </div>

      <div className="relative mt-3">
        {burst > 0 && <BurstConfetti trigger={burst} count={28} />}
        <Button
          onClick={save}
          disabled={saving}
          size="lg"
          className="press btn-glow ripple shine-sweep h-12 w-full rounded-2xl bg-gradient-warm font-display text-base font-bold shadow-warm"
        >
          {saving ? '…' : (lang === 'he' ? 'שמור העדפות' : 'Save preferences')}
        </Button>
      </div>
    </div>
  );
}

function AppInviteCard() {
  const { lang } = useI18n();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [burst, setBurst] = useState(0);

  const send = async () => {
    const e = email.trim();
    if (!e || !e.includes('@')) {
      toast.error(lang === 'he' ? 'הזן אימייל תקין' : 'Enter a valid email');
      haptic('error');
      return;
    }
    setSending(true);
    try {
      await api.appInvite(e, lang as 'he' | 'en');
      toast.success(lang === 'he' ? `הזמנה נשלחה אל ${e}` : `Invite sent to ${e}`);
      haptic('success');
      setBurst((n) => n + 1);
      setEmail('');
    } catch (err: unknown) {
      const x = err as { message?: string; data?: { detail?: string } };
      const m = x?.message ?? '';
      const detail = x?.data?.detail ?? '';
      if (m.includes('too_many')) {
        toast.error(lang === 'he' ? 'יותר מדי הזמנות. נסה שוב מאוחר יותר.' : 'Too many invites. Try later.');
      } else if (m.includes('invalid_email')) {
        toast.error(lang === 'he' ? 'אימייל לא תקין' : 'Invalid email');
      } else if (m === 'email_failed') {
        // Surface real Brevo error so we can diagnose
        toast.error(`${lang === 'he' ? 'שליחה נכשלה' : 'Send failed'}: ${detail.slice(0, 200) || m}`);
      } else {
        toast.error(`${lang === 'he' ? 'שגיאה' : 'Error'}: ${m || 'unknown'}`);
      }
      haptic('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-4 mt-4">
      <h3 className="section-label mb-2 px-1">
        {lang === 'he' ? 'הזמן חבר לאפליקציה' : 'Invite a friend'}
      </h3>
      <div className="reveal glass card-lift relative overflow-hidden rounded-3xl p-4">
        {burst > 0 && <BurstConfetti trigger={burst} count={24} />}
        <p className="mb-3 text-xs text-muted-foreground">
          {lang === 'he'
            ? 'שלח קישור הזמנה — החבר יוכל להירשם, להצטרף לליגות ולנחש איתך.'
            : 'Send an invitation link — they can sign up, join leagues, and predict with you.'}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted-foreground">
              <Mail className="h-4 w-4" />
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              dir="ltr"
              autoComplete="email"
              className="h-11 pl-9"
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
          </div>
          <Button
            onClick={send}
            disabled={sending}
            className="press btn-glow ripple bg-gradient-warm shadow-warm"
          >
            <Send className="me-1 h-4 w-4" />
            {sending ? '…' : (lang === 'he' ? 'שלח' : 'Send')}
          </Button>
        </div>
      </div>
    </div>
  );
}
