/* app.js — Main SPA entry point and router */

import { setLang, currentLang, t } from './i18n.js';
import { api, showToast } from './api.js';
import { renderMatchesView, destroyMatchesView } from './views/matches.js';
import { renderMatchDetail, destroyMatchDetail } from './views/match_detail.js';
import { renderFriendsView } from './views/friends.js';
import { renderPredictionsView } from './views/predictions.js';
import { renderLeaderboardView } from './views/leaderboard.js';
import { openNotificationsDrawer, refreshUnreadCount } from './views/notifications.js';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

let _user = null;
let _currentView = null;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

async function boot() {
  // Apply saved theme immediately (avoids flash)
  applyTheme(localStorage.getItem('theme') || 'dark');

  // Apply saved language immediately (avoids flash)
  const savedLang = localStorage.getItem('lang') || 'he';
  await setLang(savedLang);

  // Load country data for flag.js
  try {
    const r = await fetch('/api/countries');
    if (r.ok) window.COUNTRIES = await r.json();
  } catch (_) {}

  // Try to get user
  try {
    _user = await api.me();
  } catch (_) {
    window.location.href = '/login';
    return;
  }

  renderShell();

  // Handle ?join=CODE deep link from shared invite URLs
  const joinCode = new URLSearchParams(location.search).get('join');
  if (joinCode) {
    history.replaceState(null, '', location.pathname + location.hash);
    try {
      await api.groupJoinByCode(joinCode.toUpperCase());
      showToast(t('groups.invite_sent'));
    } catch (_) {}
    window.location.hash = '#/friends';
  }

  setupRouter();
  refreshUnreadCount();

  // Poll unread count every 60s
  setInterval(() => {
    if (!document.hidden) refreshUnreadCount();
  }, 60000);
}

// ---------------------------------------------------------------------------
// Shell render
// ---------------------------------------------------------------------------

function renderShell() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="mn-app">
      <header class="mn-header" id="mn-header">
        <div class="mn-header-brand">
          ${logoSvg()}
          <span>Mondial 2026</span>
        </div>
        <div class="mn-header-actions">
          <button class="mn-bell-btn" id="bell-btn" aria-label="${t('notifications.title')}">
            ${bellSvg()}
            <span class="mn-bell-badge" id="notif-badge" data-count="0"></span>
          </button>
          <button class="mn-theme-btn" id="theme-btn" aria-label="Toggle dark mode">${themeSvg()}</button>
          <button class="mn-lang-toggle" id="lang-toggle">${currentLang() === 'he' ? 'EN' : 'עב'}</button>
          ${_user?.picture
            ? `<img src="${_user.picture}" class="mn-avatar" alt="${_user.name}">`
            : `<div class="mn-avatar-placeholder">${(_user?.name || '?')[0]}</div>`}
        </div>
      </header>

      <main class="mn-main" id="mn-main"></main>

      <nav class="mn-bottom-nav" id="mn-bottom-nav" role="navigation" aria-label="${t('nav.matches')}">
        ${buildNav()}
      </nav>
    </div>
  `;

  // Bell
  document.getElementById('bell-btn').addEventListener('click', () => openNotificationsDrawer());

  // Dark mode toggle
  document.getElementById('theme-btn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
    document.getElementById('theme-btn').innerHTML = themeSvg();
  });

  // Language toggle
  document.getElementById('lang-toggle').addEventListener('click', async () => {
    const next = currentLang() === 'he' ? 'en' : 'he';
    await setLang(next);
    // Re-render toggle label
    document.getElementById('lang-toggle').textContent = next === 'he' ? 'EN' : 'עב';
    // Save preference
    if (_user) {
      api.saveNotifPrefs({}).catch(() => {}); // prefs save; locale pref via separate endpoint (future)
    }
    // Re-render current view
    navigateTo(currentHash() || '#/matches');
  });

  // Nav items
  document.querySelectorAll('.mn-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(`#/${item.dataset.view}`);
    });
  });
}

