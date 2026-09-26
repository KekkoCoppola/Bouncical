/* ========== Bouncical — fx.js ========== */
/* Special effects: pooled particles (sparks, dots, confetti, stars, shards),
   shockwave rings, floating text, screen shake, flash and background pulse.
   Glow uses pre-rendered sprites + additive blending instead of shadowBlur. */

import { settings } from './config.js';
import { TAU, clamp, rand, pick, wrapHue, hsl } from './util.js';

const BUDGET = { low: 260, medium: 700, high: 1600 };
let load = 1; // adaptive budget factor (drops when frames get slow)

// ─── SPRITES ───
const glowCache = new Map();
export function glowSprite(hue) {
  const key = hue == null ? 'w' : Math.round(wrapHue(hue) / 6);
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (key === 'w') {
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    const h = key * 6;
    grd.addColorStop(0, hsl(h, 100, 92, 1));
    grd.addColorStop(0.22, hsl(h, 100, 65, 0.6));
    grd.addColorStop(0.55, hsl(h, 100, 55, 0.18));
    grd.addColorStop(1, hsl(h, 100, 50, 0));
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(key, c);
  return c;
}

const colorCache = new Map();
function col(hue, light, a) {
  const key = ((Math.round(wrapHue(hue) / 6) * 101 + light) * 12) + Math.round(a * 10);
  let s = colorCache.get(key);
  if (!s) { s = hsl(Math.round(wrapHue(hue) / 6) * 6, 100, light, Math.round(a * 10) / 10); colorCache.set(key, s); }
  return s;
}

// ─── STATE ───
const P = [];        // particle pool
let count = 0;
const rings = [];
const texts = [];
const shakeState = { t: 0, time: 0, x: 0, y: 0 };
const flashState = { a: 0, hue: null };
export const pulse = { e: 0, hue: 180 };

function budget() {
  return Math.floor((BUDGET[settings.fx.quality] || BUDGET.high) * load);
}

function spawn(type, x, y, vx, vy, life, size, hue) {
  if (count >= budget()) return null;
  let p = P[count];
  if (!p) { p = {}; P[count] = p; }
  count++;
  p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.age = 0; p.size = size; p.hue = hue;
  p.g = 0; p.drag = 2.5; p.rot = 0; p.vr = 0; p.light = 65; p.pts = null;
  return p;
}

const amount = () => (settings.fx.particles ? settings.fx.particleAmount : 0);

// ─── EMITTERS ───
// Impact sparks around the bounce normal; count scales with impact speed.
export function impact(x, y, hue, speed, nx = 0, ny = -1) {
  const n = Math.round(clamp(2 + speed * 1.1, 2, 20) * amount());
  const base = Math.atan2(ny, nx);
  for (let i = 0; i < n; i++) {
    const a = base + rand(-1.25, 1.25);
    const v = rand(60, 140) + speed * rand(8, 22);
    const p = spawn(i % 3 ? 'spark' : 'dot', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.25, 0.55), rand(1.2, 2.4), hue + rand(-20, 20));
    if (p) { p.g = 220; p.drag = 3.2; }
  }
  if (settings.fx.impactRings && speed > 2.2) shockwave(x, y, hue, 8 + speed * 2.2, 0.35);
}

export function burst(x, y, hue, style = 'sparks', n = 30) {
  n = Math.round(n * Math.max(0.2, amount() || 0.2));
  if (style === 'confetti') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(80, 320);
      const p = spawn('confetti', x, y, Math.cos(a) * v, Math.sin(a) * v - 120, rand(1.1, 2.2), rand(3, 5.5), rand(0, 360));
      if (p) { p.g = 380; p.drag = 1.6; p.rot = rand(0, TAU); p.vr = rand(-14, 14); p.light = 62; }
    }
  } else if (style === 'firework') {
    const h0 = hue ?? rand(0, 360);
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n + rand(-0.05, 0.05), v = rand(170, 250);
      const p = spawn(i % 2 ? 'spark' : 'dot', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.8, 1.3), rand(1.6, 2.8), h0 + rand(-25, 25));
      if (p) { p.g = 120; p.drag = 1.4; }
    }
    shockwave(x, y, h0, 70, 0.5);
  } else if (style === 'stars') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(40, 190);
      const p = spawn('star', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.7, 1.4), rand(3, 6), (hue ?? 50) + rand(-30, 30));
      if (p) { p.g = 60; p.drag = 2; p.rot = rand(0, TAU); p.vr = rand(-6, 6); }
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(90, 330);
      const p = spawn(i % 3 ? 'spark' : 'dot', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.35, 0.8), rand(1.4, 2.8), (hue ?? 40) + rand(-25, 25));
      if (p) { p.g = 160; p.drag = 2.4; }
    }
  }
}

export function shockwave(x, y, hue, size = 60, life = 0.5) {
  if (rings.length > 80) rings.shift();
  rings.push({ x, y, r1: size, hue, life, age: 0 });
}

export function pop(x, y, hue, r) {
  shockwave(x, y, hue, r * 2.4, 0.3);
  const n = Math.round(6 * amount());
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(30, 90);
    spawn('dot', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.2, 0.4), rand(1, 2), hue);
  }
}

