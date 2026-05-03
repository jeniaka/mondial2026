/* i18n.js — Translation runtime (verbatim from spec) */

let _strings = null;
let _lang = 'he';

export async function setLang(lang) {
  if (lang !== 'he' && lang !== 'en') lang = 'he';
  _lang = lang;
  const r = await fetch(`/static/lang/${lang}.json`);
  _strings = await r.json();
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
  localStorage.setItem('lang', lang);
}

export function t(key, params = {}) {
  if (!_strings) return key;
  const parts = key.split('.');
  let v = _strings;
  for (const p of parts) v = v?.[p];
  if (typeof v !== 'string') return key;
  return v.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export function currentLang() { return _lang; }
