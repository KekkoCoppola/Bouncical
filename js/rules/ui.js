/* ========== Bouncical — rules/ui.js ========== */
/* Rules panel: sentence box (EN/IT) + rule cards with a WHEN → IF → THEN
   builder. Every field comes from the catalog, so new actions show up here
   automatically. */

import { h, toast, confirmDialog } from '../ui/dom.js';
import { select, numberInput, textInput, swatches } from '../ui/form.js';
import { TRIGGERS, ACTIONS, ACTION_GROUPS, newTrigger, newAction, summarize, describeCond } from './catalog.js';
import { parseRule } from './parser.js';

const PRESETS = [
  ['🎨 Color on hit', 'when a ball hits a shape it changes color'],
  ['📈 Grow in circle', 'when the ball hits a circle it grows 5%'],
  ['🌀 Spinning circles', 'at the start circles spin clockwise'],
  ['💥 Explode on triangle', 'when the ball hits a triangle it explodes into 3'],
  ['🌧 Ball rain', 'every 1 second spawn a ball at the top'],
  ['🔁 Respawn bigger', 'when a ball falls off screen it respawns 20% bigger'],
  ['🧬 Clone 30%', 'when a ball hits a shape, 30% chance it clones itself'],
  ['🙃 Gravity flip', 'every 4 seconds gravity flips'],
  ['🎆 Escape party', 'when a ball escapes a circle, fireworks and the circle breaks'],
  ['🕸 String art', 'when a ball hits a circle it draws strings'],
  ['🇮🇹 In italiano', 'quando la pallina tocca una linea accelera del 20% e lo schermo trema'],
];