function buildNav() {
  const items = [
    { view: 'matches',       icon: calendarSvg(), labelKey: 'nav.matches' },
    { view: 'live',          icon: radioSvg(),    labelKey: 'nav.live'    },
    { view: 'pool',          icon: trophySvg(),   labelKey: 'nav.pool'    },
    { view: 'friends',       icon: usersSvg(),    labelKey: 'nav.friends' },
    { view: 'profile',       icon: personSvg(),   labelKey: 'nav.profile' },
  ];
  return items.map(item => `
    <button class="mn-nav-item" data-view="${item.view}" aria-label="${t(item.labelKey)}">
      ${item.icon}
      <span>${t(item.labelKey)}</span>
    </button>
  `).join('');
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function setupRouter() {
  window.addEventListener('hashchange', () => handleRoute(currentHash()));
  handleRoute(currentHash() || '#/matches');
}

function currentHash() {
  return window.location.hash || '#/matches';
}

function navigateTo(hash) {
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  } else {
    handleRoute(hash);
  }
}

async function handleRoute(hash) {
  const main = document.getElementById('mn-main');
  if (!main) return;

  // Destroy previous view cleanups
  if (_currentView === 'matches') destroyMatchesView();
  if (_currentView === 'match_detail') destroyMatchDetail();

  setActiveNav(hash);

  // Fade transition
  main.style.opacity = '0';
  main.style.transition = 'opacity 200ms';

  if (hash.startsWith('#/match/')) {
    const matchId = hash.slice('#/match/'.length);
    _currentView = 'match_detail';
    const { renderMatchDetail } = await import('./views/match_detail.js');
    await renderMatchDetail(main, matchId);
  } else if (hash === '#/live') {
    _currentView = 'live';
    await renderLiveView(main);
  } else if (hash === '#/pool') {
    _currentView = 'pool';
    const { renderPredictionsView } = await import('./views/predictions.js');
    await renderPredictionsView(main);
  } else if (hash === '#/friends') {
    _currentView = 'friends';
    const { renderFriendsView } = await import('./views/friends.js');
    await renderFriendsView(main);
  } else if (hash === '#/leaderboard') {
    _currentView = 'leaderboard';
    const { renderLeaderboardView } = await import('./views/leaderboard.js');
    await renderLeaderboardView(main);
  } else if (hash === '#/profile') {
    _currentView = 'profile';
    renderProfileView(main);
  } else {
    _currentView = 'matches';
    await renderMatchesView(main);
  }

  requestAnimationFrame(() => {
    main.style.opacity = '1';
  });
}

async function renderLiveView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  page.innerHTML = `
    <h1 class="mn-page-title">${t('nav.live')}</h1>
    <div id="live-matches-list">
      <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
      <div class="mn-skeleton" style="height:80px;"></div>
    </div>
  `;
  container.appendChild(page);

  const list = page.querySelector('#live-matches-list');
  let live;
  try {
    live = await api.matchesLive();
  } catch (_) { list.innerHTML = ''; return; }

  list.innerHTML = '';
  if (!live || live.length === 0) {
    list.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('matches.no_live_matches')}</div></div>`;
    return;
  }

  const { buildMatchCard } = await import('./components/match_card.js');
  const { api: _api } = await import('./api.js');
  live.forEach(m => {
    const card = buildMatchCard(m, {
      pinned: false,
      onPin: async (id) => { await _api.pinMatch(id); },
      onClick: (id) => { window.location.hash = `#/match/${id}`; },
    });
    list.appendChild(card);
  });
}

