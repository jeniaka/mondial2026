/* friends.js — Friends / groups view */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { openModal } from '../components/modal.js';

export async function renderFriendsView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  container.appendChild(page);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;';

  const title = document.createElement('h1');
  title.className = 'mn-page-title';
  title.style.marginBottom = '0';
  title.textContent = t('groups.my_groups');

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  const joinBtn = document.createElement('button');
  joinBtn.className = 'btn-secondary';
  joinBtn.textContent = t('groups.join_group');
  joinBtn.addEventListener('click', () => openJoinByCode(page));

  const createBtn = document.createElement('button');
  createBtn.className = 'btn-primary';
  createBtn.textContent = t('groups.create_group');
  createBtn.addEventListener('click', () => openCreateGroup(page));

  btnRow.appendChild(joinBtn);
  btnRow.appendChild(createBtn);
  header.appendChild(title);
  header.appendChild(btnRow);
  page.appendChild(header);

  await loadGroups(page);
}

async function loadGroups(page) {
  let list = document.getElementById('groups-list');
  if (!list) {
    list = document.createElement('div');
    list.id = 'groups-list';
    page.appendChild(list);
  }

  list.innerHTML = `
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;border-radius:var(--mn-r-md);"></div>
    <div class="mn-skeleton" style="height:80px;border-radius:var(--mn-r-md);"></div>
  `;

  let groups;
  try {
    groups = await api.groups();
  } catch (_) {
    list.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }

  list.innerHTML = '';
  if (!groups || groups.length === 0) {
    list.innerHTML = `
      <div class="mn-empty">
        <div class="mn-empty-title">${t('groups.no_groups_yet')}</div>
        <div class="mn-empty-sub">${t('groups.no_groups_cta')}</div>
      </div>
    `;
    return;
  }

  groups.forEach(g => list.appendChild(buildGroupCard(g, page)));
}

function buildGroupCard(group, page) {
  const card = document.createElement('div');
  card.className = 'mn-group-card';
  card.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;';
  card.innerHTML = `
    <div style="flex:1;min-width:0;">
      <div class="mn-group-name">${escapeHtml(group.name)}</div>
      <div class="mn-group-meta">
        <span>${t('groups.members')}: ${group.member_count}</span>
        <span class="mn-join-code">${group.join_code}</span>
        ${group.is_owner ? `<span style="color:var(--mn-pitch-green);font-weight:700;">${t('groups.owner')}</span>` : ''}
        ${group.muted ? `<span style="color:var(--mn-ink-soft);font-size:10px;">🔕</span>` : ''}
      </div>
    </div>
    <button class="mn-manage-btn" aria-label="${t('groups.manage')}" title="${t('groups.manage')}"
      style="flex-shrink:0;width:36px;height:36px;border-radius:var(--mn-r-sm);border:none;background:none;color:var(--mn-ink-soft);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 120ms;">
      ${gearSvg()}
    </button>
  `;

  const mainArea = card.querySelector('div');
  mainArea.addEventListener('click', () => openGroupDetail(group, page));

  const gearBtn = card.querySelector('.mn-manage-btn');
  gearBtn.addEventListener('mouseover', () => { gearBtn.style.background = 'rgba(139,148,158,0.12)'; });
  gearBtn.addEventListener('mouseout',  () => { gearBtn.style.background = 'none'; });
  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openManageModal(group, page);
  });

  return card;
}

// ---------------------------------------------------------------------------
// Group detail modal (members + invite)
// ---------------------------------------------------------------------------

