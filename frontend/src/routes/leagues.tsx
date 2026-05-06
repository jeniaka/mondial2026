import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { Crown, Plus, LogIn, UserPlus, X, Copy, Trash2, Shield, LogOut, BarChart2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { api, type Group, type LeaderboardRow } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { EmptyState, CardSkeleton } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/Sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/leagues')({ component: LeaguesPage });

function LeaguesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: '/login' }); }, [user, loading, nav]);

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.groups(),
    enabled: !!user,
  });

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['groups'] }), [qc]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await api.groupCreate(name.trim());
      setName(''); setCreateOpen(false); invalidate();
      toast.success(`${t('create')} ✓`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? 'Error');
    }
  };

  const join = async () => {
    if (!code.trim()) return;
    try {
      await api.groupJoinByCode(code.trim());
      setCode(''); setJoinOpen(false); invalidate();
      toast.success(`${t('join')} ✓`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? (lang === 'he' ? 'קוד לא תקין' : 'Invalid code'));
    }
  };

  if (!user) return null;

  return (
    <AppShell title={t('leagues')}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button onClick={() => setCreateOpen(true)} className="press h-12 bg-gradient-warm shadow-warm">
          <Plus className="me-1.5 h-4 w-4" /> {t('createLeague')}
        </Button>
        <Button onClick={() => setJoinOpen(true)} variant="secondary" className="press h-12">
          <LogIn className="me-1.5 h-4 w-4" /> {t('joinLeague')}
        </Button>
      </div>

      {isLoading ? <CardSkeleton count={2} /> : !groups?.length ? (
        <EmptyState
          icon={<Crown className="h-6 w-6" />}
          title={lang === 'he' ? 'אין עדיין קבוצות' : 'No groups yet'}
          hint={lang === 'he' ? 'צור קבוצה ושתף את הקוד עם החברים' : 'Create a group and share the code'}
        />
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => <GroupCard key={g.id} group={g} userId={user.id} onChanged={invalidate} />)}
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen} title={t('createLeague')}>
        <Input placeholder={t('leagueName')} value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
        <Button onClick={create} className="press mt-4 w-full bg-gradient-warm shadow-warm" size="lg">{t('create')}</Button>
      </Sheet>

      <Sheet open={joinOpen} onOpenChange={setJoinOpen} title={t('joinLeague')}>
        <Input
          placeholder={t('enterCode')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="num h-12 text-center text-lg font-bold tracking-widest"
        />
        <Button onClick={join} className="press mt-4 w-full bg-gradient-warm shadow-warm" size="lg">{t('join')}</Button>
      </Sheet>
    </AppShell>
  );
}

