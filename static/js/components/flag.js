/* flag.js — Flag image component */

import { currentLang } from '../i18n.js';

export function flagImg(fifa, size = 'sm') {
  const c = window.COUNTRIES?.[fifa];
  const widths = { sm: 'w40', md: 'w80', lg: 'w160' };
  const w = widths[size] || 'w40';
  if (!c) {
    return `<span class="mn-flag-placeholder mn-flag-${size}" aria-hidden="true">${(fifa || '').slice(0, 3)}</span>`;
  }
  const url = `https://flagcdn.com/${w}/${c.iso2}.png`;
  const name = currentLang() === 'he' ? c.name_he : c.name_en;
  return `<img class="mn-flag mn-flag-${size}" src="${url}" alt="${name}" loading="lazy">`;
}