function openGroupDetail(group, page) {
  const body = document.createElement('div');

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);font-weight:700;margin-bottom:4px;">${t('groups.join_code')}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="mn-join-code" style="font-size:var(--mn-fs-md);" id="detail-join-code">${group.join_code}</span>
      </div>
    </div>
    <div id="group-detail-members" style="margin-bottom:16px;">
      <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);font-weight:700;margin-bottom:8px;">${t('groups.members')}</div>
      <div class="mn-skeleton" style="height:40px;"></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--mn-line);margin:16px 0;">
  `;

  const inviteSection = document.createElement('div');
  const shareUrl = `${location.origin}/?join=${group.join_code}`;
  inviteSection.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px;">${t('groups.invite_friends')}</div>
    <button class="btn-secondary" id="share-link-btn" style="width:100%;margin-bottom:12px;">
      🔗 ${t('groups.copy_invite_link')}
    </button>
    <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);margin-bottom:12px;text-align:center;">${t('groups.or_invite_by_email')}</div>
    <div style="display:flex;gap:8px;">
      <input type="email" class="mn-input" id="invite-email-input" placeholder="email@example.com" style="flex:1;">
      <button class="btn-primary" id="invite-send-btn">${t('common.send')}</button>
    </div>
    <div id="invite-status" style="font-size:var(--mn-fs-xs);margin-top:8px;color:var(--mn-ink-soft);"></div>
  `;
  body.appendChild(inviteSection);

  const { close, el } = openModal({ title: group.name, body });

  // Load members
  api.groupGet(group.id).then(full => {
    const membersDiv = el.querySelector('#group-detail-members');
    if (!full?.members) return;
    membersDiv.innerHTML = `<div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);font-weight:700;margin-bottom:8px;">${t('groups.members')}</div>`;
    full.members.forEach(m => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;';
      row.innerHTML = `
        ${m.picture ? `<img src="${escapeHtml(m.picture)}" class="mn-lb-avatar" alt="">` : `<div class="mn-avatar-placeholder">${(m.name || '?')[0].toUpperCase()}</div>`}
        <span style="flex:1;font-size:var(--mn-fs-sm);font-weight:600;">${escapeHtml(m.name)}</span>
        <span style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);">${m.role === 'owner' ? t('groups.owner') : ''}</span>
      `;
      membersDiv.appendChild(row);
    });
  }).catch(() => {});

  // Share / copy
  el.querySelector('#share-link-btn').addEventListener('click', async () => {
    const btn = el.querySelector('#share-link-btn');
    if (navigator.share) {
      try { await navigator.share({ title: group.name, url: shareUrl }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        btn.textContent = `✓ ${t('common.copied')}`;
        setTimeout(() => { btn.innerHTML = `🔗 ${t('groups.copy_invite_link')}`; }, 2000);
      } catch (_) {}
    }
  });

  // Invite send
  el.querySelector('#invite-send-btn').addEventListener('click', async () => {
    const emailInput = el.querySelector('#invite-email-input');
    const status = el.querySelector('#invite-status');
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) { status.textContent = t('errors.score_invalid'); return; }
    const btn = el.querySelector('#invite-send-btn');
    btn.disabled = true;
    try {
      await api.groupInvite(group.id, email);
      status.style.color = 'var(--mn-pitch-green)';
      status.textContent = t('groups.invite_sent');
      emailInput.value = '';
    } catch (_) {
      status.style.color = 'var(--mn-card-red)';
      status.textContent = t('common.error_generic');
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Management modal
// ---------------------------------------------------------------------------

function openManageModal(group, page) {
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  const muteLabel = group.muted ? t('groups.unmute') : t('groups.mute');

  // Shared actions (all members)
  const sharedActions = [
    { label: `📊 ${t('groups.stats')}`,   action: () => openStatsModal(group) },
    { label: `${group.muted ? '🔔' : '🔕'} ${muteLabel}`, action: () => doMute(group, page) },
    { label: `🚪 ${t('groups.leave_group')}`, danger: true, action: () => doLeave(group, page) },
  ];

  // Owner-only actions
  const ownerActions = group.is_owner ? [
    { label: `✏️ ${t('groups.rename')}`,          action: () => openRenameModal(group, page) },
    { label: `🔑 ${t('groups.regenerate_code')}`, action: () => doRegenCode(group, page) },
    { label: `🔁 ${t('groups.transfer')}`,         action: () => openTransferModal(group, page) },
    { label: `🗑 ${t('groups.reset_predictions')}`,danger: true, action: () => doReset(group, page) },
    { label: `❌ ${t('groups.delete_group')}`,     danger: true, action: () => doDelete(group, page) },
  ] : [];

  const allActions = [...ownerActions, ...sharedActions];

  let closeModal;
  allActions.forEach(({ label, danger, action }) => {
    const btn = document.createElement('button');
    btn.style.cssText = `width:100%;padding:12px 14px;border-radius:var(--mn-r-sm);border:none;background:none;text-align:start;font-size:var(--mn-fs-sm);font-weight:600;cursor:pointer;color:${danger ? 'var(--mn-card-red)' : 'var(--mn-ink)'};transition:background 120ms;`;
    btn.textContent = label;
    btn.addEventListener('mouseover', () => { btn.style.background = danger ? 'rgba(214,40,40,0.06)' : 'rgba(139,148,158,0.1)'; });
    btn.addEventListener('mouseout',  () => { btn.style.background = 'none'; });
    btn.addEventListener('click', () => { if (closeModal) closeModal(); action(); });
    body.appendChild(btn);
  });

  const modal = openModal({ title: `${t('groups.manage')}: ${group.name}`, body });
  closeModal = modal.close;
}

// ---------------------------------------------------------------------------
// Owner actions
// ---------------------------------------------------------------------------

function openRenameModal(group, page) {
  const body = document.createElement('div');
  body.innerHTML = `
    <input type="text" class="mn-input" id="rename-input" value="${escapeHtml(group.name)}" maxlength="60" style="width:100%;">
  `;
  const { close, el } = openModal({
    title: t('groups.rename'),
    body,
    actions: [
      { label: t('common.cancel'), close: true },
      { label: t('groups.rename'), primary: true, close: false, action: async () => {
        const name = el.querySelector('#rename-input').value.trim();
        if (!name) return;
        try {
          await api.groupRename(group.id, name);
          group.name = name;
          close();
          showToast(t('groups.rename_saved'));
          loadGroups(document.querySelector('.mn-page') || document.body);
        } catch (_) { showToast(t('common.error_generic')); }
      }},
    ],
  });
  el.querySelector('#rename-input').select();
}

async function doRegenCode(group, page) {
  if (!confirm(t('groups.regenerate_code_confirm'))) return;
  try {
    const res = await api.groupRegenCode(group.id);
    group.join_code = res.join_code;
    showToast(t('groups.code_regenerated'));
    loadGroups(document.querySelector('.mn-page') || document.body);
  } catch (_) { showToast(t('common.error_generic')); }
}

async function doReset(group, page) {
  if (!confirm(t('groups.reset_predictions_confirm'))) return;
  try {
    await api.groupReset(group.id);
    showToast(t('groups.reset_done'));
  } catch (_) { showToast(t('common.error_generic')); }
}

async function doDelete(group, page) {
  const typed = prompt(t('groups.delete_group_confirm'));
  if (typed === null) return;
  if (typed.trim() !== t('groups.delete_group_type')) {
    showToast(t('common.error_generic'));
    return;
  }
  try {
    await api.groupDelete(group.id);
    showToast(t('groups.deleted'));
    loadGroups(document.querySelector('.mn-page') || document.body);
  } catch (_) { showToast(t('common.error_generic')); }
}

function openTransferModal(group, page) {
  const body = document.createElement('div');
  body.innerHTML = `
    <p style="font-size:var(--mn-fs-sm);color:var(--mn-ink-soft);margin-bottom:12px;">${t('groups.transfer_confirm')}</p>
    <div id="transfer-members-list">
      <div class="mn-skeleton" style="height:40px;"></div>
    </div>
  `;
  const { close, el } = openModal({ title: t('groups.transfer'), body });

  api.groupGet(group.id).then(full => {
    const listEl = el.querySelector('#transfer-members-list');
    if (!full?.members) return;
    listEl.innerHTML = '';
    full.members.filter(m => m.role !== 'owner').forEach(m => {
      const btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:var(--mn-r-sm);border:none;background:none;cursor:pointer;font-size:var(--mn-fs-sm);font-weight:600;transition:background 120ms;';
      btn.innerHTML = `
        ${m.picture ? `<img src="${escapeHtml(m.picture)}" class="mn-lb-avatar" alt="">` : `<div class="mn-avatar-placeholder">${(m.name || '?')[0].toUpperCase()}</div>`}
        <span>${escapeHtml(m.name)}</span>
      `;
      btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(139,148,158,0.1)'; });
      btn.addEventListener('mouseout',  () => { btn.style.background = 'none'; });
      btn.addEventListener('click', async () => {
        try {
          await api.groupTransfer(group.id, m.user_id);
          close();
          showToast(t('groups.transferred'));
          loadGroups(document.querySelector('.mn-page') || document.body);
        } catch (_) { showToast(t('common.error_generic')); }
      });
      listEl.appendChild(btn);
    });
    if (!full.members.some(m => m.role !== 'owner')) {
      listEl.textContent = t('groups.members') + ': 1';
    }
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Member actions
// ---------------------------------------------------------------------------

async function doMute(group, page) {
  const newMuted = !group.muted;
  try {
    await api.groupMute(group.id, newMuted);
    group.muted = newMuted;
    showToast(newMuted ? t('groups.muted') : t('groups.unmuted'));
    loadGroups(document.querySelector('.mn-page') || document.body);
  } catch (_) { showToast(t('common.error_generic')); }
}

async function doLeave(group, page) {
  if (!confirm(t('groups.leave_confirm'))) return;
  try {
    await api.groupLeave(group.id);
    showToast(t('groups.leave_group'));
    loadGroups(document.querySelector('.mn-page') || document.body);
  } catch (_) { showToast(t('common.error_generic')); }
}

// ---------------------------------------------------------------------------
// Stats modal
// ---------------------------------------------------------------------------

function openStatsModal(group) {
  const body = document.createElement('div');
  body.innerHTML = `<div class="mn-skeleton" style="height:80px;"></div>`;
  const { el } = openModal({ title: `📊 ${t('groups.stats')}: ${group.name}`, body });

  api.groupStats(group.id).then(s => {
    const lang = currentLang();
    const since = s.created_at
      ? new Date(s.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:var(--mn-grass-light);border-radius:var(--mn-r-md);padding:14px;text-align:center;">
          <div style="font-size:var(--mn-fs-xl);font-weight:800;color:var(--mn-pitch-green);">${s.member_count}</div>
          <div style="font-size:10px;font-weight:600;color:var(--mn-ink-soft);margin-top:2px;">${t('groups.members')}</div>
        </div>
        <div style="background:var(--mn-grass-light);border-radius:var(--mn-r-md);padding:14px;text-align:center;">
          <div style="font-size:var(--mn-fs-xl);font-weight:800;color:var(--mn-pitch-green);">${s.total_predictions}</div>
          <div style="font-size:10px;font-weight:600;color:var(--mn-ink-soft);margin-top:2px;">${t('groups.total_predictions')}</div>
        </div>
        <div style="background:var(--mn-grass-light);border-radius:var(--mn-r-md);padding:14px;text-align:center;">
          <div style="font-size:var(--mn-fs-xl);font-weight:800;color:var(--mn-card-yellow);">${s.exact_predictions}</div>
          <div style="font-size:10px;font-weight:600;color:var(--mn-ink-soft);margin-top:2px;">${t('profile.exact_predictions')}</div>
        </div>
        <div style="background:var(--mn-grass-light);border-radius:var(--mn-r-md);padding:14px;text-align:center;">
          <div style="font-size:var(--mn-fs-xl);font-weight:800;color:var(--mn-ink);">${s.scored_predictions}</div>
          <div style="font-size:10px;font-weight:600;color:var(--mn-ink-soft);margin-top:2px;">${t('leaderboard.predictions_made')}</div>
        </div>
      </div>
      <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);text-align:center;">${t('groups.active_since')}: ${since}</div>
    `;
  }).catch(() => { body.innerHTML = `<div class="mn-empty-title">${t('common.error_generic')}</div>`; });
}

// ---------------------------------------------------------------------------
// Join by code
// ---------------------------------------------------------------------------

function openJoinByCode(page) {
  const body = document.createElement('div');
  body.innerHTML = `
    <label style="display:block;font-weight:700;margin-bottom:6px;">${t('groups.join_code')}</label>
    <input type="text" class="mn-input" id="join-code-input"
      placeholder="ABCD12" maxlength="6"
      style="text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-size:var(--mn-fs-lg);">
    <div id="join-code-error" style="font-size:var(--mn-fs-xs);color:var(--mn-card-red);margin-top:6px;min-height:1em;"></div>
  `;
  const { close, el } = openModal({
    title: t('groups.join_group'),
    body,
    actions: [
      { label: t('common.cancel'), close: true },
      { label: t('groups.join_group'), primary: true, close: false, action: async () => {
        const input = el.querySelector('#join-code-input');
        const errEl = el.querySelector('#join-code-error');
        const code = input.value.trim().toUpperCase();
        if (code.length !== 6) { errEl.textContent = t('errors.group_not_found'); return; }
        errEl.textContent = '';
        try {
          const res = await api.groupJoinByCode(code);
          close();
          showToast(res.already_member ? t('groups.my_groups') : t('groups.invite_sent'));
          loadGroups(page);
        } catch (err) {
          errEl.textContent = err.status === 404 ? t('errors.group_not_found') : t('common.error_generic');
        }
      }},
    ],
  });
  el.querySelector('#join-code-input').focus();
}

// ---------------------------------------------------------------------------
// Create group
// ---------------------------------------------------------------------------

function openCreateGroup(page) {
  const body = document.createElement('div');
  body.innerHTML = `
    <label style="display:block;font-weight:700;margin-bottom:6px;">${t('groups.group_name')}</label>
    <input type="text" class="mn-input" id="new-group-name" placeholder="${t('groups.group_name_placeholder')}" maxlength="60">
  `;
  const { close, el } = openModal({
    title: t('groups.create_group_title'),
    body,
    actions: [
      { label: t('common.cancel'), close: true },
      { label: t('groups.create_group'), primary: true, close: false, action: async () => {
        const name = el.querySelector('#new-group-name').value.trim();
        if (!name) return;
        try {
          await api.groupCreate(name);
          close();
          showToast(t('groups.invite_sent'));
          loadGroups(page);
        } catch (_) { showToast(t('common.error_generic')); }
      }},
    ],
  });
  el.querySelector('#new-group-name').focus();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gearSvg() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