function GroupCard({ group, userId, onChanged }: { group: Group; userId: string; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);

  const { data: leaderboard } = useQuery<LeaderboardRow[]>({
    queryKey: ['leaderboard', group.id],
    queryFn: () => api.leaderboard(group.id),
    enabled: leaderOpen,
  });

  const top3 = (leaderboard ?? []).slice(0, 3);
  const rest = (leaderboard ?? []).slice(3);

  const deleteGroup = async () => {
    try { await api.groupDelete(group.id); onChanged(); toast.success(t('deleteLeague') + ' ✓'); }
    catch (e: unknown) { const err = e as { message?: string }; toast.error(err?.message ?? 'Error'); }
  };

  const leaveGroup = async () => {
    try { await api.groupLeave(group.id); onChanged(); toast.success(t('leaveLeague') + ' ✓'); }
    catch (e: unknown) { const err = e as { message?: string }; toast.error(err?.message ?? 'Error'); }
  };

  const kickMember = async (memberId: string) => {
    try { await api.groupKick(group.id, memberId); onChanged(); toast.success('✓'); }
    catch (e: unknown) { const err = e as { message?: string }; toast.error(err?.message ?? 'Error'); }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-warm shadow-warm">
            <Crown className="h-4 w-4 text-primary-foreground" />
          </span>
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate font-display text-base font-bold">
              {group.name}
              {group.is_owner && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/30 px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                  <Shield className="h-2.5 w-2.5" />{t('admin')}
                </span>
              )}
            </h3>
            <button
              onClick={() => { navigator.clipboard.writeText(group.join_code); toast.success(lang === 'he' ? 'הועתק' : 'Copied'); }}
              className="press flex items-center gap-1 text-[10px] text-muted-foreground"
            >
              <span className="num font-mono font-bold text-primary">{group.join_code}</span>
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)} className="press h-9">
            <UserPlus className="me-1 h-3.5 w-3.5" /> {t('inviteFriend')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLeaderOpen((v) => !v)} className="press h-9 w-9 p-0">
            <BarChart2 className="h-4 w-4" />
          </Button>
          {group.is_owner ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="press h-9 w-9 text-destructive" aria-label={t('deleteLeague')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteLeague')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('deleteLeagueConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('decline')}</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteGroup} className="bg-destructive text-destructive-foreground">{t('deleteLeague')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="press h-9 w-9 text-muted-foreground" aria-label={t('leaveLeague')}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('leaveLeague')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('leaveLeagueConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('decline')}</AlertDialogCancel>
                  <AlertDialogAction onClick={leaveGroup}>{t('leaveLeague')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{group.member_count} {lang === 'he' ? 'משתתפים' : 'members'}</div>

      {leaderOpen && (
        <div className="mt-3">
          {!leaderboard ? (
            <div className="animate-pulse h-20 rounded-xl bg-muted" />
          ) : (
            <>
              {top3.length >= 3 && (
                <div className="mb-2 grid grid-cols-3 items-end gap-2">
                  <Podium rank={2} row={top3[1]} isMe={top3[1]?.is_me} height="h-16" />
                  <Podium rank={1} row={top3[0]} isMe={top3[0]?.is_me} height="h-20" />
                  <Podium rank={3} row={top3[2]} isMe={top3[2]?.is_me} height="h-14" />
                </div>
              )}
              {(top3.length < 3 || rest.length > 0) && (
                <div className="rounded-xl bg-muted/40 p-1.5">
                  {(top3.length < 3 ? leaderboard : rest).map((row, i) => {
                    const idx = top3.length < 3 ? i : i + 3;
                    return (
                      <div key={row.user_id} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${row.is_me ? 'bg-primary/10' : ''}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="num w-6 text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="truncate font-medium">{row.name}</span>
                          {row.is_me && <span className="text-[10px] text-muted-foreground">({t('you')})</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="num font-display text-base font-bold">{row.total}</span>
                          {group.is_owner && !row.is_me && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="press grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-destructive" aria-label={t('kickMember')}>
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('kickMember')}: {row.name}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('kickConfirm')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('decline')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => kickMember(row.user_id)} className="bg-destructive text-destructive-foreground">{t('kickMember')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} groupId={group.id} groupName={group.name} joinCode={group.join_code} />
    </div>
  );
}

function Podium({ rank, row, isMe, height }: { rank: 1 | 2 | 3; row: LeaderboardRow; isMe: boolean; height: string }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const bg = rank === 1 ? 'bg-gradient-warm text-primary-foreground' : rank === 2 ? 'bg-secondary' : 'bg-accent/30';
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl">{medal}</div>
      <div className="mt-1 truncate text-center text-xs font-semibold">{row?.name ?? '?'}{isMe ? ' ★' : ''}</div>
      <div className={`mt-1 flex w-full items-center justify-center rounded-t-xl ${bg} ${height}`}>
        <span className="num font-display text-lg font-black">{row?.total ?? 0}</span>
      </div>
    </div>
  );
}

function InviteSheet({ open, onOpenChange, groupId, groupName, joinCode }: { open: boolean; onOpenChange: (o: boolean) => void; groupId: string; groupName: string; joinCode: string }) {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      await api.groupInvite(groupId, email.trim());
      toast.success(lang === 'he' ? `הזמנה נשלחה ל-${email}. אם לא מגיעה — שתף את קוד ההצטרפות.` : `Invite sent to ${email}. If it doesn't arrive, share the join code.`);
      setEmail('');
      onOpenChange(false);
    } catch (e: unknown) {
      const err = e as { message?: string; data?: { detail?: string } };
      const detail = (e as { data?: { detail?: string } })?.data?.detail ?? err?.message ?? 'Error';
      toast.error(lang === 'he' ? `שליחת ההזמנה נכשלה: ${detail}` : `Invite failed: ${detail}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${t('inviteFriend')} — ${groupName}`}>
      <p className="mb-3 text-sm text-muted-foreground">
        {lang === 'he' ? 'שלח הזמנה לפי כתובת אימייל' : 'Send an invite by email address'}
      </p>
      <Input
        type="email"
        placeholder="friend@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        className="h-12"
      />
      <Button onClick={send} disabled={sending || !email.trim()} className="press mt-4 w-full bg-gradient-warm shadow-warm" size="lg">
        {sending ? t('loading') : t('inviteFriend')}
      </Button>
      <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-center text-sm">
        <div className="mb-1 text-xs text-muted-foreground">{lang === 'he' ? 'או שתף את קוד ההצטרפות ישירות:' : 'Or share the join code directly:'}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(joinCode); toast.success(lang === 'he' ? 'הועתק' : 'Copied'); }}
          className="num font-mono text-xl font-black tracking-widest text-primary"
        >
          {joinCode}
        </button>
      </div>
    </Sheet>
  );
}
