/* ========== Bouncical — rules/engine.js ========== */
/* Rule list + evaluation: trigger matching, conditions (every N, chance,
   max times, cooldown) and dispatch to an `execute` callback. Pure logic
   with no DOM or physics imports, so it runs in Node tests too. */

import { TRIGGERS, normalizeRule } from './catalog.js';

export function createEngine({ execute, now = () => 0, onChange = () => {} }) {
  const rules = [];
  let seq = 1;

  const freshState = () => ({ count: 0, fired: 0, last: -Infinity, acc: 0, prevBalls: null });

  function add(raw) {
    const r = normalizeRule(raw);
    r.id = seq++;
    r.state = freshState();
    rules.push(r);
    onChange();
    return r;
  }

  function update(id, patch) {
    const i = rules.findIndex(r => r.id === id);
    if (i < 0) return null;
    const merged = normalizeRule({ ...rules[i], ...patch });
    merged.id = id;
    merged.state = rules[i].state;
    rules[i] = merged;
    onChange();
    return merged;
  }

  function remove(id) {
    const i = rules.findIndex(r => r.id === id);
    if (i >= 0) { rules.splice(i, 1); onChange(); }
  }

  function move(id, dir) {
    const i = rules.findIndex(r => r.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= rules.length) return;
    [rules[i], rules[j]] = [rules[j], rules[i]];
    onChange();
  }

  function clear() { rules.length = 0; onChange(); }

  function replaceAll(list) {
    rules.length = 0;
    for (const r of list || []) {
      const n = normalizeRule(r);
      n.id = seq++;
      n.state = freshState();
      rules.push(n);
    }
    onChange();
  }

  function resetState() { for (const r of rules) r.state = freshState(); }

  const toJSON = () => rules.map(({ state, ...r }) => r);

  // ─── MATCHING ───
  function matches(tr, ev) {
    switch (tr.type) {
      case 'hit_shape': return ev.type === 'hit' && ev.kind === 'shape' && (tr.shape === 'any' || (ev.shape && ev.shape.kind === tr.shape));
      case 'hit_wall': return ev.type === 'hit' && ev.kind === 'wall' && (tr.side === 'any' || ev.side === tr.side);
      case 'hit_ball': return ev.type === 'hit' && ev.kind === 'ball';
      case 'spawn': return ev.type === 'spawn' && (tr.source === 'any' || ev.source === tr.source);
      default: return ev.type === tr.type;
    }
  }

  // "every N" counts every matching event; the other conditions gate firing.
  function passes(rule, ev) {
    const c = rule.cond, st = rule.state;
    if (c.every > 1) {
      let n;
      if (c.per === 'ball' && ev.ball && TRIGGERS[rule.trigger.type].ball) {
        const m = ev.ball.ruleCounts || (ev.ball.ruleCounts = {});
        n = m[rule.id] = (m[rule.id] || 0) + 1;
      } else {
        n = ++st.count;
      }
      if (n % c.every !== 0) return false;
    }
    if (c.max > 0 && st.fired >= c.max) return false;
    const t = now();
    if (c.cooldown > 0 && t - st.last < c.cooldown) return false;
    if (c.chance < 100 && Math.random() * 100 >= c.chance) return false;
    st.fired++;
    st.last = t;
    return true;
  }

  function fire(rule, ev) {
    if (!passes(rule, ev)) return;
    try { execute(rule, ev); } catch (e) { console.warn('Rule failed:', e); }
  }

  // Event from the game (hit, escape, offscreen, spawn).
  function dispatch(ev) {
    for (const r of [...rules]) {
      if (r.enabled && r.actions.length && matches(r.trigger, ev)) fire(r, ev);
    }
  }

  // Timers run on simulated time (slow motion slows them too).
  function tick(dt) {
    for (const r of rules) {
      if (!r.enabled || r.trigger.type !== 'timer' || !r.actions.length) continue;
      const st = r.state;
      st.acc += dt;
      const period = Math.max(0.05, r.trigger.seconds);
      let guard = 0;
      while (st.acc >= period && guard++ < 3) {
        st.acc -= period;
        fire(r, { type: 'timer' });
      }
      if (st.acc > period) st.acc = 0;
    }
  }

  function start() {
    for (const r of [...rules]) if (r.enabled && r.trigger.type === 'start') fire(r, { type: 'start' });
  }

  // Edge-triggered ball-count rules; call once per frame with the count.
  function counts(n) {
    for (const r of [...rules]) {
      if (!r.enabled || (r.trigger.type !== 'count' && r.trigger.type !== 'empty')) continue;
      const st = r.state;
      const prev = st.prevBalls;
      st.prevBalls = n;
      if (prev == null) continue;
      if (r.trigger.type === 'count' && n >= r.trigger.count && prev < r.trigger.count) fire(r, { type: 'count' });
      if (r.trigger.type === 'empty' && n === 0 && prev > 0) fire(r, { type: 'empty' });
    }
  }

  return { rules, add, update, remove, move, clear, replaceAll, resetState, toJSON, dispatch, tick, start, counts };
}
