/* matches.js — Matches feed view (Score365-style) */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { buildMatchCard } from '../components/match_card.js';

const TOURNAMENT_START = new Date('2026-06-11T00:00:00');
const TOURNAMENT_END   = new Date('2026-07-19T00:00:00');

let _pinnedIds = new Set();
let _livePoller = null;

export async function renderMatchesView(container) {
  container.innerHTML = '';

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mode = _tournamentMode(todayMidnight);

  const { strip, selectedDate } = buildDayStrip(todayMidnight, mode);
  container.appendChild(strip);

  const feed = document.createElement('div');
  feed.className = 'mn-page';
  feed.id = 'matches-feed';
  container.appendChild(feed);

  // Load pinned IDs
  try {
    const pinned = await api.matchesPinned();
    _pinnedIds = new Set((pinned || []).map(m => m.id));
  } catch (_) {}

  await loadDay(feed, _loadDayKey(selectedDate, todayMidnight));
  startLivePoller(feed);
}

export function destroyMatchesView() {
  if (_livePoller) clearInterval(_livePoller);
  _livePoller = null;
}

function _tournamentMode(todayMidnight) {
  const start = new Date(TOURNAMENT_START.getFullYear(), TOURNAMENT_START.getMonth(), TOURNAMENT_START.getDate());
  const end   = new Date(TOURNAMENT_END.getFullYear(),   TOURNAMENT_END.getMonth(),   TOURNAMENT_END.getDate());
  if (todayMidnight < start) return 'pre';
  if (todayMidnight > end)   return 'post';
  return 'during';
}

function _isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function _toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function _defaultSelectedDate(mode, todayMidnight) {
  if (mode === 'pre') {
    return new Date(TOURNAMENT_START.getFullYear(), TOURNAMENT_START.getMonth(), TOURNAMENT_START.getDate());
  }
  return new Date(todayMidnight);
}

function _loadDayKey(date, todayMidnight) {
  if (_isSameDay(date, todayMidnight)) return 'today';
  const yesterday = new Date(todayMidnight); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow  = new Date(todayMidnight); tomorrow.setDate(tomorrow.getDate() + 1);
  if (_isSameDay(date, yesterday)) return 'yesterday';
  if (_isSameDay(date, tomorrow))  return 'tomorrow';
  return _toDateStr(date);
}

