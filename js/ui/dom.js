/* ========== Bouncical — ui/dom.js ========== */
/* Tiny DOM helpers, toast and modal dialogs. User text always goes
   through textContent, never innerHTML. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// h('div.card#id', { onclick, title, ... }, children...)
export function h(tag, attrs, ...children) {
  const [, name, rest] = tag.match(/^([a-z0-9-]+)(.*)$/i);
  const el = document.createElement(name);
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // static markup only (icons)
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ─── TOAST ───
let toastTimer = 0;
export function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, kind === 'error' ? 4200 : 2600);
}

// ─── MODAL ───
let modalClose = null;
export function openModal({ title, body, actions = [], onClose, wide = false }) {
  closeModal();
  const root = $('#modal');
  const card = $('#modal .modal-card');
  card.classList.toggle('wide', wide);
  card.replaceChildren(
    h('h3.modal-title', { text: title }),
    h('div.modal-body', null, body),
    h('div.modal-actions', null, actions.map(a => h(`button.btn${a.primary ? '.primary' : ''}${a.danger ? '.danger' : ''}`, {
      type: 'button', text: a.label,
      onclick: () => { if (a.onClick && a.onClick() === false) return; closeModal(); },
    }))),
  );
  root.hidden = false;
  modalClose = onClose || null;
  const first = card.querySelector('.btn.primary') || card.querySelector('.btn');
  if (first) setTimeout(() => first.focus(), 30);
}

export function closeModal() {
  const root = $('#modal');
  if (root.hidden) return;
  root.hidden = true;
  const fn = modalClose;
  modalClose = null;
  if (fn) fn();
}

export function isModalOpen() { return !$('#modal').hidden; }

export function confirmDialog(title, text, okLabel = 'OK', danger = false) {
  return new Promise(resolve => {
    let done = false;
    openModal({
      title,
      body: h('p', { text }),
      actions: [
        { label: 'Cancel', onClick: () => { done = true; resolve(false); } },
        { label: okLabel, primary: !danger, danger, onClick: () => { done = true; resolve(true); } },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
  });
}
