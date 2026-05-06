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
    window.location.href = '/login';
    throw Object.assign(new Error('unauthenticated'), { status: 401 });
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

export type User = {
  id: string;
  name: string;
  email: string;
  picture: string;
  is_admin: boolean;
};

export const api = {
  // Auth
  me: () => req<User>('/auth/me'),
  logout: () => req<void>('/auth/logout', { method: 'POST' }),

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
  groupRegenCode: (id: string) => req<{ join_code: string }>(`/api/groups/${id}/regenerate-code`, { method: 'POST' }),
  groupReset: (id: string) => req<void>(`/api/groups/${id}/reset`, { method: 'POST' }),
  groupTransfer: (id: string, userId: string) => req<void>(`/api/groups/${id}/transfer`, { method: 'POST', body: json({ user_id: userId }) }),
  groupMute: (id: string, muted: boolean) => req<void>(`/api/groups/${id}/mute`, { method: 'POST', body: json({ muted }) }),
  groupStats: (id: string) => req<{ total_predictions: number; active_since: string }>(`/api/groups/${id}/stats`),
  groupInvite: (id: string, email: string) => req<void>(`/api/groups/${id}/invite`, { method: 'POST', body: json({ email }) }),
  inviteAccept: (token: string) => req<void>('/api/invites/accept', { method: 'POST', body: json({ token }) }),

  // Predictions
  predictions: (gid: string, mid: string) => req<{ predictions: Prediction[]; locked: boolean }>(`/api/groups/${gid}/predictions/${mid}`),
  submitPrediction: (gid: string, mid: string, data: object) =>
    req<void>(`/api/groups/${gid}/predictions/${mid}`, { method: 'POST', body: json(data) }),
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

  // User
  userStats: () => req<{ total_predictions: number; exact_predictions: number; best_rank: number | null }>('/api/users/me/stats'),
  deleteAccount: () => req<void>('/api/users/me/delete', { method: 'POST' }),
};