export function mountRulesUI(root, engine) {
  const expanded = new Set();
  const input = h('textarea.rule-input', {
    rows: 2, maxlength: 300, 'aria-label': 'Describe a rule',
    placeholder: 'Describe a rule in English or Italian… e.g. "when the ball hits a circle it grows 10%"',
  });
  const msg = h('div.rule-msg', { role: 'status' });
  const list = h('div.rule-list');
  const count = h('span.rule-count');

  function say(text, kind = '') {
    msg.textContent = text;
    msg.className = 'rule-msg' + (kind ? ' ' + kind : '');
  }

  function addFromText(text) {
    const res = parseRule(text);
    if (res.status === 'fail') { say(res.message, 'error'); return false; }
    const r = engine.add(res.rule);
    if (res.status === 'partial') { expanded.add(r.id); say(res.message, 'warn'); }
    else { say(`✓ ${summarize(r)}${res.message ? ' — ' + res.message : ''}`, 'ok'); }
    render();
    return true;
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  function submit() {
    const text = input.value.trim();
    if (!text) { say('Type a sentence, or build a rule with “+ New rule”.', 'warn'); return; }
    if (addFromText(text)) input.value = '';
  }

  const presets = h('div.chips', null, PRESETS.map(([label, text]) => h('button.chip-btn', {
    type: 'button', text: label, title: text, onclick: () => addFromText(text),
  })));

  root.replaceChildren(
    h('div.rule-compose', null,
      input,
      h('div.rule-compose-row', null,
        h('button.btn.primary', { type: 'button', text: 'Add rule', onclick: submit }),
        h('button.btn', {
          type: 'button', text: '+ New rule',
          onclick: () => {
            const r = engine.add({ trigger: newTrigger('hit_shape'), actions: [newAction('ball.color')] });
            expanded.add(r.id);
            render();
            say('New rule added — edit it below.', 'ok');
          },
        }))),
    msg,
    h('details.presets', null, h('summary', { text: 'Examples' }), presets),
    h('div.rule-list-head', null, count, h('button.linkbtn', {
      type: 'button', text: 'Delete all',
      onclick: async () => {
        if (!engine.rules.length) return;
        if (await confirmDialog('Delete all rules?', 'This removes every rule from the list.', 'Delete all', true)) {
          engine.clear();
          render();
        }
      },
    })),
    list,
  );

  // ─── CARD ───
  function card(rule) {
    const open = expanded.has(rule.id);
    const el = h(`div.rule-card${rule.enabled ? '' : '.off'}${open ? '.open' : ''}`);
    const onToggle = h('input.switch', { type: 'checkbox', checked: rule.enabled, 'aria-label': 'Rule enabled' });
    onToggle.addEventListener('change', () => { engine.update(rule.id, { enabled: onToggle.checked }); rerender(rule.id); });
    const head = h('div.rule-head', null,
      onToggle,
      h('button.rule-summary', {
        type: 'button', 'aria-expanded': String(open),
        onclick: () => { if (open) expanded.delete(rule.id); else expanded.add(rule.id); rerender(rule.id); },
      }, h('span.rule-sum-text', { text: summarize(rule) }), rule.text ? h('span.rule-src', { text: `“${rule.text}”` }) : null),
      h('div.rule-tools', null,
        h('button.icon-mini', { type: 'button', title: 'Move up', 'aria-label': 'Move up', text: '↑', onclick: () => { engine.move(rule.id, -1); render(); } }),
        h('button.icon-mini', { type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', text: '⧉', onclick: () => { const c = engine.add({ ...rule, id: 0 }); expanded.add(c.id); render(); } }),
        h('button.icon-mini.danger', { type: 'button', title: 'Delete', 'aria-label': 'Delete rule', text: '✕', onclick: () => { engine.remove(rule.id); render(); } })));
    el.append(head);
    if (open) el.append(editor(rule));
    return el;
  }

  function editor(rule) {
    const t = TRIGGERS[rule.trigger.type];
    const setTrigger = patch => { engine.update(rule.id, { trigger: { ...rule.trigger, ...patch } }); rerender(rule.id); };
    const setCond = patch => { engine.update(rule.id, { cond: { ...rule.cond, ...patch } }); rerender(rule.id); };
    const setActions = list => { engine.update(rule.id, { actions: list }); rerender(rule.id); };

    const when = h('div.rule-sec', null, h('span.rule-tag', { text: 'WHEN' }),
      h('div.rule-fields', null,
        select({
          compact: true, label: 'Trigger', value: rule.trigger.type,
          options: Object.entries(TRIGGERS).map(([v, d]) => ({ v, l: d.label })),
          onChange: v => { engine.update(rule.id, { trigger: newTrigger(v) }); rerender(rule.id); },
        }),
        t.fields.map(f => paramField(f, rule.trigger[f.key], v => setTrigger({ [f.key]: v }), rule.trigger))));

    const c = rule.cond;
    const iff = h('div.rule-sec', null, h('span.rule-tag', { text: 'IF' }),
      h('div.rule-fields', null,
        h('label.pfield', null, h('span', { text: 'Every' }),
          numberInput({ value: c.every, min: 1, max: 1000, step: 1, unit: c.every === 1 ? 'time' : 'times', onChange: v => setCond({ every: v }) })),
        t.ball && c.every > 1 ? h('label.pfield', null, h('span', { text: 'Counted' }),
          select({ compact: true, label: 'Counted', value: c.per, options: [{ v: 'ball', l: 'per ball' }, { v: 'rule', l: 'in total' }], onChange: v => setCond({ per: v }) })) : null,
        h('label.pfield', null, h('span', { text: 'Chance' }), numberInput({ value: c.chance, min: 0, max: 100, step: 1, unit: '%', onChange: v => setCond({ chance: v }) })),
        h('label.pfield', null, h('span', { text: 'Max times (0 = ∞)' }), numberInput({ value: c.max, min: 0, max: 100000, step: 1, onChange: v => setCond({ max: v }) })),
        h('label.pfield', null, h('span', { text: 'Cooldown' }), numberInput({ value: c.cooldown, min: 0, max: 600, step: 0.1, unit: 's', onChange: v => setCond({ cooldown: v }) }))),
      describeCond(c, rule.trigger) ? null : h('span.rule-hint', { text: 'Always (no condition)' }));

    const groups = ACTION_GROUPS.map(g => ({
      group: g, items: Object.entries(ACTIONS).filter(([, d]) => d.group === g).map(([v, d]) => ({ v, l: d.label })),
    }));
    const rows = rule.actions.map((a, i) => {
      const d = ACTIONS[a.type];
      const update = patch => { const list = rule.actions.slice(); list[i] = { ...a, ...patch }; setActions(list); };
      return h('div.action-row', null,
        h('div.rule-fields', null,
          select({
            compact: true, label: 'Action', value: a.type, options: groups,
            onChange: v => { const list = rule.actions.slice(); list[i] = newAction(v); setActions(list); },
          }),
          d.fields.filter(f => !f.show || f.show(a)).map(f => paramField(f, a[f.key], v => update({ [f.key]: v }), a))),
        h('button.icon-mini.danger', {
          type: 'button', title: 'Remove action', 'aria-label': 'Remove action', text: '✕',
          onclick: () => setActions(rule.actions.filter((_, j) => j !== i)),
        }));
    });
    const then = h('div.rule-sec', null, h('span.rule-tag', { text: 'THEN' }),
      h('div.rule-actions', null, rows,
        h('button.btn.small', {
          type: 'button', text: '+ Add action',
          onclick: () => setActions([...rule.actions, newAction(rule.actions.length ? 'fx.burst' : 'ball.color')]),
        })));
    return h('div.rule-editor', null, when, iff, then);
  }

  function paramField(f, value, onChange) {
    let ctl;
    if (f.type === 'select') ctl = select({ compact: true, label: f.label, options: f.options, value, onChange });
    else if (f.type === 'number') ctl = numberInput({ value, min: f.min, max: f.max, step: f.step, unit: f.unit, onChange, label: f.label });
    else if (f.type === 'color') ctl = swatches({ value, onChange });
    else if (f.type === 'bool') {
      ctl = h('input.switch', { type: 'checkbox', checked: !!value, 'aria-label': f.label });
      ctl.addEventListener('change', () => onChange(ctl.checked));
    } else ctl = textInput({ value, onChange, label: f.label, maxlength: 60 });
    return h(`label.pfield${f.type === 'color' ? '.wide' : ''}`, null, h('span', { text: f.label }), ctl);
  }

  function rerender(id) {
    const old = list.querySelector(`[data-rid="${id}"]`);
    const rule = engine.rules.find(r => r.id === id);
    if (!old || !rule) { render(); return; }
    const el = card(rule);
    el.dataset.rid = id;
    old.replaceWith(el);
  }

  function render() {
    count.textContent = engine.rules.length ? `${engine.rules.length} rule${engine.rules.length > 1 ? 's' : ''}` : 'No rules yet';
    list.replaceChildren(...engine.rules.map(r => { const el = card(r); el.dataset.rid = r.id; return el; }));
    if (!engine.rules.length) {
      list.append(h('p.empty-note', { text: 'Rules make the scene react: type what should happen in plain English or Italian, tap an example, or build one with “+ New rule”.' }));
    }
  }

  render();
  return { render, focus: () => setTimeout(() => input.focus({ preventScroll: true }), 50), say };
}
