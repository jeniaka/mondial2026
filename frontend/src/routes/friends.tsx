import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Target, Award, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
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
  const { theme, toggle } = useTheme();

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
      <div className="mb-4 flex items-center gap-4 rounded-3xl bg-gradient-warm p-5 shadow-warm">
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
        <div className="space-y-2">
          <button
            onClick={toggle}
            className="press flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium"
          >
            <span>{lang === 'he' ? 'מצב תצוגה' : 'Appearance'}</span>
            <span className="text-muted-foreground">{theme === 'dark' ? (lang === 'he' ? 'כהה' : 'Dark') : (lang === 'he' ? 'בהיר' : 'Light')}</span>
          </button>
          <button
            onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
            className="press flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium"
          >
            <span>{lang === 'he' ? 'שפה' : 'Language'}</span>
            <span className="text-muted-foreground">{lang === 'he' ? 'עברית' : 'English'}</span>
          </button>
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
