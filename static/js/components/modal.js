/* modal.js — Modal component with animated entrance/exit */

import { t } from '../i18n.js';

/**
 * Opens a modal.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string|HTMLElement} opts.body — HTML string or DOM element
 * @param {Array<{label, primary, action, close}>} opts.actions
 * @returns {{ close: Function, el: HTMLElement }}
 */
export function openModal({ title, body, actions = [] }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'mn-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'mn-modal';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'mn-modal-close btn-ghost';
  closeBtn.setAttribute('aria-label', t('common.close'));
  closeBtn.innerHTML = svgX();

  const titleEl = document.createElement('h2');
  titleEl.className = 'mn-modal-title';
  titleEl.textContent = title;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'mn-modal-body';
  if (typeof body === 'string') {
    bodyEl.innerHTML = body;
  } else if (body instanceof HTMLElement) {
    bodyEl.appendChild(body);
  }

  modal.appendChild(closeBtn);
  modal.appendChild(titleEl);
  modal.appendChild(bodyEl);

  if (actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'mn-modal-actions';
    actionsEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:20px;';
    actions.forEach(({ label, primary, action, close: doClose }) => {
      const btn = document.createElement('button');
      btn.className = primary ? 'btn-primary' : 'btn-secondary';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (action) action();
        if (doClose !== false) closeModal();
      });
      actionsEl.appendChild(btn);
    });
    modal.appendChild(actionsEl);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Trap focus
  const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]');
  if (focusable.length) focusable[0].focus();

  const closeModal = () => {
    backdrop.classList.add('closing');
    setTimeout(() => backdrop.remove(), 200);
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onEsc); }
  });

  return { close: closeModal, el: modal };
}

function svgX() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}
