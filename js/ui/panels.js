/* ========== Bouncical — ui/panels.js ========== */
/* Integrates panels as collapsible sections in .ss-panel (ScrollStudio family kit).
   Esc or close buttons close; toolbar buttons toggle. */

import { $, $$ } from './dom.js';

const hooks = {};   // id → { onOpen, onClose }
let openId = null;

export function registerPanel(id, { onOpen, onClose } = {}) {
  hooks[id] = { onOpen, onClose };
  const el = $(`#panel-${id}`);
  if (!el) return;
  const close = el.querySelector('.panel-close');
  if (close) close.addEventListener('click', () => closePanel());
  if (el.tagName === 'DETAILS') {
    el.addEventListener('toggle', () => {
      if (el.open) {
        openId = id;
        $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'true'));
        if (hooks[id] && hooks[id].onOpen) hooks[id].onOpen(el);
      } else if (openId === id) {
        openId = null;
        $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
        if (hooks[id] && hooks[id].onClose) hooks[id].onClose(el);
      }
    });
  }
}

export function openPanel(id) {
  const el = $(`#panel-${id}`);
  if (!el) return;
  openId = id;
  el.style.display = '';
  el.hidden = false;
  if (el.tagName === 'DETAILS') {
    el.open = true;
  }
  el.classList.add('open');
  $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'true'));
  document.body.classList.add('panel-open');
  if (hooks[id] && hooks[id].onOpen) hooks[id].onOpen(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function closePanel() {
  if (!openId) return;
  const id = openId;
  const el = $(`#panel-${id}`);
  openId = null;
  if (el) {
    el.classList.remove('open');
    if (el.tagName === 'DETAILS') {
      el.open = false;
      if (id === 'shape') el.style.display = 'none';
    } else {
      el.hidden = true;
    }
    $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  document.body.classList.remove('panel-open');
  if (hooks[id] && hooks[id].onClose) hooks[id].onClose(el);
}

export function togglePanel(id) {
  const el = $(`#panel-${id}`);
  if (!el) return;
  if (el.tagName === 'DETAILS' ? el.open : openId === id) closePanel();
  else openPanel(id);
}

export const currentPanel = () => openId;
