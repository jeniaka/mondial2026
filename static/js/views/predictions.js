/* predictions.js — Prediction pool view */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { flagImg } from '../components/flag.js';
import { openModal } from '../components/modal.js';
import { createCountdown } from '../components/countdown.js';

export async function renderPredictionsView(container) {
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'mn-page';
  container.appendChild(page);

  const title = document.createElement('h1');
  title.className = 'mn-page-title';
  title.textContent = t('nav.pool');
  page.appendChild(title);

  // Load groups
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

  // Show first group's predictions by default
  const groupSel = document.createElement('div');
  groupSel.style.cssText = 'margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;';
  groups.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.className = `btn-${i === 0 ? 'primary' : 'secondary'}`;
    btn.style.fontSize = 'var(--mn-fs-xs)';
    btn.textContent = g.name;
    btn.addEventListener('click', () => {
      page.querySelectorAll('.mn-pred-group-panel').forEach(p => p.remove());
      loadGroupPredictions(page, g);
      groupSel.querySelectorAll('button').forEach((b, j) => {
        b.className = `btn-${j === i ? 'primary' : 'secondary'}`;
        b.style.fontSize = 'var(--mn-fs-xs)';
      });
    });
    groupSel.appendChild(btn);
  });
  page.appendChild(groupSel);

  await loadGroupPredictions(page, groups[0]);
}

async function loadGroupPredictions(page, group) {
  const panel = document.createElement('div');
  panel.className = 'mn-pred-group-panel';
  page.appendChild(panel);

  panel.innerHTML = `
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
  `;

  let matches;
  try {
    matches = await api.matchesDay('today');
  } catch (_) {
    panel.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }

  let myPreds;
  try {
    myPreds = await api.myPredictions(group.id);
  } catch (_) {
    myPreds = [];
  }
  const predMap = {};
  (myPreds || []).forEach(p => { predMap[p.match_id] = p; });

  panel.innerHTML = '';
  if (!matches || matches.length === 0) {
    panel.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('matches.no_matches_today')}</div></div>`;
    return;
  }

  matches.forEach(m => {
    const isLocked = ['IN_PLAY', 'PAUSED', 'LIVE', 'FINISHED'].includes(m.status);
    const myPred = predMap[m.id];
    const card = buildPredictionRow(m, group, myPred, isLocked, panel);
    panel.appendChild(card);
  });
}

function buildPredictionRow(match, group, myPred, isLocked, panel) {
  const lang = currentLang();
  const home = match.home || {};
  const away = match.away || {};

  const row = document.createElement('div');
  row.className = 'mn-prediction-widget';

  const teamLine = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:var(--mn-fs-sm);">
        ${flagImg(home.fifa, 'sm')} ${lang === 'he' ? (home.name_he || home.name_en) : (home.name_en || home.name_he)}
      </div>
      <div style="font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);">
        ${t('matches.vs')}
      </div>
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:var(--mn-fs-sm);">
        ${lang === 'he' ? (away.name_he || away.name_en) : (away.name_en || away.name_he)} ${flagImg(away.fifa, 'sm')}
      </div>
    </div>
  `;

  if (isLocked) {
    row.innerHTML = teamLine + `
      <div class="mn-pred-locked-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        ${t('predictions.locked')}
        ${myPred ? ` · ${myPred.home_score}–${myPred.away_score}` : ''}
        ${myPred?.points_awarded != null ? ` · ${formatPoints(myPred.points_awarded)}` : ''}
      </div>
    `;
    return row;
  }

  const kickoff = match.kickoff_utc;
  const countdown = kickoff ? createCountdown(kickoff, () => {
    row.innerHTML = teamLine + `<div class="mn-pred-locked-banner">${t('predictions.locked')}</div>`;
  }) : null;

  const hVal = myPred?.home_score ?? 0;
  const aVal = myPred?.away_score ?? 0;

  row.innerHTML = teamLine + `
    <div class="mn-pred-title">${t('predictions.your_prediction')}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:12px;" id="stepper-${match.id}">
      <div class="mn-stepper-controls">
        <button class="mn-stepper-btn" data-target="home" data-delta="-1" aria-label="−">−</button>
        <span class="mn-stepper-val" id="home-val-${match.id}">${hVal}</span>
        <button class="mn-stepper-btn" data-target="home" data-delta="1" aria-label="+">+</button>
      </div>
      <span style="font-size:var(--mn-fs-lg);color:var(--mn-line);">–</span>
      <div class="mn-stepper-controls">
        <button class="mn-stepper-btn" data-target="away" data-delta="-1" aria-label="−">−</button>
        <span class="mn-stepper-val" id="away-val-${match.id}">${aVal}</span>
        <button class="mn-stepper-btn" data-target="away" data-delta="1" aria-label="+">+</button>
      </div>
    </div>
    ${countdown ? `<div class="mn-pred-lock-notice" id="countdown-${match.id}"></div>` : ''}
    <button class="btn-primary" style="width:100%;" id="submit-${match.id}">${myPred ? t('predictions.edit') : t('predictions.submit')}</button>
    <div id="pred-status-${match.id}" style="text-align:center;font-size:var(--mn-fs-xs);margin-top:8px;"></div>
  `;

  if (countdown) {
    const cd = row.querySelector(`#countdown-${match.id}`);
    if (cd) cd.appendChild(countdown);
  }

  // Stepper logic
  let hScore = hVal;
  let aScore = aVal;
  row.querySelectorAll('.mn-stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const delta = parseInt(btn.dataset.delta);
      if (target === 'home') {
        hScore = Math.max(0, Math.min(15, hScore + delta));
        row.querySelector(`#home-val-${match.id}`).textContent = hScore;
      } else {
        aScore = Math.max(0, Math.min(15, aScore + delta));
        row.querySelector(`#away-val-${match.id}`).textContent = aScore;
      }
    });
  });

  row.querySelector(`#submit-${match.id}`).addEventListener('click', async () => {
    const status = row.querySelector(`#pred-status-${match.id}`);
    const btn = row.querySelector(`#submit-${match.id}`);
    btn.disabled = true;
    try {
      await api.submitPrediction(group.id, match.id, { home_score: hScore, away_score: aScore });
      status.style.color = 'var(--mn-green)';
      status.textContent = t('predictions.submitted');
      btn.textContent = t('predictions.edit');
    } catch (err) {
      status.style.color = 'var(--mn-red)';
      if (err.status === 423) {
        status.textContent = t('errors.match_locked');
      } else {
        status.textContent = t('common.error_generic');
      }
    } finally {
      btn.disabled = false;
    }
  });

  return row;
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

function formatPoints(pts) {
  if (pts === 0) return t('predictions.no_points');
  if (pts === 1) return t('predictions.one_point');
  return t('predictions.points', { n: pts });
}
