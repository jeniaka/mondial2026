import { Link, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Bell, Globe, LogOut, Trophy, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api, type Notification } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { haptic } from '@/hooks/useHaptic';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function AppHeader({ title, action }: { title?: string; action?: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = () => api.notifications(1).then((r) => setNotifs(r?.notifications ?? [])).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const ids = notifs.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) {
      await api.markRead(ids).catch(() => {});
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-[60px] items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => haptic('light')}>
          <span className="icon-tile shine-sweep h-9 w-9">
            <Trophy className="h-[18px] w-[18px] wobble" />
          </span>
          <span className="font-display text-lg font-black italic tracking-tight text-gradient-warm">
            {title ?? t('appName')}
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {action}
          <Button variant="ghost" size="icon" onClick={() => { haptic('light'); toggle(); }} aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')} className="ripple h-10 w-10 active:scale-95">
            {theme === 'dark' ? <Sun key="sun" className="num-flip h-5 w-5" /> : <Moon key="moon" className="num-flip h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { haptic('light'); setLang(lang === 'en' ? 'he' : 'en'); }} aria-label={t('language')} className="ripple h-10 w-10 active:scale-95">
            <Globe className="h-5 w-5" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ripple relative h-10 w-10 active:scale-95" onClick={() => { haptic('light'); markAllRead(); }}>
                  <Bell className={`h-5 w-5 ${unread > 0 ? 'bell-shake' : ''}`} />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-live text-[10px] font-bold text-live-foreground glow-pulse">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t('noNotifications')}</div>
                )}
                {notifs.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
                    <span className="text-sm font-medium">{lang === 'he' ? n.title_he : n.title_en}</span>
                    {(lang === 'he' ? n.body_he : n.body_en) && (
                      <span className="text-xs text-muted-foreground">{lang === 'he' ? n.body_he : n.body_en}</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); router.navigate({ to: '/login' }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
