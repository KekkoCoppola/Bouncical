/* ========== Bouncical — game.js ========== */
/* Game state and per-frame simulation: stepping, collision handling
   (sound → effects → rules), ring escapes, off-screen cleanup, play/pause,
   clear, scene format and template loading. */

import { settings, setAspectSetting, applySections, onSettings } from './config.js';
import { stage, setWorld, worldSizeFor } from './stage.js';
import * as physics from './physics.js';
import { scene, addBall, removeBall as dropBall, addShape, removeShape as dropShape, history, cmd, wipe, isEmpty } from './scene.js';
import { createBall, applyBallMaterial } from './balls.js';
import { createShape, rotateShape, stopShapeMotion, moveShape } from './shapes.js';
import { hitSound, onRunState, resetSong } from './song.js';
import { unlock } from './audio.js';
import { createEngine } from './rules/engine.js';
import { executeRule, bindGame } from './rules/actions.js';
import { view } from './render.js';
import { DEG, clamp, wrapHue } from './util.js';
import * as fx from './fx.js';

const { Body } = Matter;

export const game = { running: false };
const listeners = new Set();
export function onGame(fn) { listeners.add(fn); }
const emit = type => listeners.forEach(fn => fn(type));

// ─── RULES ───
const RULES_KEY = 'bouncical_rules_v2';
export const rules = createEngine({
  execute: executeRule,
  now: () => physics.rt.simTime,
  onChange: () => {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules.toJSON())); } catch (_) {}
    emit('rules');
  },
});

export function loadStoredRules(parse) {
  try {
    const stored = localStorage.getItem(RULES_KEY);
    if (stored) { rules.replaceAll(JSON.parse(stored)); return; }
    // Migrate rules saved by the first version (text + fixed trigger/action).
    const legacy = JSON.parse(localStorage.getItem('gs_rules') || '[]');
    const list = [];
    for (const r of Array.isArray(legacy) ? legacy : []) {
      const p = r && typeof r.text === 'string' ? parse(r.text) : null;
      if (p && p.rule && p.rule.actions.length) list.push({ ...p.rule, enabled: r.enabled !== false });
    }
    rules.replaceAll(list);
    localStorage.removeItem('gs_rules');
  } catch (_) {}
}

// ─── ENTITIES ───
const pending = []; // spawn events, dispatched on the next frame (no cascades)

export function spawnBall(opts) {
  if (scene.balls.length >= settings.world.maxBalls) return null;
  const b = createBall(opts);
  addBall(b);
  if (opts.source === 'rule') fx.pop(b.position.x, b.position.y, b.hue, b.circleRadius);
  pending.push({ type: 'spawn', ball: b, source: opts.source || 'user' });
  emit('scene');
  return b;
}

export function removeBall(b) {
  if (dropBall(b)) emit('scene');
}

export function removeShape(s) {
  dropShape(s);
  if (view.selected === s) select(null);
  emit('scene');
}

export function select(s) {
  view.selected = s;
  emit('select');
}

// ─── PLAY / PAUSE ───
export function start() {
  if (game.running) return;
  unlock();
  game.running = true;
  physics.resetAccumulator();
  rules.start();
  onRunState(true);
  emit('run');
}

export function stop() {
  if (!game.running) return;
  game.running = false;
  onRunState(false);
  emit('run');
}

export function toggleRun() { if (game.running) stop(); else start(); }

// Remove everything (undoable) and reset rule-driven state.
export function clearScene() {
  const list = [...scene.shapes.map(s => cmd.removeShape(s)), ...scene.balls.map(b => cmd.removeBall(b))];
  list.forEach(c => c.redo());
  if (list.length) history.push(cmd.batch(list));
  select(null);
  resetRuntime();
  emit('scene');
}

export function resetRuntime() {
  stop();
  physics.resetRuntime();
  fx.clear();
  rules.resetState();
  resetSong();
  pending.length = 0;
}

// ─── FORMAT ───
export function setAspect(aspect) {
  const { w, h } = worldSizeFor(aspect);
  const dx = (w - stage.W) / 2, dy = (h - stage.H) / 2;
  setAspectSetting(aspect);
  setWorld(aspect, w, h);
  if (dx || dy) {
    for (const s of scene.shapes) moveShape(s, dx, dy);
    for (const b of scene.balls) {
      Body.translate(b, { x: dx, y: dy });
      b.spawn.x += dx;
      b.spawn.y += dy;
      b.trail.length = 0;
      if (b.strings) b.strings.length = 0;
    }
  }
  physics.rebuildWalls();
  emit('format');
}

// 'Fit' follows the screen only while the scene is empty.
export function refitIfEmpty() {
  if (settings.aspect !== 'fit' || !isEmpty()) return;
  const { w, h } = worldSizeFor('fit');
  if (Math.abs(w - stage.W) > 2 || Math.abs(h - stage.H) > 2) {
    setWorld('fit', w, h);
    physics.rebuildWalls();
  }
}

// ─── TEMPLATES ───
export function loadTemplate(t) {
  stop();
  wipe();
  history.clear();
  select(null);
  applySections({ world: t.world || {}, fx: t.fx || {}, music: t.music || {} });
  setAspect(t.aspect || '9:16');
  resetRuntime();
  for (const sd of t.shapes || []) addShape(createShape(sd));
  rules.replaceAll(t.rules || []);
  for (const bd of t.balls || []) spawnBall({ ...bd, source: 'user' });
  emit('scene');
}

