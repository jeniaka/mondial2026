import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Target, Award, LogOut, Trash2, Sun, Moon, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme, type Palette } from '@/lib/theme';
import { api } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { CardSkeleton } from '@/components/States';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

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

  const deleteAccount = async () => {
    try {
      await api.deleteAccount();
      toast.success(lang === 'he' ? 'חשבון נמחק' : 'Account deleted');
      signOut();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
    }
  };

  if (!user) return null;

  return (
    <AppShell title={lang === 'he' ? 'פרופיל' : 'Profile'}>
      {/* Avatar + name */}
      <div className="shine-sweep card-lift mb-4 flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-warm p-5 shadow-warm">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-foreground/40" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-foreground/20 text-2xl font-black text-primary-foreground">
            {user.name?.[0] ?? '?'}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-display text-xl font-black text-primary-foreground truncate">{user.name}</div>
          <div className="text-xs text-primary-foreground/80 truncate">{user.email}</div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? <CardSkeleton count={3} /> : stats && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatCard icon={<Trophy className="h-5 w-5" />} value={stats.total_predictions} label={lang === 'he' ? 'ניחושים' : 'Picks'} />
          <StatCard icon={<Target className="h-5 w-5" />} value={stats.exact_predictions} label={lang === 'he' ? 'מדויקים' : 'Exact'} />
          <StatCard icon={<Award className="h-5 w-5" />} value={stats.best_rank ?? '—'} label={lang === 'he' ? 'דירוג מירב' : 'Best rank'} />
        </div>
      )}

      {/* Settings */}
      <div className="mb-4 rounded-3xl border border-border bg-card p-4">
        <h3 className="mb-3 font-display text-base font-bold">{lang === 'he' ? 'הגדרות' : 'Settings'}</h3>
        <div className="space-y-3">

          {/* Language */}
          <button
            onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
            className="press flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium"
          >
            <span>{lang === 'he' ? 'שפה' : 'Language'}</span>
            <span className="text-muted-foreground">{lang === 'he' ? 'עברית' : 'English'}</span>
          </button>

          {/* Dark / Light */}
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="mb-2 text-sm font-medium">{lang === 'he' ? 'מצב תצוגה' : 'Appearance'}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`press flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${theme === 'light' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
              >
                <Sun className="h-3.5 w-3.5" />
                {lang === 'he' ? 'בהיר' : 'Light'}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`press flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-colors ${theme === 'dark' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
              >
                <Moon className="h-3.5 w-3.5" />
                {lang === 'he' ? 'כהה' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Color theme */}
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="mb-2.5 text-sm font-medium">{t('colorTheme')}</div>
            <div className="grid grid-cols-5 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className="press group flex flex-col items-center gap-1.5"
                  aria-label={lang === 'he' ? p.labelHe : p.label}
                >
                  <div
                    className={`relative grid h-10 w-10 place-items-center rounded-full transition-all ${palette === p.id ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}`}
                    style={{ background: `linear-gradient(135deg, ${p.colorA}, ${p.colorB})` }}
                  >
                    {palette === p.id && <Check className="h-4 w-4 text-white drop-shadow" />}
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

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={() => signOut()} variant="secondary" size="lg" className="press w-full gap-2">
          <LogOut className="h-4 w-4" /> {t('signOut')}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="lg" className="press w-full gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              {lang === 'he' ? 'מחק חשבון' : 'Delete account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{lang === 'he' ? 'מחיקת חשבון' : 'Delete account'}</AlertDialogTitle>
              <AlertDialogDescription>
                {lang === 'he' ? 'פעולה זו אינה הפיכה. כל הנתונים ימחקו לצמיתות.' : 'This cannot be undone. All your data will be permanently deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('decline')}</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground">
                {lang === 'he' ? 'מחק' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-3">
      <span className="text-primary">{icon}</span>
      <div className="num mt-1 font-display text-2xl font-black">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

const PALETTES: Array<{ id: Palette; label: string; labelHe: string; colorA: string; colorB: string }> = [
  { id: 'forest',  label: 'Forest',  labelHe: 'יער',      colorA: '#2d8a4e', colorB: '#1a5c32' },
  { id: 'ocean',   label: 'Ocean',   labelHe: 'אוקיינוס', colorA: '#1e6aad', colorB: '#0e3d75' },
  { id: 'sunset',  label: 'Sunset',  labelHe: 'שקיעה',    colorA: '#e07020', colorB: '#b04010' },
  { id: 'galaxy',  label: 'Galaxy',  labelHe: 'גלקסיה',   colorA: '#8b35d4', colorB: '#4a1090' },
  { id: 'crimson', label: 'Crimson', labelHe: 'קרמזין',   colorA: '#c82030', colorB: '#801018' },
];
