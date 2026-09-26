/* ========== Bouncical — balls.js ========== */
/* Dynamic balls: creation from world settings, per-ball runtime state. */

import { settings } from './config.js';
import { rt } from './physics.js';
import { clamp, rand, wrapHue } from './util.js';

const { Bodies, Body } = Matter;

export const MIN_R = 2;
export const MAX_R = 220;
let rainbowHue = Math.random() * 360;

export function nextBallHue() {
  const mode = settings.world.ballColor;
  if (mode === 'rainbow') { rainbowHue = wrapHue(rainbowHue + 27); return rainbowHue; }
  if (mode !== 'random' && isFinite(+mode)) return +mode;
  return Math.random() * 360;
}

export function defaultRadius() {
  const w = settings.world;
  const v = (w.ballSizeVar / 100) * w.ballSize;
  return clamp(w.ballSize + rand(-v, v), MIN_R, MAX_R);
}

export function createBall({ x, y, r, hue, vx = 0, vy = 0, source = 'user' }) {
  const w = settings.world;
  r = clamp(r || defaultRadius(), MIN_R, MAX_R);
  const b = Bodies.circle(x, y, r, {
    restitution: w.ballBounce,
    friction: w.ballFriction,
    frictionStatic: 0.2,
    frictionAir: w.ballAir,
    density: 0.002,
    label: 'ball',
  });
  b.kind = 'ball';
  b.hue = hue == null ? nextBallHue() : wrapHue(hue);
  b.hits = 0;
  b.noteShift = 0;
  b.trail = [];
  b.trailOn = false;       // forced on by a rule even if global trails are off
  b.strings = null;        // anchor points for the "string art" effect
  b.ringIn = new Map();    // ring id → 'in' | 'out'
  b.ruleCounts = null;     // per-ball rule counters
  b.born = rt.simTime;
  b.source = source;
  b.removed = false;
  b.spawn = { x, y, vx, vy, r };
  b.collisionFilter.group = w.ballCollisions ? 0 : -1;
  if (vx || vy) Body.setVelocity(b, { x: vx, y: vy });
  return b;
}

export function setBallRadius(b, r) {
  r = clamp(r, MIN_R, MAX_R);
  const k = r / b.circleRadius;
  if (Math.abs(k - 1) < 1e-4) return;
  Body.scale(b, k, k);
}

// Apply world material settings to an existing ball.
export function applyBallMaterial(b) {
  const w = settings.world;
  b.restitution = w.ballBounce;
  b.friction = w.ballFriction;
  b.frictionAir = w.ballAir;
  b.collisionFilter.group = w.ballCollisions ? 0 : -1;
}