function renderProfileView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  container.appendChild(page);

  const lang = currentLang();
  const user = _user || {};

  page.innerHTML = `
    <h1 class="mn-page-title">${t('profile.title')}</h1>
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--mn-line);margin-bottom:20px;">
      ${user.picture
        ? `<img src="${user.picture}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;" alt="">`
        : `<div class="mn-avatar-placeholder" style="width:56px;height:56px;font-size:20px;">${(user.name||'?')[0]}</div>`}
      <div>
        <div style="font-weight:800;font-size:var(--mn-fs-lg);">${escapeHtml(user.name)}</div>
        <div style="font-size:var(--mn-fs-sm);color:var(--mn-ink-soft);">${escapeHtml(user.email)}</div>
      </div>
    </div>

    <div class="mn-toggle-row">
      <div>
        <div class="mn-toggle-label">${t('profile.language')}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-${lang === 'he' ? 'primary' : 'secondary'}" id="lang-he" style="font-size:var(--mn-fs-xs);">עברית</button>
        <button class="btn-${lang === 'en' ? 'primary' : 'secondary'}" id="lang-en" style="font-size:var(--mn-fs-xs);">English</button>
      </div>
    </div>

    <div style="margin-top:24px;">
      <h2 style="font-size:var(--mn-fs-md);font-weight:700;margin-bottom:12px;">${t('notifications.settings')}</h2>
      <div id="notif-prefs-form"></div>
      <button class="btn-primary" style="margin-top:16px;width:100%;" id="save-prefs-btn">${t('notifications.save_prefs')}</button>
    </div>

    <div style="margin-top:32px;border-top:1px solid var(--mn-line);padding-top:16px;">
      <button class="btn-secondary" style="width:100%;" id="signout-btn">${t('auth.sign_out')}</button>
    </div>
  `;

  // Language switcher
  page.querySelector('#lang-he').addEventListener('click', async () => {
    await setLang('he');
    document.getElementById('lang-toggle').textContent = 'EN';
    api.updateLocale('he').catch(() => {});
    navigateTo('#/profile');
  });
  page.querySelector('#lang-en').addEventListener('click', async () => {
    await setLang('en');
    document.getElementById('lang-toggle').textContent = 'עב';
    api.updateLocale('en').catch(() => {});
    navigateTo('#/profile');
  });

  // Notification prefs
  const prefs = user.notif_prefs || {};
  const prefDefs = [
    { key: 'match_start',        label: t('notifications.match_start') },
    { key: 'match_end',          label: t('notifications.match_end') },
    { key: 'goal_in_pinned',     label: t('notifications.goal_in_pinned') },
    { key: 'friend_invite',      label: t('notifications.friend_invite') },
    { key: 'leaderboard_change', label: t('notifications.leaderboard_change') },
  ];
  const prefsForm = page.querySelector('#notif-prefs-form');
  prefDefs.forEach(({ key, label }) => {
    const row = document.createElement('div');
    row.className = 'mn-toggle-row';
    row.innerHTML = `
      <span class="mn-toggle-label">${label}</span>
      <label class="mn-toggle" aria-label="${label}">
        <input type="checkbox" data-key="${key}" ${prefs[key] !== false ? 'checked' : ''}>
        <span class="mn-toggle-track"></span>
      </label>
    `;
    prefsForm.appendChild(row);
  });

  // Email digest row
  const digestRow = document.createElement('div');
  digestRow.className = 'mn-toggle-row';
  digestRow.innerHTML = `
    <span class="mn-toggle-label">${t('notifications.email_digest')}</span>
    <select class="mn-input" style="width:auto;padding:6px 10px;" id="digest-select">
      <option value="off" ${prefs.email_digest === 'off' ? 'selected' : ''}>${t('notifications.email_digest_options.off')}</option>
      <option value="daily" ${(prefs.email_digest === 'daily' || !prefs.email_digest) ? 'selected' : ''}>${t('notifications.email_digest_options.daily')}</option>
      <option value="matchdays_only" ${prefs.email_digest === 'matchdays_only' ? 'selected' : ''}>${t('notifications.email_digest_options.matchdays_only')}</option>
    </select>
  `;
  prefsForm.appendChild(digestRow);

  page.querySelector('#save-prefs-btn').addEventListener('click', async () => {
    const newPrefs = {};
    prefsForm.querySelectorAll('input[data-key]').forEach(inp => {
      newPrefs[inp.dataset.key] = inp.checked;
    });
    newPrefs.email_digest = prefsForm.querySelector('#digest-select').value;
    try {
      await api.saveNotifPrefs(newPrefs);
      showToast(t('common.save'));
    } catch (_) { showToast(t('common.error_generic')); }
  });

  // Sign out
  page.querySelector('#signout-btn').addEventListener('click', async () => {
    await api.logout().catch(() => {});
    window.location.href = '/login';
  });
}

function setActiveNav(hash) {
  const viewMap = {
    '#/matches': 'matches',
    '#/live':    'live',
    '#/pool':    'pool',
    '#/friends': 'friends',
    '#/profile': 'profile',
  };
  const active = viewMap[hash] || 'matches';
  document.querySelectorAll('.mn-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === active);
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---------------------------------------------------------------------------
// Inline SVG icons (Lucide)
// ---------------------------------------------------------------------------

function themeSvg() {
  const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
  if (isDark) {
    // Sun icon — switch to light
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }
  // Moon icon — switch to dark
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function logoSvg() {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mn-flame)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
}
function bellSvg() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
}
function calendarSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
}
function radioSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`;
}
function trophySvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="14 9 9 9 6 9"/><path d="M4 9h16v2a5 5 0 0 1-10 0V9H4v2a9 9 0 0 0 16 0V9z"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>`;
}
function usersSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function personSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', boot);
