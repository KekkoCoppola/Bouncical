/* ========== Bouncical — rules/actions.js ========== */
/* Executes rule actions against the live game. Actions never touch the
   world during a physics step (the engine dispatches after the step), and
   every ball-creating action respects the global ball limit. */

import { settings } from '../config.js';
import { stage } from '../stage.js';
import { rt, applyGravity, rebuildWalls, velocityOf } from '../physics.js';
import { scene } from '../scene.js';
import { setBallRadius, MIN_R } from '../balls.js';
import { setShapeScale, restoreShape, serializeShape, outlineWorld, stopShapeMotion } from '../shapes.js';
import { playNotes, randomScaleNote, scaleMidis } from '../audio.js';
import { hitSound } from '../song.js';
import { TRIGGERS } from './catalog.js';
import { clamp, rand, wrapHue, wrapDeg, TAU, DEG } from '../util.js';
import * as fx from '../fx.js';

const { Body } = Matter;

// Hooks provided by main.js (spawning needs the scene + events plumbing).
let game = null;
export function bindGame(g) { game = g; }

const MAX_BALL_TARGETS = 250;

// ─── TARGETS ───
function ballTargets(rule, ev) {
  if (ev.ball) return ev.ball.removed ? [] : [ev.ball];
  if (TRIGGERS[rule.trigger.type].ball) return [];
  return scene.balls.slice(0, MAX_BALL_TARGETS);
}

function shapeTargets(rule, ev) {
  if (ev.shape) return ev.shape.inWorld ? [ev.shape] : [];
  if (TRIGGERS[rule.trigger.type].ball && rule.trigger.type !== 'escape') {
    // Ball triggers without a shape (wall/ball hits): nothing to act on.
    return [];
  }
  const kind = rule.trigger.shape || 'any';
  return scene.shapes.filter(s => kind === 'any' || s.kind === kind);
}

function eventPoint(ev) {
  if (ev.x != null) return { x: ev.x, y: ev.y };
  if (ev.ball) return { x: ev.ball.position.x, y: ev.ball.position.y };
  return { x: stage.W / 2, y: stage.H / 2 };
}

function where(kind, ev, ball, p = {}) {
  const W = stage.W, H = stage.H, m = 30;
  switch (kind) {
    case 'here': return eventPoint(ev);
    case 'center': return { x: W / 2 + rand(-4, 4), y: H / 2 + rand(-4, 4) };
    case 'random': return { x: rand(m, W - m), y: rand(m, H - m) };
    case 'point': return { x: (clamp(p.x, 0, 100) / 100) * W, y: (clamp(p.y, 0, 100) / 100) * H };
    case 'spawn': return ball ? { x: ball.spawn.x, y: ball.spawn.y } : { x: rand(m, W - m), y: 24 };
    default: return { x: rand(m, W - m), y: 24 }; // top
  }
}

function speedOf(b) { const v = velocityOf(b); return Math.hypot(v.x, v.y); }
function setSpeed(b, k) {
  const v = velocityOf(b);
  const max = settings.world.maxSpeed * 1.6;
  let x = v.x * k, y = v.y * k;
  const sp = Math.hypot(x, y);
  if (sp > max) { x *= max / sp; y *= max / sp; }
  Body.setVelocity(b, { x, y });
}

function interpolate(text, rule, ev) {
  return String(text)
    .replace(/\{hits\}/g, ev.ball ? ev.ball.hits : 0)
    .replace(/\{balls\}/g, scene.balls.length)
    .replace(/\{n\}/g, rule.state.fired);
}

