/* ========== Bouncical — tools.js ========== */
/* Pointer tools on the stage canvas. One pointer at a time with pointer
   capture (a stroke never gets "stuck" when the finger leaves the canvas),
   touch-friendly picking tolerance, and one undo entry per gesture. */

import { settings } from './config.js';
import { stage, toWorld, cssToWorld } from './stage.js';
import { scene, history, cmd, addShape } from './scene.js';
import { createShape, hitTest, cutShape, moveShape, serializeShape, restoreShape, isEmptyShape } from './shapes.js';
import { defaultRadius, nextBallHue } from './balls.js';
import { view } from './render.js';
import { game, spawnBall, select, removeShape, removeBall } from './game.js';
import { toast } from './ui/dom.js';
import { DEG, clamp } from './util.js';

const { Body } = Matter;

export const TOOLS = ['ball', 'move', 'line', 'ring', 'tri', 'rect', 'erase', 'rubber'];
export const tools = { current: 'ball' };

const RUBBER_R = 16;
const TAP_PX = 7;
let active = null;
let onInspect = () => {};

export function setTool(t) {
  if (!TOOLS.includes(t)) return;
  tools.current = t;
  if (t !== 'move') select(null);
  view.preview = null;
  view.cursor = null;
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  stage.canvas.dataset.tool = t;
}

