/* match_detail.js — Match detail / live pin page */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { flagImg } from '../components/flag.js';
import { buildMatchCard } from '../components/match_card.js';

let _poller = null;
let _matchId = null;

export async function renderMatchDetail(container, matchId) {
  _matchId = matchId;
  container.innerHTML = '';

  const back = document.createElement('div');
  back.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer;color:var(--mn-pitch-green);font-weight:600;';
  back.innerHTML = `<svg class="mn-back-btn" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>${t('common.back')}`;
  back.addEventListener('click', () => history.back());
  container.appendChild(back);

  const main = document.createElement('div');
  main.id = 'match-detail-main';
  container.appendChild(main);

  await refreshDetail(main, matchId);
  startPoller(main, matchId);
}

export function destroyMatchDetail() {
  if (_poller) clearInterval(_poller);
  _poller = null;
}

async function refreshDetail(container, matchId) {
  let match;
  try {
    match = await api.match(matchId);
  } catch (_) {
    container.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('common.error_generic')}</div></div>`;
    return;
  }
  renderMatchContent(container, match);
}

function renderMatchContent(container, match) {
  const isLive     = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);
  const isFinished = match.status === 'FINISHED';
  const lang       = currentLang();

  const home = match.home || {};
  const away = match.away || {};
  const score = match.score || {};
  const hScore = isLive || isFinished ? (score.home ?? score.ft_home ?? 0) : '–';
  const aScore = isLive || isFinished ? (score.away ?? score.ft_away ?? 0) : '–';

  container.innerHTML = `
    <div class="mn-match-hero" id="match-hero">
      ${isLive ? `<div style="text-align:center;margin-bottom:12px;"><span class="mn-live-ribbon"><span class="mn-live-dot" aria-hidden="true"></span> ${lang === 'he' ? 'שידור חי' : 'LIVE'} ${match.minute ? `· ${match.minute}′` : ''}</span></div>` : ''}
      <div class="mn-hero-teams">
        <div class="mn-hero-team">
          ${flagImg(home.fifa, 'lg')}
          <div class="mn-hero-name">${lang === 'he' ? (home.name_he || home.name_en) : (home.name_en || home.name_he)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div class="mn-hero-score mn-tabular" id="hero-score">
            <span id="score-home">${hScore}</span>
            <span class="mn-hero-sep">–</span>
            <span id="score-away">${aScore}</span>
          </div>
          ${isFinished ? `<span class="mn-status-pill ft">${t('matches.full_time')}</span>` : ''}
          ${match.status === 'PAUSED' ? `<span class="mn-status-pill ht">${t('matches.halftime')}</span>` : ''}
          ${score.pen_home != null ? `<span class="mn-status-pill pens">${score.pen_home}–${score.pen_away} ${t('matches.penalties')}</span>` : ''}
        </div>
        <div class="mn-hero-team">
          ${flagImg(away.fifa, 'lg')}
          <div class="mn-hero-name">${lang === 'he' ? (away.name_he || away.name_en) : (away.name_en || away.name_he)}</div>
        </div>
      </div>
      <div style="text-align:center;font-size:var(--mn-fs-xs);color:var(--mn-ink-soft);margin-top:12px;">
        ${match.city ? `${match.city}` : ''}${match.venue ? ` · ${match.venue}` : ''}
      </div>
    </div>

    <div class="mn-tabs" id="detail-tabs">
      <button class="mn-tab active" data-tab="events">${t('matches.events')}</button>
      <button class="mn-tab" data-tab="lineups">${t('matches.lineups')}</button>
      <button class="mn-tab" data-tab="stats">${t('matches.stats')}</button>
    </div>

    <div id="detail-tab-content"></div>
  `;

  // Tab switching
  container.querySelectorAll('.mn-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.mn-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTabContent(container.querySelector('#detail-tab-content'), tab.dataset.tab, match);
    });
  });

  // Initial tab
  renderTabContent(container.querySelector('#detail-tab-content'), 'events', match);

  // Pin button (sticky at bottom)
  container.appendChild(buildPinBottom(match._id || match.id));
}

function renderTabContent(el, tab, match) {
  if (tab === 'events') {
    const events = match.events || [];
    if (!events.length) {
      el.innerHTML = `<div class="mn-empty"><div class="mn-empty-title">${t('matches.no_events_yet')}</div></div>`;
      return;
    }
    el.innerHTML = events.map(ev => `
      <div class="mn-event-item">
        <span class="mn-event-min">${ev.minute}′</span>
        <span class="mn-event-icon">${eventIcon(ev.type)}</span>
        <span class="mn-event-desc ${eventClass(ev.type)}">${eventLabel(ev)}</span>
      </div>
    `).join('');
  } else {
    el.innerHTML = `<div class="mn-empty" style="padding:32px;"><div class="mn-empty-title" style="color:var(--mn-ink-soft);">${t('matches.no_events_yet')}</div></div>`;
  }
}

function eventLabel(ev) {
  const lang = currentLang();
  const key = `events.${(ev.type || '').toLowerCase()}`;
  const label = t(key);
  return ev.scorer ? `${label} — ${ev.scorer}` : label;
}

function eventIcon(type) {
  const icons = {
    GOAL:           '⚽',
    OWN_GOAL:       '⚽',
    PENALTY_SCORED: '⚽',
    PENALTY_MISSED: '✗',
    YELLOW_CARD:    '🟨',
    RED_CARD:       '🟥',
    SECOND_YELLOW:  '🟨',
    SUBSTITUTION:   '🔄',
  };
  return icons[type] || '•';
}

function eventClass(type) {
  if (type === 'GOAL' || type === 'PENALTY_SCORED' || type === 'OWN_GOAL') return 'mn-event-goal';
  if (type === 'RED_CARD') return 'mn-event-red';
  if (type === 'YELLOW_CARD' || type === 'SECOND_YELLOW') return 'mn-event-yellow';
  return '';
}

function buildPinBottom(matchId) {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:sticky;bottom:calc(64px + env(safe-area-inset-bottom));padding:16px;background:var(--mn-paper);border-top:1px solid var(--mn-line);display:flex;gap:12px;';
  bar.id = 'pin-bottom-bar';

  const pinBtn = document.createElement('button');
  pinBtn.className = 'btn-primary';
  pinBtn.style.flex = '1';
  pinBtn.textContent = t('matches.pin_match');
  pinBtn.addEventListener('click', async () => {
    try {
      const res = await api.pinMatch(matchId);
      pinBtn.textContent = res.pinned ? t('matches.unpin_match') : t('matches.pin_match');
    } catch (_) {}
  });
  bar.appendChild(pinBtn);
  return bar;
}

function startPoller(container, matchId) {
  if (_poller) clearInterval(_poller);
  _poller = setInterval(async () => {
    if (document.hidden) return;
    try {
      const match = await api.match(matchId);
      const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);
      if (!isLive) { clearInterval(_poller); return; }
      const sh = document.getElementById('score-home');
      const sa = document.getElementById('score-away');
      const score = match.score || {};
      if (sh) sh.textContent = score.home ?? 0;
      if (sa) sa.textContent = score.away ?? 0;
    } catch (_) {}
  }, 15000);
}