// ─── BALL ACTIONS ───
const BALL = {
  'ball.color'(b, a) {
    if (a.mode === 'set') b.hue = a.hue;
    else if (a.mode === 'next') b.hue = wrapHue(b.hue + 40);
    else if (a.mode === 'rainbow') { b.hue = wrapHue(b.hue + 25); }
    else b.hue = wrapHue(b.hue + 60 + Math.random() * 240);
  },
  'ball.grow'(b, a) {
    const r = b.circleRadius;
    if (r >= a.max) return;
    setBallRadius(b, Math.min(a.max, r * (1 + a.percent / 100)));
  },
  'ball.shrink'(b, a) {
    const r = b.circleRadius * (1 - a.percent / 100);
    if (r <= a.min) {
      if (a.pop) { fx.pop(b.position.x, b.position.y, b.hue, b.circleRadius); game.removeBall(b); return; }
      setBallRadius(b, Math.max(MIN_R, a.min));
      return;
    }
    setBallRadius(b, r);
  },
  'ball.faster'(b, a) { setSpeed(b, 1 + a.percent / 100); },
  'ball.slower'(b, a) { setSpeed(b, 1 - a.percent / 100); },
  'ball.bounce'(b, a) {
    const v = a.mode === 'set' ? a.value : b.restitution + (a.mode === 'less' ? -a.value : a.value);
    b.restitution = clamp(v, 0, 1.5);
  },
  'ball.reverse'(b) { const v = velocityOf(b); Body.setVelocity(b, { x: -v.x, y: -v.y }); },
  'ball.launch'(b, a) {
    const W = stage.W, H = stage.H;
    let ang;
    switch (a.dir) {
      case 'down': ang = 90; break;
      case 'left': ang = 180; break;
      case 'right': ang = 0; break;
      case 'random': ang = rand(0, 360); break;
      case 'center': ang = Math.atan2(H / 2 - b.position.y, W / 2 - b.position.x) / DEG; break;
      case 'away': ang = Math.atan2(b.position.y - H / 2, b.position.x - W / 2) / DEG; break;
      default: ang = 270 + rand(-8, 8);
    }
    const p = Math.min(a.power, settings.world.maxSpeed * 1.6);
    Body.setVelocity(b, { x: Math.cos(ang * DEG) * p, y: Math.sin(ang * DEG) * p });
  },
  'ball.stop'(b) { Body.setVelocity(b, { x: 0, y: 0 }); Body.setAngularVelocity(b, 0); },
  'ball.clone'(b, a) {
    for (let i = 0; i < a.count; i++) {
      const ang = rand(0, TAU), sp = Math.max(2, speedOf(b));
      const c = game.spawnBall({
        x: b.position.x + Math.cos(ang) * 2, y: b.position.y + Math.sin(ang) * 2,
        r: b.circleRadius, hue: wrapHue(b.hue + rand(-30, 30)),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, source: 'rule',
      });
      if (!c) break;
      c.trailOn = b.trailOn;
    }
  },
  'ball.explode'(b, a) {
    const pos = { x: b.position.x, y: b.position.y };
    const r = Math.max(MIN_R, b.circleRadius * (a.size / 100));
    const hue = b.hue;
    game.removeBall(b);
    fx.burst(pos.x, pos.y, hue, 'sparks', 18);
    fx.shockwave(pos.x, pos.y, hue, r * 6, 0.4);
    for (let i = 0; i < a.count; i++) {
      const ang = (TAU * i) / a.count + rand(-0.2, 0.2), sp = rand(4, 8);
      const c = game.spawnBall({
        x: pos.x + Math.cos(ang) * r * 1.2, y: pos.y + Math.sin(ang) * r * 1.2, r,
        hue: wrapHue(hue + i * (360 / a.count)), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, source: 'rule',
      });
      if (!c) break;
    }
  },
  'ball.remove'(b) {
    fx.pop(b.position.x, b.position.y, b.hue, b.circleRadius);
    game.removeBall(b);
  },
  'ball.respawn'(b, a, ev) {
    const p = where(a.where, ev, b);
    Body.setPosition(b, p);
    Body.setVelocity(b, { x: b.spawn.vx || 0, y: b.spawn.vy || 0 });
    if (a.grow) setBallRadius(b, b.circleRadius * (1 + a.grow / 100));
    b.trail.length = 0;
    b.ringIn.clear();
    fx.pop(p.x, p.y, b.hue, b.circleRadius);
  },
  'ball.teleport'(b, a, ev) {
    const p = where(a.where, ev, b);
    fx.pop(b.position.x, b.position.y, b.hue, b.circleRadius);
    Body.setPosition(b, p);
    b.trail.length = 0;
    b.ringIn.clear();
    fx.pop(p.x, p.y, b.hue, b.circleRadius);
  },
  'ball.note'(b, a) { b.noteShift = clamp(b.noteShift + (a.dir === 'down' ? -a.steps : a.steps), -24, 24); },
  'ball.trail'(b, a) { b.trailOn = a.on; if (!a.on) b.trail.length = 0; },
  'ball.strings'(b, a, ev) {
    if (!b.strings) b.strings = [];
    if (ev.x != null) {
      b.strings.push(ev.x, ev.y);
      const extra = b.strings.length / 2 - a.max;
      if (extra > 0) b.strings.splice(0, extra * 2);
    }
  },
};

