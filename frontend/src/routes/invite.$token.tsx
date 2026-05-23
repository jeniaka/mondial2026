import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { BurstConfetti } from '@/components/BurstConfetti';
import { haptic } from '@/hooks/useHaptic';

export const Route = createFileRoute('/invite/$token')({ component: InvitePage });

type Status = 'pending' | 'accepted' | 'invalid' | 'error';

function InvitePage() {
  const { token } = useParams({ from: '/invite/$token' });
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>('pending');
  const [groupName, setGroupName] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [errMsg, setErrMsg] = useState<string>('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Stash token in sessionStorage for after-login redirect
      sessionStorage.setItem('pending_invite', token);
      nav({ to: '/login' });
      return;
    }
    // Auto-accept on mount
    (async () => {
      try {
        const r = await api.inviteAccept(token);
        setGroupName(r.group_name);
        setGroupId(r.group_id);
        setStatus('accepted');
        haptic('success');
        sessionStorage.removeItem('pending_invite');
      } catch (e: unknown) {
        const err = e as { message?: string };
        const m = err?.message ?? '';
        if (m === 'invite_invalid' || m === 'token required' || m.includes('410')) {
          setStatus('invalid');
        } else {
          setStatus('error');
          setErrMsg(m || 'unknown');
        }
        haptic('error');
      }
    })();
  }, [user, loading, token, nav]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-gradient-warm opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-gradient-ember opacity-30 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-warm shadow-warm">
            <Trophy className="h-10 w-10 text-primary-foreground wobble" />
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight">
            <span className="text-gradient-warm">{lang === 'he' ? 'הזמנה' : 'Invitation'}</span>
          </h1>
        </div>

        <div className="glass relative overflow-hidden rounded-3xl p-6 shadow-soft">
          {status === 'pending' && (
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {lang === 'he' ? 'בודק הזמנה...' : 'Validating invitation...'}
              </p>
            </div>
          )}

          {status === 'accepted' && (
            <div className="text-center">
              <BurstConfetti trigger={1} count={36} />
              <CheckCircle2 className="mx-auto h-12 w-12 text-success copy-check" />
              <h2 className="mt-3 font-display text-2xl font-black">
                {lang === 'he' ? 'הצטרפת!' : "You're in!"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === 'he' ? `הצטרפת לליגה ` : 'Welcome to '}
                <strong className="text-foreground">{groupName}</strong>
              </p>
              <Button
                onClick={() => { haptic('light'); nav({ to: '/leagues' }); }}
                size="lg"
                className="press btn-glow ripple mt-5 w-full bg-gradient-warm shadow-warm"
              >
                {lang === 'he' ? 'לליגה שלי' : 'Go to leagues'}
              </Button>
              <Button
                onClick={() => { haptic('light'); nav({ to: '/' }); }}
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
              >
                {lang === 'he' ? 'דלג למשחקים' : 'Skip to matches'}
              </Button>
              <input type="hidden" value={groupId} readOnly />
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="mt-3 font-display text-xl font-black">
                {lang === 'he' ? 'ההזמנה אינה תקפה' : 'Invitation expired or invalid'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === 'he'
                  ? 'ההזמנה כבר נוצלה או פגה. בקש מהמזמין קוד הצטרפות חדש.'
                  : 'This invite was already used or has expired. Ask the inviter to send a fresh one.'}
              </p>
              <Button
                onClick={() => nav({ to: '/leagues' })}
                size="lg"
                className="press ripple mt-5 w-full bg-gradient-warm shadow-warm"
              >
                {lang === 'he' ? 'לליגות' : 'Go to leagues'}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="mt-3 font-display text-xl font-black">
                {lang === 'he' ? 'שגיאה' : 'Something went wrong'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground break-words">{errMsg}</p>
              <Button
                onClick={() => window.location.reload()}
                size="lg"
                className="press ripple mt-5 w-full bg-gradient-warm shadow-warm"
              >
                <LogIn className="me-2 h-4 w-4" />
                {lang === 'he' ? 'נסה שוב' : 'Try again'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