export function initTools(canvas, { inspect }) {
  onInspect = inspect;
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', e => { if (active && e.pointerId === active.id) onUp(e); });
  canvas.addEventListener('pointerleave', () => { if (!active) view.cursor = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  setTool(tools.current);
}

// ─── PICKING ───
export function pickAt(x, y, tolCss = 12) {
  const tol = cssToWorld(tolCss);
  for (let i = scene.balls.length - 1; i >= 0; i--) {
    const b = scene.balls[i];
    if (Math.hypot(b.position.x - x, b.position.y - y) <= b.circleRadius + tol) return { ball: b };
  }
  for (let i = scene.shapes.length - 1; i >= 0; i--) {
    const s = scene.shapes[i];
    if (hitTest(s, x, y, tol)) return { shape: s };
  }
  return null;
}

// ─── POINTER ───
function onDown(e) {
  if (active || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  try { stage.canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const p = toWorld(e.clientX, e.clientY);
  active = { id: e.pointerId, tool: tools.current, x0: p.x, y0: p.y, cx0: e.clientX, cy0: e.clientY, shift: e.shiftKey };
  const t = active.tool;
  if (t === 'ball') {
    active.r = defaultRadius();
    active.hue = nextBallHue();
    view.preview = { type: 'sling', x1: p.x, y1: p.y, x2: p.x, y2: p.y, r: active.r, hue: active.hue };
  } else if (t === 'move') {
    startMove(p);
  } else if (t === 'erase') {
    active.cmds = [];
    eraseAt(p);
  } else if (t === 'rubber') {
    active.snap = new Map();
    active.last = p;
    rubberAt(p);
  } else {
    view.preview = { type: t, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }
}

function onMove(e) {
  const p = toWorld(e.clientX, e.clientY);
  if (!active) {
    const t = tools.current;
    view.cursor = t === 'rubber' ? { type: 'rubber', x: p.x, y: p.y, r: RUBBER_R }
      : t === 'erase' && e.pointerType === 'mouse' ? { type: 'erase', x: p.x, y: p.y, r: cssToWorld(12) } : null;
    return;
  }
  if (e.pointerId !== active.id) return;
  e.preventDefault();
  active.shift = e.shiftKey;
  const t = active.tool;
  if (t === 'ball') {
    view.preview.x2 = p.x;
    view.preview.y2 = p.y;
  } else if (t === 'move') {
    dragMove(p, e);
  } else if (t === 'erase') {
    view.cursor = { type: 'erase', x: p.x, y: p.y, r: cssToWorld(12) };
    eraseAt(p);
  } else if (t === 'rubber') {
    const d = Math.hypot(p.x - active.last.x, p.y - active.last.y);
    const n = Math.max(1, Math.ceil(d / (RUBBER_R * 0.5)));
    for (let i = 1; i <= n; i++) {
      rubberAt({ x: active.last.x + ((p.x - active.last.x) * i) / n, y: active.last.y + ((p.y - active.last.y) * i) / n });
    }
    active.last = p;
    view.cursor = { type: 'rubber', x: p.x, y: p.y, r: RUBBER_R };
  } else if (view.preview) {
    let x2 = p.x, y2 = p.y;
    if (t === 'line' && active.shift) {
      const a = Math.round(Math.atan2(y2 - active.y0, x2 - active.x0) / (15 * DEG)) * 15 * DEG;
      const len = Math.hypot(x2 - active.x0, y2 - active.y0);
      x2 = active.x0 + Math.cos(a) * len;
      y2 = active.y0 + Math.sin(a) * len;
    }
    view.preview.x2 = x2;
    view.preview.y2 = y2;
  }
}

function onUp(e) {
  if (!active || e.pointerId !== active.id) return;
  const a = active;
  active = null;
  try { stage.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  const t = a.tool;
  if (t === 'ball') finishBall(a, e);
  else if (t === 'move') endMove(a, e);
  else if (t === 'erase') { history.push(cmd.batch(a.cmds)); view.cursor = null; }
  else if (t === 'rubber') finishRubber(a);
  else finishShape(a);
  view.preview = null;
}

function onCancel(e) {
  if (!active || e.pointerId !== active.id) return;
  const a = active;
  if (a.tool === 'rubber') finishRubber(a);
  else if (a.tool === 'erase') history.push(cmd.batch(a.cmds));
  else if (a.tool === 'move') endMove(a, e, true);
  active = null;
  view.preview = null;
  view.cursor = null;
}

const movedPx = (a, e) => Math.hypot(e.clientX - a.cx0, e.clientY - a.cy0);

// ─── BALL (tap = drop, drag = launch) ───
function finishBall(a, e) {
  const pv = view.preview;
  let vx = 0, vy = 0;
  if (movedPx(a, e) > TAP_PX * 1.5) {
    const k = 0.07, max = settings.world.maxSpeed;
    vx = (pv.x2 - pv.x1) * k;
    vy = (pv.y2 - pv.y1) * k;
    const sp = Math.hypot(vx, vy);
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
  }
  const b = spawnBall({ x: a.x0, y: a.y0, r: a.r, hue: a.hue, vx, vy, source: 'user' });
  if (!b) { toast(`Ball limit reached (${settings.world.maxBalls}). Raise it in World.`, 'error'); return; }
  history.push(cmd.addBall(b));
}

// ─── MOVE ───
function startMove(p) {
  const hit = pickAt(p.x, p.y);
  if (!hit) { select(null); active.none = true; return; }
  if (hit.ball) {
    const b = hit.ball;
    active.ball = b;
    active.off = { x: p.x - b.position.x, y: p.y - b.position.y };
    active.from = { x: b.position.x, y: b.position.y };
    active.track = [{ t: performance.now(), x: b.position.x, y: b.position.y }];
    Body.setStatic(b, true);
  } else {
    const s = hit.shape;
    active.shape = s;
    active.before = serializeShape(s);
    active.lastP = p;
    select(s);
  }
}

function dragMove(p, e) {
  const a = active;
  if (a.ball) {
    const b = a.ball;
    if (b.removed) return;
    const np = { x: clamp(p.x - a.off.x, -50, stage.W + 50), y: clamp(p.y - a.off.y, -50, stage.H + 50) };
    Body.setPosition(b, np);
    a.track.push({ t: performance.now(), x: np.x, y: np.y });
    if (a.track.length > 8) a.track.shift();
  } else if (a.shape && a.shape.inWorld) {
    if (!a.dragging && movedPx(a, e) < TAP_PX) return;
    a.dragging = true;
    moveShape(a.shape, p.x - a.lastP.x, p.y - a.lastP.y);
    a.lastP = p;
  }
}

function endMove(a, e, cancelled) {
  if (a.ball) {
    const b = a.ball;
    Body.setStatic(b, false);
    const tr = a.track, now = performance.now();
    const old = tr.find(q => now - q.t < 90) || tr[tr.length - 1];
    const dtf = Math.max(1, (now - old.t) / (1000 / 60));
    let vx = (b.position.x - old.x) / dtf, vy = (b.position.y - old.y) / dtf;
    const max = settings.world.maxSpeed, sp = Math.hypot(vx, vy);
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    Body.setVelocity(b, game.running ? { x: vx, y: vy } : { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    if (Math.hypot(b.position.x - a.from.x, b.position.y - a.from.y) > 0.5) {
      history.push(cmd.moveBall(b, a.from, { x: b.position.x, y: b.position.y }));
    }
  } else if (a.shape) {
    if (a.dragging) {
      if (a.shape.inWorld) history.push(cmd.editShape(a.shape, a.before, serializeShape(a.shape)));
    } else if (!cancelled && a.shape.inWorld) {
      onInspect(a.shape);
    }
  }
}

// ─── DRAW ───
function finishShape(a) {
  const pv = view.preview;
  if (!pv) return;
  const { x1, y1, x2, y2 } = pv;
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  let s = null;
  if (a.tool === 'line') {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len >= 10) s = createShape({ kind: 'line', x: (x1 + x2) / 2, y: (y1 + y2) / 2, angle: Math.atan2(y2 - y1, x2 - x1), len, thick: 8 });
  } else if (a.tool === 'rect') {
    if (w >= 10 && h >= 10) s = createShape({ kind: 'rect', x: (x1 + x2) / 2, y: (y1 + y2) / 2, w, h });
  } else if (a.tool === 'tri') {
    if (w >= 15 && h >= 15) s = createShape({ kind: 'tri', x: (x1 + x2) / 2, y: (y1 + y2) / 2, w, h });
  } else if (a.tool === 'ring') {
    const r = Math.hypot(x2 - x1, y2 - y1);
    if (r >= 12) s = createShape({ kind: 'ring', x: x1, y: y1, r, thick: 10 });
  }
  if (!s) return;
  addShape(s);
  history.push(cmd.addShape(s));
}

// ─── ERASE ───
function eraseAt(p) {
  const hit = pickAt(p.x, p.y, 12);
  if (!hit) return;
  if (hit.ball) {
    removeBall(hit.ball);
    active.cmds.push(cmd.removeBall(hit.ball));
  } else {
    removeShape(hit.shape);
    active.cmds.push(cmd.removeShape(hit.shape));
  }
}

// ─── RUBBER ───
function rubberAt(p) {
  for (const s of scene.shapes.slice()) {
    if (Math.hypot(p.x - s.x, p.y - s.y) > s.radius + RUBBER_R) continue;
    if (!active.snap.has(s)) active.snap.set(s, serializeShape(s));
    if (cutShape(s, p.x, p.y, RUBBER_R) && isEmptyShape(s)) removeShape(s);
  }
}

function finishRubber(a) {
  const list = [];
  for (const [s, before] of a.snap) {
    if (!s.inWorld) {
      list.push({
        undo: () => { restoreShape(s, before); addShape(s); },
        redo: () => removeShape(s),
      });
    } else if (s.cuts.length !== before.cuts.length) {
      list.push(cmd.editShape(s, before, serializeShape(s)));
    }
  }
  history.push(cmd.batch(list));
  view.cursor = null;
}