// ─── SHAPE ACTIONS ───
const SHAPE = {
  'shape.spin'(s, a) {
    switch (a.mode) {
      case 'stop': s.spin = 0; stopShapeMotion(s); break;
      case 'reverse': s.spin = -s.spin || -90; break;
      case 'faster': s.spin = (s.spin || 60) * (1 + a.percent / 100); break;
      case 'slower': s.spin = s.spin * (1 - a.percent / 100); if (Math.abs(s.spin) < 1) { s.spin = 0; stopShapeMotion(s); } break;
      case 'ccw': s.spin = -a.speed; break;
      default: s.spin = a.speed;
    }
    s.spin = clamp(s.spin, -1440, 1440);
  },
  'shape.grow'(s, a) {
    if (s.radius >= a.max) return;
    const k = Math.min(1 + a.percent / 100, a.max / Math.max(1, s.radius));
    setShapeScale(s, s.scale * k);
  },
  'shape.shrink'(s, a) {
    const k = 1 - a.percent / 100;
    if (s.radius * k <= a.min) {
      if (a.pop) { breakShape(s); return; }
      setShapeScale(s, s.scale * Math.max(0.05, a.min / Math.max(1, s.radius)));
      return;
    }
    setShapeScale(s, s.scale * k);
  },
  'shape.color'(s, a, ev) {
    if (a.mode === 'ball') s.hue = ev.ball ? ev.ball.hue : s.hue;
    else if (a.mode === 'set') s.hue = a.hue;
    else if (a.mode === 'white') s.hue = null;
    else if (a.mode === 'next') s.hue = wrapHue((s.hue ?? 0) + 40);
    else s.hue = Math.floor(Math.random() * 360);
  },
  'shape.break'(s) { breakShape(s); },
  'shape.gap'(s, a) {
    if (s.kind !== 'ring') return;
    let g = s.gap;
    if (a.mode === 'close') g = 0;
    else if (a.mode === 'open') g = a.degrees;
    else if (a.mode === 'narrow') g = Math.max(0, g - a.degrees);
    else g = Math.min(300, g + a.degrees);
    if (g === s.gap) return;
    restoreShape(s, { ...serializeShape(s), gap: g });
  },
};

function breakShape(s) {
  if (!s.inWorld) return;
  fx.shatter(outlineWorld(s), s.hue, s.x, s.y);
  fx.shake(6);
  game.removeShape(s);
}

