/* leaderboard.js — Leaderboard view */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';

export async function renderLeaderboardView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  container.appendChild(page);

  const title = document.createElement('h1');
  title.className = 'mn-page-title';
  title.textContent = t('leaderboard.title');
  page.appendChild(title);

  // Group selector
  let groups;
  try {
    groups = await api.groups();
  } catch (_) {
    page.innerHTML += `<div class="mn-empty"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }

  if (!groups || groups.length === 0) {
    page.appendChild(buildNoGroupsState());
    return;
  }

  if (groups.length > 1) {
    const sel = document.createElement('div');
    sel.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;';
    groups.forEach((g, i) => {
      const btn = document.createElement('button');
      btn.className = `btn-${i === 0 ? 'primary' : 'secondary'}`;
      btn.style.fontSize = 'var(--mn-fs-xs)';
      btn.textContent = g.name;
      btn.addEventListener('click', () => {
        page.querySelector('#lb-content')?.remove();
        loadLeaderboard(page, g);
        sel.querySelectorAll('button').forEach((b, j) => {
          b.className = `btn-${j === i ? 'primary' : 'secondary'}`;
          b.style.fontSize = 'var(--mn-fs-xs)';
        });
      });
      sel.appendChild(btn);
    });
    page.appendChild(sel);
  }

  await loadLeaderboard(page, groups[0]);
}

async function loadLeaderboard(page, group) {
  const existing = page.querySelector('#lb-content');
  if (existing) existing.remove();

  const content = document.createElement('div');
  content.id = 'lb-content';
  content.innerHTML = `
    <div class="mn-skeleton" style="height:40px;margin-bottom:6px;"></div>
    <div class="mn-skeleton" style="height:40px;margin-bottom:6px;"></div>
    <div class="mn-skeleton" style="height:40px;"></div>
  `;
  page.appendChild(content);

  let rows;
  try {
    rows = await api.leaderboard(group.id);
  } catch (_) {
    content.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }

  content.innerHTML = '';

  if (!rows || rows.length === 0) {
    content.innerHTML = `
      <div class="mn-empty">
        <div class="mn-empty-title">${t('leaderboard.no_data_yet')}</div>
        <div class="mn-empty-sub">${t('leaderboard.tiebreaker_note')}</div>
      </div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'mn-leaderboard-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('leaderboard.rank')}</th>
        <th>${t('leaderboard.player')}</th>
        <th style="text-align:center;">${t('leaderboard.predictions_made')}</th>
        <th style="text-align:center;">${t('leaderboard.exact')}</th>
        <th style="text-align:center;">${t('leaderboard.correct')}</th>
        <th style="text-align:end;">${t('leaderboard.total_points')}</th>
      </tr>
    </thead>
    <tbody id="lb-tbody"></tbody>
  `;

  const tbody = table.querySelector('#lb-tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (row.is_me) tr.classList.add('mn-me-row');
    tr.innerHTML = `
      <td class="mn-lb-rank">${row.rank}</td>
      <td>
        <div class="mn-lb-player">
          ${row.picture ? `<img src="${row.picture}" class="mn-lb-avatar" alt="">` : `<div class="mn-avatar-placeholder">${(row.name||'?')[0]}</div>`}
          <span class="mn-lb-name">${escapeHtml(row.name)}${row.is_me ? ` <span class="mn-you-badge">${t('leaderboard.you_label')}</span>` : ''}</span>
        </div>
      </td>
      <td style="text-align:center;">${row.count}</td>
      <td style="text-align:center;">${row.exact}</td>
      <td style="text-align:center;">${row.correct}</td>
      <td class="mn-lb-total" style="text-align:end;">${row.total}</td>
    `;
    tbody.appendChild(tr);
  });

  content.appendChild(table);

  const note = document.createElement('div');
  note.style.cssText = 'font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);margin-top:12px;text-align:center;';
  note.textContent = t('leaderboard.tiebreaker_note');
  content.appendChild(note);
}

function buildNoGroupsState() {
  const div = document.createElement('div');
  div.className = 'mn-empty';
  div.innerHTML = `
    <div class="mn-empty-title">${t('groups.no_groups_yet')}</div>
    <div class="mn-empty-sub">${t('groups.no_groups_cta')}</div>
  `;
  return div;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
