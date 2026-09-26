/* ========== Bouncical — ui/panels.js ========== */
/* One panel open at a time: bottom sheet in portrait, side drawer in
   landscape (pure CSS). Esc or ✕ closes; toolbar buttons toggle. */

import { $, $$ } from './dom.js';

const hooks = {};   // id → { onOpen, onClose }
let openId = null;

export function registerPanel(id, { onOpen, onClose } = {}) {
  hooks[id] = { onOpen, onClose };
  const el = $(`#panel-${id}`);
  const close = el.querySelector('.panel-close');
  if (close) close.addEventListener('click', () => closePanel());
}

export function openPanel(id) {
  if (openId === id) return;
  closePanel();
  const el = $(`#panel-${id}`);
  if (!el) return;
  openId = id;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('open'));
  $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'true'));
  document.body.classList.add('panel-open');
  if (hooks[id] && hooks[id].onOpen) hooks[id].onOpen(el);
}

export function closePanel() {
  if (!openId) return;
  const id = openId;
  const el = $(`#panel-${id}`);
  openId = null;
  el.classList.remove('open');
  el.hidden = true;
  $$(`[data-panel="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
  document.body.classList.remove('panel-open');
  if (hooks[id] && hooks[id].onClose) hooks[id].onClose(el);
}

export function togglePanel(id) {
  if (openId === id) closePanel();
  else openPanel(id);
}

export const currentPanel = () => openId;
