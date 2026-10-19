/* ========== Bouncical — ui/form.js ========== */
/* Form controls used by every panel and by the rule builder. */

import { h, toast } from './dom.js';
import { PALETTE, hsl } from '../util.js';

let uid = 0;
const nid = () => `f${++uid}`;

export function row(label, control, extra) {
  return h('div.frow', null, label ? h('span.flabel', { text: label }) : null, control, extra || null);
}

export function section(title, ...children) {
  return h('div.fsection', null, title ? h('h4.fsection-title', { text: title }) : null, ...children);
}

// Range slider with a live value label.
export function slider({ label, min, max, step = 1, value, format = v => v, onInput, onChange }) {
  const out = h('output.fval', { text: format(value) });
  const input = h('input.range', { type: 'range', min, max, step, value, 'aria-label': label });
  const fill = () => input.style.setProperty('--p', `${((input.value - min) / (max - min)) * 100}%`);
  fill();
  input.addEventListener('input', () => { const v = +input.value; out.textContent = format(v); fill(); if (onInput) onInput(v); });
  input.addEventListener('change', () => { if (onChange) onChange(+input.value); });
  const el = h('label.frow.fslider', null, h('span.flabel', { text: label }), out, input);
  el.setValue = v => { input.value = v; out.textContent = format(+v); fill(); };
  return el;
}

const LOCK_ICON = '<svg class="ss-icon" viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="5.5" width="7" height="5" rx="1"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg>';

// locked: why the feature can't be changed yet. The switch keeps its value, with a padlock next
// to the label; a tap, a click or Space tells why (aria-disabled, so it still gets the events).
export function toggle({ label, value, onChange, locked }) {
  const id = nid();
  const input = h('input.switch', { type: 'checkbox', id, checked: !!value, role: 'switch', 'aria-disabled': locked ? 'true' : null });
  input.addEventListener('change', () => onChange(input.checked));
  const name = h('span.flabel', { text: label });
  if (locked) name.append(h('span.flock', { role: 'img', 'aria-label': 'Locked', html: LOCK_ICON }));
  const refuse = e => { e.preventDefault(); toast(locked); };
  const el = h('label.frow.ftoggle', { for: id, title: locked, onclick: locked ? refuse : null }, name, input);
  el.setValue = v => { input.checked = !!v; };
  return el;
}

export function select({ label, options, value, onChange, compact = false }) {
  const sel = h('select.fselect', { 'aria-label': label || 'choice' },
    options.map(o => (o.group
      ? h('optgroup', { label: o.group }, o.items.map(i => h('option', { value: String(i.v), text: i.l })))
      : h('option', { value: String(o.v), text: o.l }))));
  sel.value = String(value);
  sel.addEventListener('change', () => {
    const flat = options.flatMap(o => (o.group ? o.items : [o]));
    const hit = flat.find(o => String(o.v) === sel.value);
    onChange(hit ? hit.v : sel.value);
  });
  if (compact) return sel;
  const el = row(label, sel);
  el.setValue = v => { sel.value = String(v); };
  return el;
}

export function segmented({ label, options, value, onChange }) {
  const wrap = h('div.seg', { role: 'group', 'aria-label': label });
  const btns = options.map(o => h('button.seg-btn', {
    type: 'button', text: o.l, 'aria-pressed': String(o.v === value),
    onclick: () => { btns.forEach(b => b.setAttribute('aria-pressed', 'false')); btn(o).setAttribute('aria-pressed', 'true'); onChange(o.v); },
  }));
  const btn = o => btns[options.indexOf(o)];
  wrap.append(...btns);
  const el = row(label, wrap);
  el.setValue = v => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].v === v)));
  return el;
}

// Hue swatches; value null = white (when allowWhite).
export function swatches({ label, value, onChange, allowWhite = false, extra = [] }) {
  const wrap = h('div.swatches', { role: 'radiogroup', 'aria-label': label || 'color' });
  const items = [
    ...(allowWhite ? [{ v: null, c: '#fff', n: 'white' }] : []),
    ...PALETTE.map(p => ({ v: p.hue, c: hsl(p.hue, 100, 60), n: p.id })),
    ...extra,
  ];
  const btns = items.map(it => h('button.swatch', {
    type: 'button', title: it.n, 'aria-label': it.n, style: { background: it.c },
    'aria-checked': String(it.v === value), role: 'radio',
    onclick: () => { btns.forEach(b => b.setAttribute('aria-checked', 'false')); btns[items.indexOf(it)].setAttribute('aria-checked', 'true'); onChange(it.v); },
  }, it.t || ''));
  wrap.append(...btns);
  return label ? row(label, wrap) : wrap;
}

export function numberInput({ value, min, max, step = 1, unit, onChange, label }) {
  const input = h('input.fnum', { type: 'number', inputmode: 'decimal', min, max, step, value, 'aria-label': label || 'number' });
  const commit = () => {
    let v = parseFloat(String(input.value).replace(',', '.'));
    if (!isFinite(v)) v = +min;
    v = Math.min(+max, Math.max(+min, v));
    input.value = v;
    onChange(v);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  return unit ? h('span.fnum-wrap', null, input, h('span.funit', { text: unit })) : input;
}

export function textInput({ value, placeholder, maxlength = 60, onChange, label }) {
  const input = h('input.ftext', { type: 'text', value: value ?? '', placeholder: placeholder || '', maxlength, 'aria-label': label || 'text' });
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

export function button(label, onClick, cls = '') {
  return h(`button.btn${cls ? '.' + cls.split(' ').join('.') : ''}`, { type: 'button', text: label, onclick: onClick });
}
