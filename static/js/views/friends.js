/* friends.js — Friends / groups view */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { openModal } from '../components/modal.js';

export async function renderFriendsView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  container.appendChild(page);

  // Header row
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
  const list = document.getElementById('groups-list') || createGroupsList(page);

  list.innerHTML = `
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;"></div>
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

  groups.forEach(g => {
    const card = buildGroupCard(g);
    list.appendChild(card);
  });
}

function createGroupsList(page) {
  const list = document.createElement('div');
  list.id = 'groups-list';
  page.appendChild(list);
  return list;
}

function buildGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'mn-group-card';
  card.innerHTML = `
    <div class="mn-group-name">${escapeHtml(group.name)}</div>
    <div class="mn-group-meta">
      <span>${t('groups.members')}: ${group.member_count}</span>
      <span class="mn-join-code">${group.join_code}</span>
      ${group.is_owner ? `<span style="color:var(--mn-pitch-green);font-weight:700;">${t('groups.owner')}</span>` : ''}
    </div>
  `;
  card.addEventListener('click', () => openGroupDetail(group));
  return card;
}

function openGroupDetail(group) {
  const body = document.createElement('div');

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);font-weight:700;margin-bottom:4px;">${t('groups.join_code')}</div>
      <div class="mn-join-code" style="font-size:var(--mn-fs-md);">${group.join_code}</div>
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

  const { close, el } = openModal({
    title: group.name,
    body,
  });

  // Load members
  api.groupGet(group.id).then(full => {
    const membersDiv = el.querySelector('#group-detail-members');
    if (!full || !full.members) return;
    membersDiv.innerHTML = `<div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);font-weight:700;margin-bottom:8px;">${t('groups.members')}</div>`;
    full.members.forEach(m => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;';
      row.innerHTML = `
        ${m.picture ? `<img src="${m.picture}" class="mn-lb-avatar" alt="">` : `<div class="mn-avatar-placeholder">${(m.name||'?')[0]}</div>`}
        <span style="flex:1;font-size:var(--mn-fs-sm);font-weight:600;">${escapeHtml(m.name)}</span>
        <span style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);">${m.role === 'owner' ? t('groups.owner') : ''}</span>
      `;
      membersDiv.appendChild(row);
    });
  }).catch(() => {});

  // Share link / copy
  el.querySelector('#share-link-btn').addEventListener('click', async () => {
    const btn = el.querySelector('#share-link-btn');
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, url: shareUrl });
      } catch (_) {}
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
    if (!email || !email.includes('@')) {
      status.textContent = t('errors.score_invalid');
      return;
    }
    const btn = el.querySelector('#invite-send-btn');
    btn.disabled = true;
    try {
      await api.groupInvite(group.id, email);
      status.style.color = 'var(--mn-green)';
      status.textContent = t('groups.invite_sent');
      emailInput.value = '';
    } catch (err) {
      status.style.color = 'var(--mn-red)';
      status.textContent = t('common.error_generic');
    } finally {
      btn.disabled = false;
    }
  });
}

function openJoinByCode(page) {
  const body = document.createElement('div');
  body.innerHTML = `
    <label style="display:block;font-weight:700;margin-bottom:6px;">${t('groups.join_code')}</label>
    <input type="text" class="mn-input" id="join-code-input"
      placeholder="ABCD12" maxlength="6"
      style="text-transform:uppercase;letter-spacing:0.1em;font-weight:700;font-size:var(--mn-fs-lg);">
    <div id="join-code-error" style="font-size:var(--mn-fs-xs);color:var(--mn-red);margin-top:6px;min-height:1em;"></div>
  `;

  const { close, el } = openModal({
    title: t('groups.join_group'),
    body,
    actions: [
      { label: t('common.cancel'), close: true },
      {
        label: t('groups.join_group'),
        primary: true,
        close: false,
        action: async () => {
          const input = el.querySelector('#join-code-input');
          const errEl = el.querySelector('#join-code-error');
          const code = input.value.trim().toUpperCase();
          if (code.length !== 6) {
            errEl.textContent = t('errors.group_not_found');
            return;
          }
          errEl.textContent = '';
          try {
            const res = await api.groupJoinByCode(code);
            close();
            showToast(res.already_member ? t('groups.my_groups') : t('groups.invite_sent'));
            const list = document.getElementById('groups-list');
            if (list) await loadGroups(page);
          } catch (err) {
            errEl.textContent = err.status === 404
              ? t('errors.group_not_found')
              : t('common.error_generic');
          }
        }
      }
    ]
  });

  el.querySelector('#join-code-input').focus();
}


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
      {
        label: t('groups.create_group'),
        primary: true,
        close: false,
        action: async () => {
          const name = el.querySelector('#new-group-name').value.trim();
          if (!name) return;
          try {
            await api.groupCreate(name);
            close();
            showToast(t('groups.invite_sent'));
            const list = document.getElementById('groups-list');
            if (list) await loadGroups(page);
          } catch (_) {
            showToast(t('common.error_generic'));
          }
        }
      }
    ]
  });

  el.querySelector('#new-group-name').focus();
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
