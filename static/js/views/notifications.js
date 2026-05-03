/* notifications.js — Notifications drawer */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';

let _drawerOpen = false;

export function openNotificationsDrawer() {
  if (_drawerOpen) return;
  _drawerOpen = true;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:490;background:rgba(42,24,16,0.3);';

  const drawer = document.createElement('div');
  drawer.className = 'mn-drawer';

  const header = document.createElement('div');
  header.className = 'mn-drawer-header';
  header.innerHTML = `
    <span>${t('notifications.title')}</span>
    <div style="display:flex;gap:8px;">
      <button class="btn-ghost" id="mark-all-read-btn" style="font-size:var(--mn-fs-xs);">${t('notifications.mark_all_read')}</button>
      <button class="btn-ghost" id="close-drawer-btn" aria-label="${t('common.close')}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  const body = document.createElement('div');
  body.className = 'mn-drawer-body';
  body.innerHTML = `<div class="mn-skeleton" style="height:60px;margin:12px;"></div><div class="mn-skeleton" style="height:60px;margin:12px;"></div>`;

  drawer.appendChild(header);
  drawer.appendChild(body);
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  const close = () => {
    _drawerOpen = false;
    drawer.classList.add('closing');
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 200ms';
    setTimeout(() => { drawer.remove(); backdrop.remove(); }, 220);
  };

  header.querySelector('#close-drawer-btn').addEventListener('click', close);
  backdrop.addEventListener('click', close);

  header.querySelector('#mark-all-read-btn').addEventListener('click', async () => {
    await api.markRead('all').catch(() => {});
    body.querySelectorAll('.mn-notif-item.unread').forEach(el => el.classList.remove('unread'));
    body.querySelectorAll('.mn-notif-dot').forEach(el => el.remove());
    updateBadge(0);
  });

  loadNotifications(body);
}

async function loadNotifications(body) {
  let items;
  try {
    items = await api.notifications();
  } catch (_) {
    body.innerHTML = `<div class="mn-empty" style="padding:24px;"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }

  body.innerHTML = '';
  if (!items || items.length === 0) {
    body.innerHTML = `<div class="mn-empty" style="padding:32px;"><div class="mn-empty-title">${t('notifications.no_notifications')}</div></div>`;
    return;
  }

  const lang = currentLang();
  items.forEach(n => {
    const item = document.createElement('div');
    item.className = `mn-notif-item${n.read ? '' : ' unread'}`;
    item.innerHTML = `
      ${n.read ? '' : '<div class="mn-notif-dot" aria-hidden="true"></div>'}
      <div class="mn-notif-content">
        <div class="mn-notif-title">${escapeHtml(lang === 'he' ? n.title_he : n.title_en)}</div>
        <div class="mn-notif-body">${escapeHtml(lang === 'he' ? n.body_he : n.body_en)}</div>
        <div class="mn-notif-time">${formatRelTime(n.created_at)}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      api.markRead([n.id]).catch(() => {});
      item.classList.remove('unread');
      item.querySelector('.mn-notif-dot')?.remove();
      if (n.link) window.location.hash = `#${n.link}`;
    });
    body.appendChild(item);
  });
}

function formatRelTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const lang = currentLang();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor(diffMs / 60000);
  if (m < 1)  return lang === 'he' ? 'עכשיו' : 'now';
  if (m < 60) return lang === 'he' ? `לפני ${m} דקות` : `${m}m ago`;
  if (h < 24) return lang === 'he' ? `לפני ${h} שעות` : `${h}h ago`;
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB');
}

export function updateBadge(count) {
  const badge = document.querySelector('.mn-bell-badge');
  if (!badge) return;
  badge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
  badge.dataset.count = count;
}

export async function refreshUnreadCount() {
  try {
    const { count } = await api.unreadCount();
    updateBadge(count);
  } catch (_) {}
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