// Shards flying off an outline (a shape breaking).
export function shatter(points, hue, cx, cy) {
  const n = Math.min(points.length, Math.round(60 * Math.max(0.3, amount() || 0.3)));
  for (let i = 0; i < n; i++) {
    const pt = points[Math.floor((i * points.length) / n)];
    const dx = pt.x - cx, dy = pt.y - cy, d = Math.hypot(dx, dy) || 1;
    const v = rand(60, 220);
    const p = spawn('shard', pt.x, pt.y, (dx / d) * v + rand(-40, 40), (dy / d) * v + rand(-60, 20), rand(0.8, 1.5), rand(4, 9), hue ?? 0);
    if (p) {
      p.g = 420; p.drag = 1; p.rot = rand(0, TAU); p.vr = rand(-10, 10);
      p.pts = [rand(-1, 1), rand(-1, -0.3), rand(0.4, 1), rand(0.2, 1), rand(-1, -0.2), rand(0.2, 1)];
      p.light = hue == null ? 100 : 68;
    }
  }
  shockwave(cx, cy, hue, 80, 0.55);
}

export function text(x, y, str, hue, size = 16) {
  if (texts.length > 40) texts.shift();
  texts.push({ x, y, str: String(str).slice(0, 40), hue, size, life: 1.1, age: 0 });
}

export function shake(power = 8) {
  if (!settings.fx.shake) return;
  shakeState.t = clamp(shakeState.t + power / 24, 0, 1);
}

export function flash(hue = null, strength = 0.6) {
  flashState.a = clamp(Math.max(flashState.a, strength), 0, 1);
  flashState.hue = hue;
}

export function notePulse(hue, strength = 0.35) {
  if (!settings.fx.bgPulse) return;
  pulse.e = clamp(pulse.e + strength, 0, 1);
  pulse.hue = hue;
}

export function clear() {
  count = 0;
  rings.length = 0;
  texts.length = 0;
  shakeState.t = 0;
  flashState.a = 0;
  pulse.e = 0;
}

// Adaptive budget: called with the last frame time in ms.
export function reportFrame(ms) {
  if (ms > 24) load = Math.max(0.3, load * 0.97);
  else if (ms < 17) load = Math.min(1, load + 0.01);
}

export const particleCount = () => count;

// ─── UPDATE ───
export function update(dt) {
  for (let i = 0; i < count; i++) {
    const p = P[i];
    p.age += dt;
    if (p.age >= p.life) {
      count--;
      P[i] = P[count];
      P[count] = p;
      i--;
      continue;
    }
    const d = Math.exp(-p.drag * dt);
    p.vx *= d;
    p.vy = p.vy * d + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dt;
    if (rings[i].age >= rings[i].life) rings.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.age += dt;
    t.y -= 38 * dt;
    if (t.age >= t.life) texts.splice(i, 1);
  }
  shakeState.time += dt;
  shakeState.t = Math.max(0, shakeState.t - dt * 1.7);
  const m = shakeState.t * shakeState.t * 16 * settings.fx.shakeAmount;
  const tt = shakeState.time;
  shakeState.x = m * (Math.sin(tt * 53.1) * 0.6 + Math.sin(tt * 91.7) * 0.4);
  shakeState.y = m * (Math.sin(tt * 61.3) * 0.6 + Math.sin(tt * 77.9) * 0.4);
  flashState.a = Math.max(0, flashState.a - dt * 3.2);
  pulse.e = Math.max(0, pulse.e - dt * 2.2);
}

export const shakeOffset = () => shakeState;

// ─── RENDER ───
export function render(ctx) {
  const glow = settings.fx.glow;
  // Solid pieces first (confetti, shards), then additive light.
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < count; i++) {
    const p = P[i];
    if (p.type !== 'confetti' && p.type !== 'shard') continue;
    const a = 1 - p.age / p.life;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.light >= 100 ? `rgba(255,255,255,${a.toFixed(2)})` : col(p.hue, p.light, a);
    if (p.type === 'confetti') {
      ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) + 0.15);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      const q = p.pts, s = p.size;
      ctx.beginPath();
      ctx.moveTo(q[0] * s, q[1] * s);
      ctx.lineTo(q[2] * s, q[3] * s);
      ctx.lineTo(q[4] * s, q[5] * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const p = P[i];
    const a = 1 - p.age / p.life;
    if (p.type === 'spark') {
      ctx.strokeStyle = col(p.hue, 68, a);
      ctx.lineWidth = p.size * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (p.type === 'dot') {
      if (glow) {
        const s = p.size * 5 * (0.6 + a * 0.4);
        ctx.globalAlpha = a;
        ctx.drawImage(glowSprite(p.hue), p.x - s / 2, p.y - s / 2, s, s);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = col(p.hue, 70, a);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    } else if (p.type === 'star') {
      const s = p.size * (0.5 + 0.5 * Math.abs(Math.sin(p.age * 12 + i)));
      ctx.fillStyle = col(p.hue, 78, a);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const r = k % 2 ? s * 0.35 : s;
        const an = (k * Math.PI) / 4;
        ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  for (const r of rings) {
    const t = r.age / r.life;
    const e = 1 - (1 - t) * (1 - t) * (1 - t);
    ctx.strokeStyle = r.hue == null ? `rgba(255,255,255,${(1 - t) * 0.7})` : col(r.hue, 70, (1 - t) * 0.85);
    ctx.lineWidth = 2.5 * (1 - t) + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 2 + r.r1 * e, 0, TAU);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  if (texts.length) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of texts) {
      const a = 1 - t.age / t.life;
      ctx.font = `700 ${t.size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = t.hue == null ? `rgba(255,255,255,${a.toFixed(2)})` : col(t.hue, 78, a);
      ctx.fillText(t.str, t.x, t.y);
    }
  }
}

export function renderFlash(ctx, w, h) {
  if (flashState.a <= 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = flashState.hue == null
    ? `rgba(255,255,255,${(flashState.a * 0.55).toFixed(3)})`
    : hsl(flashState.hue, 100, 60, flashState.a * 0.45);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

export const randomBurstStyle = () => pick(['sparks', 'confetti', 'firework', 'stars']);
