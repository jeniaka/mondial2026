/* countdown.js — Live countdown to kickoff */

import { t, currentLang } from '../i18n.js';

/**
 * Returns a human-readable countdown string from now to kickoffUtc.
 * @param {string|Date} kickoffUtc
 * @returns {string}
 */
export function countdownStr(kickoffUtc) {
  const target = new Date(kickoffUtc);
  const now = new Date();
  const diffMs = target - now;
  if (diffMs <= 0) return t('predictions.locked');

  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const lang = currentLang();
  if (h > 0) {
    return lang === 'he'
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${h}h ${m}m`;
  }
  if (m > 0) {
    return lang === 'he'
      ? `${m}:${String(s).padStart(2, '0')}`
      : `${m}m ${s}s`;
  }
  return lang === 'he' ? `${s}s` : `${s}s`;
}

/**
 * Creates a live countdown element that updates every second.
 * Calls onLock() when countdown hits zero.
 * @param {string|Date} kickoffUtc
 * @param {Function} onLock
 * @returns {HTMLElement}
 */
export function createCountdown(kickoffUtc, onLock) {
  const el = document.createElement('span');
  el.className = 'mn-countdown';

  const update = () => {
    const target = new Date(kickoffUtc);
    const now = new Date();
    const diffMs = target - now;
    if (diffMs <= 0) {
      el.textContent = t('predictions.locked');
      if (onLock) onLock();
      clearInterval(timer);
      return;
    }
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    el.textContent = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  update();
  const timer = setInterval(update, 1000);
  el._clearTimer = () => clearInterval(timer);
  return el;
}