function buildDayStrip(todayMidnight, mode) {
  const strip = document.createElement('div');
  strip.className = 'mn-day-strip';
  strip.id = 'day-strip';

  const selectedDate = _defaultSelectedDate(mode, todayMidnight);

  // Pre-tournament: show kickoff countdown pill at far left
  if (mode === 'pre') {
    const msLeft = TOURNAMENT_START - todayMidnight;
    const daysLeft = Math.ceil(msLeft / 86400000);
    const pill = document.createElement('div');
    pill.className = 'mn-day-strip-kickoff-pill';
    pill.textContent = t('matches.days_to_kickoff').replace('{n}', daysLeft);
    strip.appendChild(pill);
  }

  // All tournament days with 3-day padding on each side
  const padStart = new Date(2026, 5,  8); // June 8
  const padEnd   = new Date(2026, 6, 22); // July 22

  const days = [];
  for (let d = new Date(padStart); d <= padEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  days.forEach(date => {
    const isSelected = _isSameDay(date, selectedDate);
    const chip = document.createElement('button');
    chip.className = `mn-day-chip${isSelected ? ' active' : ''}`;
    chip.dataset.datestr = _toDateStr(date);
    chip.textContent = _formatDayLabel(date, todayMidnight);
    chip.addEventListener('click', async () => {
      document.querySelectorAll('.mn-day-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const feed = document.getElementById('matches-feed');
      if (feed) await loadDay(feed, _loadDayKey(date, todayMidnight));
    });
    strip.appendChild(chip);
  });

  // Scroll selected chip into center
  setTimeout(() => {
    const active = strip.querySelector('.mn-day-chip.active');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 50);

  return { strip, selectedDate };
}

function _formatDayLabel(date, todayMidnight) {
  const lang = currentLang();
  if (_isSameDay(date, todayMidnight)) return t('common.today');
  const yesterday = new Date(todayMidnight); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow  = new Date(todayMidnight); tomorrow.setDate(tomorrow.getDate() + 1);
  if (_isSameDay(date, yesterday)) return t('common.yesterday');
  if (_isSameDay(date, tomorrow))  return t('common.tomorrow');
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', opts);
}

async function loadDay(feed, key) {
  feed.innerHTML = `
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;"></div>
  `;

  let matches;
  try {
    if (['today', 'yesterday', 'tomorrow'].includes(key)) {
      matches = await api.matchesDay(key);
    } else {
      const from = key + 'T00:00:00';
      const to   = key + 'T23:59:59';
      matches = await api.matchesRange(from, to);
    }
  } catch (_) {
    feed.innerHTML = '';
    renderEmpty(feed, t('common.error_generic'));
    return;
  }

  feed.innerHTML = '';

  if (!matches || matches.length === 0) {
    renderEmpty(feed, t('matches.no_matches_today'));
    return;
  }

  // Group by stage
  const byStage = {};
  matches.forEach(m => {
    const k = m.stage || 'OTHER';
    if (!byStage[k]) byStage[k] = [];
    byStage[k].push(m);
  });

  Object.entries(byStage).forEach(([stage, stageMatches]) => {
    const section = document.createElement('div');
    section.style.marginBottom = '20px';

    stageMatches.forEach((m, idx) => {
      const card = buildMatchCard(m, {
        pinned: _pinnedIds.has(m.id),
        onPin:  (id, pin) => handlePin(id, pin, card, m),
        onClick: (id) => { window.location.hash = `#/match/${id}`; },
      });
      card.style.animationDelay = `${idx * 30}ms`;
      section.appendChild(card);
    });

    feed.appendChild(section);
  });
}

async function handlePin(matchId, shouldPin, card, match) {
  _pinnedIds[shouldPin ? 'add' : 'delete'](matchId);
  const btn = card.querySelector('.mn-pin-btn');
  if (btn) {
    btn.classList.toggle('pinned', shouldPin);
    btn.setAttribute('aria-label', shouldPin ? t('matches.unpin_match') : t('matches.pin_match'));
  }
  try {
    await api.pinMatch(matchId);
  } catch (_) {
    _pinnedIds[shouldPin ? 'delete' : 'add'](matchId);
    if (btn) btn.classList.toggle('pinned', !shouldPin);
  }
}

function startLivePoller(feed) {
  if (_livePoller) clearInterval(_livePoller);
  _livePoller = setInterval(async () => {
    if (document.hidden) return;
    try {
      const live = await api.matchesLive();
      (live || []).forEach(liveMatch => {
        const existing = feed.querySelector(`[data-match-id="${liveMatch.id}"]`);
        if (existing) {
          const homeScoreEl = existing.querySelectorAll('.mn-score')[0];
          const awayScoreEl = existing.querySelectorAll('.mn-score')[1];
          const newHome = liveMatch.score?.home ?? 0;
          const newAway = liveMatch.score?.away ?? 0;
          if (homeScoreEl && homeScoreEl.textContent != newHome) {
            homeScoreEl.textContent = newHome;
            homeScoreEl.classList.add('updated');
            setTimeout(() => homeScoreEl.classList.remove('updated'), 500);
          }
          if (awayScoreEl && awayScoreEl.textContent != newAway) {
            awayScoreEl.textContent = newAway;
            awayScoreEl.classList.add('updated');
            setTimeout(() => awayScoreEl.classList.remove('updated'), 500);
          }
        }
      });
    } catch (_) {}
  }, 30000);
}

function renderEmpty(container, msg) {
  const div = document.createElement('div');
  div.className = 'mn-empty';
  div.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    <div class="mn-empty-title">${msg}</div>
  `;
  container.appendChild(div);
}
