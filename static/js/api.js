/* api.js — Fetch wrappers for the Mondial backend */

import { t } from './i18n.js';

const BASE = '';

async function fetchJson(path, opts = {}) {
  const headers = {
    'X-Requested-With': 'fetch',
    ...opts.headers,
  };
  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts = { ...opts, body: JSON.stringify(opts.body) };
  }
  let res;
  try {
    res = await fetch(BASE + path, { ...opts, headers });
  } catch (_) {
    showToast(t('common.error_network'));
    throw new Error('network_error');
  }
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthenticated');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status !== 423) {
      showToast(t('common.error_generic'));
    }
    const e = new Error(err.error || 'api_error');
    e.status = res.status;
    e.data = err;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  me:     ()                     => fetchJson('/auth/me'),
  logout: ()                     => fetchJson('/auth/logout', { method: 'POST' }),

  // Matches
  matchesDay:    (day)           => fetchJson(`/api/matches?day=${day}`),
  matchesRange:  (from, to)      => fetchJson(`/api/matches?from=${from}&to=${to}`),
  matchesLive:   ()              => fetchJson('/api/matches/live'),
  matchesPinned: ()              => fetchJson('/api/matches/pinned'),
  match:         (id)            => fetchJson(`/api/matches/${id}`),
  pinMatch:      (id)            => fetchJson(`/api/matches/${id}/pin`, { method: 'POST' }),
  standings:     (group)         => fetchJson(`/api/standings/${group}`),
  tournament:    ()              => fetchJson('/api/tournament'),

  // Groups
  groups:     ()                 => fetchJson('/api/groups'),
  groupGet:   (id)               => fetchJson(`/api/groups/${id}`),
  groupCreate:(name)             => fetchJson('/api/groups', { method: 'POST', body: { name } }),
  groupInvite:(id, email)        => fetchJson(`/api/groups/${id}/invite`, { method: 'POST', body: { email } }),
  groupLeave: (id)               => fetchJson(`/api/groups/${id}/leave`, { method: 'POST' }),
  groupKick:  (id, userId)       => fetchJson(`/api/groups/${id}/kick`, { method: 'POST', body: { user_id: userId } }),
  inviteAccept:     (token)       => fetchJson('/api/invites/accept', { method: 'POST', body: { token } }),
  groupJoinByCode:  (code)        => fetchJson('/api/groups/join-by-code', { method: 'POST', body: { code } }),
  updateLocale:     (locale)      => fetchJson('/api/users/me/locale', { method: 'POST', body: { locale } }),

  // Predictions
  predictions:       (gid, mid)  => fetchJson(`/api/groups/${gid}/predictions/${mid}`),
  submitPrediction:  (gid, mid, data) => fetchJson(`/api/groups/${gid}/predictions/${mid}`, { method: 'POST', body: data }),
  leaderboard:       (gid)       => fetchJson(`/api/groups/${gid}/leaderboard`),
  myPredictions:     (gid)       => fetchJson(`/api/groups/${gid}/my-predictions`),

  // Notifications
  notifications:     (page = 1)  => fetchJson(`/api/notifications?page=${page}`),
  unreadCount:       ()          => fetchJson('/api/notifications/unread-count'),
  markRead:          (ids)       => fetchJson('/api/notifications/read', { method: 'POST', body: { ids } }),
  saveNotifPrefs:    (prefs)     => fetchJson('/api/notifications/prefs', { method: 'POST', body: prefs }),
};

// --- Toast helper (shared across all modules) ---
let _toastTimer = null;
export function showToast(msg, duration = 3000) {
  const existing = document.querySelector('.mn-toast');
  if (existing) existing.remove();
  if (_toastTimer) clearTimeout(_toastTimer);
  const el = document.createElement('div');
  el.className = 'mn-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  _toastTimer = setTimeout(() => { el.remove(); }, duration);
}