// ─── WORLD / FX / SOUND ───
function worldAction(a, rule, ev) {
  switch (a.type) {
    case 'world.gravity': {
      if (a.mode === 'flip') rt.gravityAngle = wrapDeg(rt.gravityAngle + 180);
      else if (a.mode === 'stronger') rt.gravity = clamp(rt.gravity + a.amount, 0, 5);
      else if (a.mode === 'weaker') rt.gravity = clamp(rt.gravity - a.amount, 0, 5);
      else if (a.mode === 'set') { rt.gravity = a.strength; rt.gravityAngle = a.angle; }
      else if (a.mode === 'rotate') rt.gravityAngle = wrapDeg(rt.gravityAngle + a.degrees);
      else if (a.mode === 'random') { rt.gravityAngle = rand(0, 360); if (rt.gravity < 0.3) rt.gravity = settings.world.gravity || 1; }
      else if (a.mode === 'zero') rt.gravity = 0;
      else { rt.gravity = settings.world.gravity; rt.gravityAngle = settings.world.gravityAngle; }
      applyGravity();
      break;
    }
    case 'world.time':
      rt.slowmo = { scale: a.scale, until: a.duration > 0 ? performance.now() + a.duration * 1000 : Infinity };
      break;
    case 'world.spawn': {
      const src = ev.ball || null;
      for (let i = 0; i < a.count; i++) {
        const p = where(a.where, ev, src, a);
        const ang = rand(0, TAU);
        const b = game.spawnBall({
          x: p.x + (a.count > 1 ? rand(-6, 6) : 0), y: p.y + (a.count > 1 ? rand(-6, 6) : 0),
          r: a.size > 0 ? a.size : undefined,
          vx: a.speed ? Math.cos(ang) * a.speed : 0, vy: a.speed ? Math.sin(ang) * a.speed : 0,
          source: 'rule',
        });
        if (!b) break;
      }
      break;
    }
    case 'world.clear':
      for (const b of [...scene.balls]) { fx.pop(b.position.x, b.position.y, b.hue, b.circleRadius); game.removeBall(b); }
      break;
    case 'world.pause':
      game.pause();
      break;
    case 'world.bounds': {
      const keys = a.which === 'all' ? ['left', 'right', 'floor', 'ceiling'] : a.which === 'walls' ? ['left', 'right'] : [a.which];
      for (const k of keys) rt.bounds[k] = a.state === 'toggle' ? !rt.bounds[k] : a.state === 'on';
      rebuildWalls();
      break;
    }
    case 'fx.burst': { const p = eventPoint(ev); fx.burst(p.x, p.y, ev.ball ? ev.ball.hue : null, a.style, a.amount); break; }
    case 'fx.shake': fx.shake(a.power); break;
    case 'fx.flash': fx.flash(a.color === 'white' ? null : a.color === 'set' ? a.hue : ev.ball ? ev.ball.hue : null, 0.7); break;
    case 'fx.wave': { const p = eventPoint(ev); fx.shockwave(p.x, p.y, ev.ball ? ev.ball.hue : null, a.size, 0.6); break; }
    case 'fx.text': {
      const p = eventPoint(ev);
      fx.text(p.x, p.y - 14, interpolate(a.text, rule, ev), ev.ball ? ev.ball.hue : null, a.size);
      break;
    }
    case 'sound.note': {
      if (a.which === 'next') {
        const p = eventPoint(ev);
        hitSound({ y: p.y, H: stage.H, impact: 6, ball: ev.ball, shape: ev.shape });
      } else {
        const notes = scaleMidis();
        const m = a.which === 'high' ? notes[notes.length - 1 - Math.floor(Math.random() * 3)]
          : a.which === 'low' ? notes[Math.floor(Math.random() * 3)] : randomScaleNote();
        playNotes([m], 0.8, 0.35);
      }
      break;
    }
  }
}

// ─── ENTRY POINT (engine execute callback) ───
export function executeRule(rule, ev) {
  for (const a of rule.actions) {
    if (a.type.startsWith('ball.')) {
      for (const b of ballTargets(rule, ev)) if (!b.removed) BALL[a.type](b, a, ev);
    } else if (a.type.startsWith('shape.')) {
      for (const s of shapeTargets(rule, ev)) if (s.inWorld) SHAPE[a.type](s, a, ev);
    } else {
      worldAction(a, rule, ev);
    }
  }
}
