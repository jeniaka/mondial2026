/* api.ts — Fetch wrapper for the Mondial Python backend */

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'fetch',
    ...(opts.headers as Record<string, string>),
  };
  if (opts.body !== undefined && typeof opts.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, { ...opts, headers, credentials: 'include' });
  if (res.status === 401) {
    // Don't auto-redirect for explicit auth endpoints — caller handles error
    const isAuthEndpoint = path === '/auth/login' || path === '/auth/register' || path === '/auth/me';
    if (!isAuthEndpoint && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw Object.assign(new Error((err.error as string) || 'unauthenticated'), {
      status: 401,
      data: err,
    });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw Object.assign(new Error((err.error as string) || 'api_error'), {
      status: res.status,
      data: err,
    });
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

function json(body: unknown) {
  return JSON.stringify(body);
}

// Match shape from our Python backend
export type ApiMatch = {
  id: string;
  kickoff_utc: string | null;
  status: string;
  home: { name_en: string; name_he: string; tla: string; iso2?: string };
  away: { name_en: string; name_he: string; tla: string; iso2?: string };
  score: { home: number | null; away: number | null; ft_home?: number | null; ft_away?: number | null };
  minute: number | null;
  stage: string | null;
  group: string | null;
  competition: string | null;
};

export type Group = {
  id: string;
  name: string;
  join_code: string;
  is_owner: boolean;
  is_private: boolean;
  member_count: number;
  muted: boolean;
  members?: Member[];
};

export type Member = {
  user_id: string;
  role: string;
  name: string;
  picture: string;
};

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  name: string;
  picture: string;
  total: number;
  exact: number;
  correct: number;
  count: number;
  bonus_pts: number;
  is_me: boolean;
};

export type Prediction = {
  id: string;
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  points_awarded: number | null;
  locked: boolean;
};

export type Notification = {
  id: string;
  type: string;
  title_he: string;
  title_en: string;
  body_he?: string;
  body_en?: string;
  read: boolean;
  created_at: string;
};

export type EmailDigest = "off" | "daily" | "matchdays_only";

export type NotifPrefs = {
  match_start?: boolean;
  match_end?: boolean;
  goal_in_pinned?: boolean;
  friend_invite?: boolean;
  leaderboard_change?: boolean;
  email_digest?: EmailDigest;
};

export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
  is_admin: boolean;
  notif_prefs?: NotifPrefs;
};