// ─── SETTINGS → LIVE OBJECTS ───
onSettings((section, key) => {
  if (section !== 'world') return;
  const w = settings.world;
  if (['ballBounce', 'ballFriction', 'ballAir', 'ballCollisions', '*'].includes(key)) scene.balls.forEach(applyBallMaterial);
  if (key === 'gravity' || key === '*') { physics.rt.gravity = w.gravity; physics.applyGravity(); }
  if (key === 'gravityAngle' || key === '*') { physics.rt.gravityAngle = w.gravityAngle; physics.applyGravity(); }
  const walls = { wallLeft: 'left', wallRight: 'right', floor: 'floor', ceiling: 'ceiling' };
  if (walls[key]) { physics.rt.bounds[walls[key]] = w[key]; physics.rebuildWalls(); }
  if (key === '*') { physics.rt.bounds = { left: w.wallLeft, right: w.wallRight, floor: w.floor, ceiling: w.ceiling }; physics.rebuildWalls(); }
});

// ─── PER-STEP HOOKS ───
const hooks = {
  before(dtMs) {
    for (const s of scene.shapes) {
      if (s.spin) { rotateShape(s, s.spin * DEG * (dtMs / 1000), true); s.moving = true; }
      else if (s.moving) stopShapeMotion(s);
    }
  },
  after() {
    const max = settings.world.maxSpeed, max2 = max * max;
    for (const b of scene.balls) {
      const v = Body.getVelocity(b);
      const s2 = v.x * v.x + v.y * v.y;
      if (s2 > max2) { const k = max / Math.sqrt(s2); Body.setVelocity(b, { x: v.x * k, y: v.y * k }); }
    }
  },
};

// ─── FRAME ───
export function update(dtMs) {
  const dt = Math.min(dtMs, 100) / 1000;
  if (game.running) {
    const steps = physics.step(dtMs, hooks);
    const simDt = (steps * physics.STEP_MS) / 1000;
    handleCollisions();
    watchBalls();
    if (simDt > 0) rules.tick(simDt);
    rules.counts(scene.balls.length);
    updateTrails();
  }
  if (pending.length) {
    const evs = pending.splice(0, pending.length);
    for (const ev of evs) if (!ev.ball.removed) rules.dispatch(ev);
  }
  for (const s of scene.shapes) if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.6);
  fx.update(game.running ? dt * physics.timeScale() : dt);
}

function soundAllowed(kind) {
  const m = settings.music.soundOn;
  return m === 'all' || (m === 'shapesWalls' && kind !== 'ball') || (m === 'shapes' && kind === 'shape');
}

function handleCollisions() {
  const q = physics.queue;
  if (!q.length) return;
  const events = q.splice(0, q.length);
  const colorShift = settings.world.colorShift && (settings.world.ballColor === 'random' || settings.world.ballColor === 'rainbow');
  for (const ev of events) {
    const b = ev.ball;
    if (b.removed) continue;
    if (ev.kind === 'shape') {
      if (!ev.shape || !ev.shape.inWorld) continue;
      ev.shape.flash = 1;
      ev.shape.flashHue = b.hue;
    }
    if (ev.kind !== 'ball') b.hits++;
    if (ev.primary) {
      if (soundAllowed(ev.kind) && ev.impact >= settings.music.minImpact) {
        const label = hitSound({ y: ev.y, H: stage.H, impact: ev.impact, ball: b, shape: ev.shape });
        if (label) {
          fx.notePulse(b.hue, clamp(ev.impact / 18, 0.08, 0.45));
          if (settings.fx.noteLabels) fx.text(ev.x, ev.y - 12, label, b.hue, 13);
        }
      }
      if (ev.impact > 0.6 && settings.fx.particles) fx.impact(ev.x, ev.y, b.hue, ev.impact, ev.nx, ev.ny);
    }
    if (colorShift && ev.kind !== 'ball') b.hue = wrapHue(b.hue + 32);
    rules.dispatch(ev);
  }
}

// Ring escapes (in → out through the gap) and balls leaving the world.
function watchBalls() {
  const W = stage.W, H = stage.H;
  const rings = scene.shapes.filter(s => s.kind === 'ring');
  for (const b of scene.balls.slice()) {
    if (b.removed) continue;
    const x = b.position.x, y = b.position.y, r = b.circleRadius;
    if (!isFinite(x) || !isFinite(y)) { removeBall(b); continue; }
    for (const s of rings) {
      if (!s.inWorld) continue;
      const R = s.r * s.scale, T = (s.thick * s.scale) / 2;
      const d = Math.hypot(x - s.x, y - s.y);
      const st = b.ringIn.get(s.id);
      if (d + r * 0.5 < R - T) {
        if (st !== 'in') b.ringIn.set(s.id, 'in');
      } else if (d - r > R + T) {
        if (st === 'in') {
          b.ringIn.set(s.id, 'out');
          rules.dispatch({ type: 'escape', ball: b, shape: s, x, y });
          if (b.removed) break;
        } else if (st !== 'out') b.ringIn.set(s.id, 'out');
      }
    }
    if (b.removed) continue;
    if (outside(b, W, H)) {
      rules.dispatch({ type: 'offscreen', ball: b, x: clamp(x, 0, W), y: clamp(y, 0, H) });
      if (!b.removed && outside(b, W, H)) removeBall(b);
    }
  }
}

function outside(b, W, H) {
  const m = 40 + b.circleRadius;
  const x = b.position.x, y = b.position.y;
  return x < -m || x > W + m || y > H + m || y < -H;
}

function updateTrails() {
  const on = settings.fx.trails;
  const len = Math.max(2, Math.round(settings.fx.trailLength * (settings.fx.quality === 'low' ? 0.5 : 1))) * 2;
  for (const b of scene.balls) {
    if (on || b.trailOn) {
      b.trail.push(b.position.x, b.position.y);
      if (b.trail.length > len) b.trail.splice(0, b.trail.length - len);
    } else if (b.trail.length) b.trail.length = 0;
  }
}

bindGame({ spawnBall, removeBall, removeShape, pause: stop });
