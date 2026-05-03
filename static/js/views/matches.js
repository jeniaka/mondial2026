/* matches.js — Matches feed view (Score365-style) */

import { t, currentLang } from '../i18n.js';
import { api, showToast } from '../api.js';
import { buildMatchCard } from '../components/match_card.js';

let _pinnedIds = new Set();
let _livePoller = null;

export async function renderMatchesView(container) {
  container.innerHTML = '';

  // Day strip
  const strip = buildDayStrip();
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

  await loadDay(feed, 'today');
  startLivePoller(feed);
}

export function destroyMatchesView() {
  if (_livePoller) clearInterval(_livePoller);
  _livePoller = null;
}

function buildDayStrip() {
  const strip = document.createElement('div');
  strip.className = 'mn-day-strip';
  strip.id = 'day-strip';

  const today = new Date();
  const days = [];
  for (let i = -7; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ date: d, offset: i });
  }

  days.forEach(({ date, offset }) => {
    const chip = document.createElement('button');
    chip.className = `mn-day-chip${offset === 0 ? ' active' : ''}`;
    chip.dataset.offset = offset;
    chip.textContent = formatDayLabel(date, offset);
    chip.addEventListener('click', async () => {
      document.querySelectorAll('.mn-day-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const feed = document.getElementById('matches-feed');
      if (feed) await loadDay(feed, dayKey(offset, date));
    });
    strip.appendChild(chip);
  });

  // Scroll today into center
  setTimeout(() => {
    const active = strip.querySelector('.mn-day-chip.active');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 50);

  return strip;
}

function formatDayLabel(date, offset) {
  const lang = currentLang();
  if (offset === 0) return t('common.today');
  if (offset === 1) return t('common.tomorrow');
  if (offset === -1) return t('common.yesterday');
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', opts);
}

function dayKey(offset, date) {
  if (offset === 0) return 'today';
  if (offset === 1) return 'tomorrow';
  if (offset === -1) return 'yesterday';
  return date.toISOString().slice(0, 10);
}

async function loadDay(feed, dayKey) {
  feed.innerHTML = `
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;margin-bottom:10px;"></div>
    <div class="mn-skeleton" style="height:80px;"></div>
  `;

  let matches;
  try {
    if (['today', 'yesterday', 'tomorrow'].includes(dayKey)) {
      matches = await api.matchesDay(dayKey);
    } else {
      const from = dayKey + 'T00:00:00';
      const to   = dayKey + 'T23:59:59';
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
    const key = m.stage || 'OTHER';
    if (!byStage[key]) byStage[key] = [];
    byStage[key].push(m);
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
  // Optimistic update
  _pinnedIds[shouldPin ? 'add' : 'delete'](matchId);
  const btn = card.querySelector('.mn-pin-btn');
  if (btn) {
    btn.classList.toggle('pinned', shouldPin);
    btn.setAttribute('aria-label', shouldPin ? t('matches.unpin_match') : t('matches.pin_match'));
  }
  try {
    await api.pinMatch(matchId);
  } catch (_) {
    // Revert optimistic
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
      // Update live cards in place
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