export const api = {
  // Auth
  me: () => req<User>('/auth/me'),
  logout: () => req<void>('/auth/logout', { method: 'POST' }),
  register: (data: { name: string; email: string; password: string }) =>
    req<{ ok: true; id: string }>('/auth/register', { method: 'POST', body: json(data) }),
  login: (data: { email: string; password: string }) =>
    req<{ ok: true; id: string }>('/auth/login', { method: 'POST', body: json(data) }),

  // Matches
  matches: (from: string, to: string) => req<ApiMatch[]>(`/api/matches?from=${from}&to=${to}`),
  matchesLive: () => req<ApiMatch[]>('/api/matches/live'),
  match: (id: string) => req<ApiMatch>(`/api/matches/${id}`),
  pinMatch: (id: string) => req<{ pinned: boolean }>(`/api/matches/${id}/pin`, { method: 'POST' }),
  matchesPinned: () => req<ApiMatch[]>('/api/matches/pinned'),

  // Groups
  groups: () => req<Group[]>('/api/groups'),
  groupGet: (id: string) => req<Group>(`/api/groups/${id}`),
  groupCreate: (name: string) => req<Group>('/api/groups', { method: 'POST', body: json({ name }) }),
  groupJoinByCode: (code: string) => req<Group>('/api/groups/join-by-code', { method: 'POST', body: json({ code }) }),
  groupLeave: (id: string) => req<void>(`/api/groups/${id}/leave`, { method: 'POST' }),
  groupKick: (id: string, userId: string) => req<void>(`/api/groups/${id}/kick`, { method: 'POST', body: json({ user_id: userId }) }),
  groupDelete: (id: string) => req<void>(`/api/groups/${id}`, { method: 'DELETE' }),
  groupRename: (id: string, name: string) => req<void>(`/api/groups/${id}`, { method: 'PATCH', body: json({ name }) }),
  groupSetPrivate: (id: string, is_private: boolean) =>
    req<void>(`/api/groups/${id}`, { method: 'PATCH', body: json({ is_private }) }),
  groupAdjustPoints: (id: string, userId: string, delta: number) =>
    req<{ ok: true; delta: number }>(`/api/groups/${id}/adjust-points`, {
      method: 'POST', body: json({ user_id: userId, delta }),
    }),
  groupRegenCode: (id: string) => req<{ join_code: string }>(`/api/groups/${id}/regenerate-code`, { method: 'POST' }),
  groupReset: (id: string) => req<void>(`/api/groups/${id}/reset`, { method: 'POST' }),
  groupTransfer: (id: string, userId: string) => req<void>(`/api/groups/${id}/transfer`, { method: 'POST', body: json({ user_id: userId }) }),
  groupMute: (id: string, muted: boolean) => req<void>(`/api/groups/${id}/mute`, { method: 'POST', body: json({ muted }) }),
  groupStats: (id: string) => req<{ total_predictions: number; active_since: string }>(`/api/groups/${id}/stats`),
  groupInvite: (id: string, email: string) => req<void>(`/api/groups/${id}/invite`, { method: 'POST', body: json({ email }) }),
  inviteAccept: (token: string) =>
    req<{ ok: true; group_id: string; group_name: string }>('/api/invites/accept', { method: 'POST', body: json({ token }) }),

  // Predictions
  predictions: (gid: string, mid: string) => req<{ predictions: Prediction[]; locked: boolean }>(`/api/groups/${gid}/predictions/${mid}`),
  submitPrediction: (gid: string, mid: string, data: object) =>
    req<void>(`/api/groups/${gid}/predictions/${mid}`, { method: 'POST', body: json(data) }),
  deletePrediction: (gid: string, mid: string) =>
    req<void>(`/api/groups/${gid}/predictions/${mid}`, { method: 'DELETE' }),
  myPredictions: (gid: string) => req<Prediction[]>(`/api/groups/${gid}/my-predictions`),
  leaderboard: (gid: string) => req<LeaderboardRow[]>(`/api/groups/${gid}/leaderboard`),

  // Bonus bets
  tournamentBetGet: (gid: string) =>
    req<{ bet: Record<string, unknown> | null; locked: boolean; lock_ts: string }>(`/api/groups/${gid}/tournament-bet`),
  tournamentBetSave: (gid: string, data: object) =>
    req<void>(`/api/groups/${gid}/tournament-bet`, { method: 'POST', body: json(data) }),

  // Notifications
  notifications: (page = 1) => req<{ notifications: Notification[]; total: number; unread: number }>(`/api/notifications?page=${page}`),
  unreadCount: () => req<{ count: number }>('/api/notifications/unread-count'),
  markRead: (ids: string[]) => req<void>('/api/notifications/read', { method: 'POST', body: json({ ids }) }),
  notifPrefs: (prefs: NotifPrefs) => req<{ ok: true }>('/api/notifications/prefs', { method: 'POST', body: json(prefs) }),

  // App-level invite (not tied to a league)
  appInvite: (email: string, lang: 'he' | 'en') =>
    req<{ ok: true; email: string }>('/api/invite-app', { method: 'POST', body: json({ email, lang }) }),

  // User
  userStats: () => req<{ total_predictions: number; exact_predictions: number; best_rank: number | null }>('/api/users/me/stats'),
  deleteAccount: () => req<void>('/api/users/me/delete', { method: 'POST' }),
};
