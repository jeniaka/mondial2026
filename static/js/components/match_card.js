/* match_card.js — Match card component */

import { t, currentLang } from '../i18n.js';
import { flagImg } from './flag.js';

const STAGE_KEYS = {
  GROUP_STAGE:    (g) => t('matches.stage_group', { group: g || '' }),
  LAST_16:        ()  => t('matches.stage_round_of_16'),
  QUARTER_FINALS: ()  => t('matches.stage_quarter'),
  SEMI_FINALS:    ()  => t('matches.stage_semi'),
  FINAL:          ()  => t('matches.stage_final'),
  THIRD_PLACE:    ()  => t('matches.stage_third_place'),
  ROUND_OF_32:    ()  => 'Round of 32',
};

function formatKickoff(utcStr) {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  const lang = currentLang();
  const opts = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem', hour12: false };
  return d.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-GB', opts);
}

function stageLabel(match) {
  const fn = STAGE_KEYS[match.stage];
  if (!fn) return match.stage || '';
  return fn(match.group);
}

function scoreDisplay(match) {
  const { score, status } = match;
  if (!score) return '';
  const isLive     = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(status);
  const isFinished = status === 'FINISHED';
  const isHT       = status === 'PAUSED';
  if (!isLive && !isFinished) return '';
  const h = score.home ?? score.ft_home ?? 0;
  const a = score.away ?? score.ft_away ?? 0;
  let s = `${h} – ${a}`;
  if (isHT) s += ` (${t('matches.halftime')})`;
  if (isFinished && score.pen_home != null) s += ` (${score.pen_home}–${score.pen_away} ${t('matches.penalties')})`;
  return s;
}

/**
 * Build a match card DOM element.
 * @param {Object} match
 * @param {Object} opts
 * @param {boolean} opts.pinned
 * @param {Function} opts.onPin
 * @param {Function} opts.onClick
 */
export function buildMatchCard(match, { pinned = false, onPin, onClick } = {}) {
  const isLive     = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status);
  const isFinished = match.status === 'FINISHED';

  const card = document.createElement('div');
  card.className = `mn-match-card${isLive ? ' live' : ''}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.dataset.matchId = match.id;

  // ---- Header row ----
  const header = document.createElement('div');
  header.className = 'mn-card-header';

  const leftLabel = document.createElement('div');
  if (isLive) {
    leftLabel.innerHTML = `
      <span class="mn-live-ribbon">
        <span class="mn-live-dot" aria-hidden="true"></span>
        ${currentLang() === 'he' ? 'שידור חי' : 'LIVE'}
        ${match.minute ? ` · ${match.minute}′` : ''}
      </span>`;
  } else {
    const stage = stageLabel(match);
    const time  = match.kickoff_utc ? formatKickoff(match.kickoff_utc) : '';
    leftLabel.innerHTML = `<span>${stage}${time ? ` · <bdi>${time}</bdi>` : ''}</span>`;
    leftLabel.style.fontSize = 'var(--mn-fs-xs)';
    leftLabel.style.color = 'var(--mn-ink-soft)';
  }

  const pinBtn = document.createElement('button');
  pinBtn.className = `mn-pin-btn${pinned ? ' pinned' : ''}`;
  pinBtn.setAttribute('aria-label', pinned ? t('matches.unpin_match') : t('matches.pin_match'));
  pinBtn.innerHTML = pinned ? svgPinFilled() : svgPinOutline();
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onPin) onPin(match.id, !pinned);
  });

  header.appendChild(leftLabel);
  header.appendChild(pinBtn);

  // ---- Teams ----
  const teams = document.createElement('div');
  teams.className = 'mn-card-teams';

  const homeScore = (isLive || isFinished) ? (match.score?.home ?? match.score?.ft_home ?? 0) : null;
  const awayScore = (isLive || isFinished) ? (match.score?.away ?? match.score?.ft_away ?? 0) : null;

  teams.appendChild(teamRow(match.home, homeScore));
  teams.appendChild(teamRow(match.away, awayScore));

  // ---- Footer ----
  const footer = document.createElement('div');
  footer.className = 'mn-card-footer';
  const parts = [];
  if (match.city) parts.push(match.city);
  if (match.venue) parts.push(match.venue);
  footer.textContent = parts.join(' · ');

  card.appendChild(header);
  card.appendChild(teams);
  if (parts.length) card.appendChild(footer);

  card.addEventListener('click', () => { if (onClick) onClick(match.id); });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onClick) onClick(match.id); }
  });

  return card;
}

function teamRow(team, score) {
  const row = document.createElement('div');
  row.className = 'mn-team-row';
  const flag = document.createElement('span');
  flag.innerHTML = flagImg(team.fifa, 'sm');
  const name = document.createElement('span');
  name.className = 'mn-team-name';
  name.textContent = currentLang() === 'he' ? (team.name_he || team.name_en) : (team.name_en || team.name_he);
  row.appendChild(flag);
  row.appendChild(name);
  if (score !== null) {
    const sc = document.createElement('span');
    sc.className = 'mn-score mn-tabular';
    sc.textContent = score;
    row.appendChild(sc);
  }
  return row;
}

function svgPinOutline() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 4-4 8-7 13C9 17 2 13 2 9a7 7 0 0 1 10-6.32"/><circle cx="12" cy="9" r="2.5"/></svg>`;
}
function svgPinFilled() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--mn-card-yellow)" stroke="var(--mn-card-yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 4-4 8-7 13C9 17 2 13 2 9a7 7 0 0 1 10-6.32"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`;
}
