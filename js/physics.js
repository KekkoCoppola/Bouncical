/* ========== Bouncical — physics.js ========== */
/* Matter.js engine with a fixed 120 Hz timestep. Collisions are queued
   during the step and handled afterwards, so sounds, effects and rules
   never modify the world while Matter is still resolving it. */

import { settings } from './config.js';
import { stage } from './stage.js';
import { DEG } from './util.js';

const { Engine, Bodies, Body, Composite, Events, Common } = Matter;
if (window.decomp && Common.setDecomp) Common.setDecomp(window.decomp);

export const STEP_MS = 1000 / 120;
const BASE_MS = 1000 / 60;
const MAX_STEPS = 8;

export const engine = Engine.create({ positionIterations: 8, velocityIterations: 8, enableSleeping: false });
engine.gravity.scale = 0.001;
export const world = engine.world;

// Collision events collected during the last physics steps.
export const queue = [];

// Runtime state rules may change; reset from settings by resetRuntime().
export const rt = {
  gravity: 1.2,
  gravityAngle: 90,
  bounds: { left: true, right: true, floor: false, ceiling: false },
  slowmo: null,        // { scale, until (performance.now ms) }
  simTime: 0,          // seconds of simulated time
};

let acc = 0;
const walls = {};

// ─── GRAVITY / TIME ───
export function applyGravity() {
  const a = rt.gravityAngle * DEG;
  engine.gravity.x = Math.cos(a) * rt.gravity;
  engine.gravity.y = Math.sin(a) * rt.gravity;
}

export function timeScale() {
  if (rt.slowmo && performance.now() > rt.slowmo.until) rt.slowmo = null;
  return settings.world.timeScale * (rt.slowmo ? rt.slowmo.scale : 1);
}

export function resetRuntime() {
  const w = settings.world;
  rt.gravity = w.gravity;
  rt.gravityAngle = w.gravityAngle;
  rt.bounds = { left: w.wallLeft, right: w.wallRight, floor: w.floor, ceiling: w.ceiling };
  rt.slowmo = null;
  applyGravity();
  rebuildWalls();
}

// ─── BOUNDARIES ───
export function rebuildWalls() {
  for (const k in walls) { Composite.remove(world, walls[k]); delete walls[k]; }
  const W = stage.W, H = stage.H, T = 200;
  const make = (side, x, y, w, h) => {
    const b = Bodies.rectangle(x, y, w, h, { isStatic: true, label: 'wall', friction: 0.1, restitution: 0.5 });
    b.kind = 'wall';
    b.side = side;
    walls[side] = b;
    Composite.add(world, b);
  };
  // Side walls reach far above and below so balls flung upward come back.
  if (rt.bounds.left) make('left', -T / 2, H / 2, T, H * 3);
  if (rt.bounds.right) make('right', W + T / 2, H / 2, T, H * 3);
  if (rt.bounds.floor) make('floor', W / 2, H + T / 2, W + T * 2, T);
  if (rt.bounds.ceiling) make('ceiling', W / 2, -T / 2, W + T * 2, T);
}

// ─── STEPPING ───
// hooks.before(dtMs) runs kinematics, hooks.after(dtMs) clamps speeds.
export function step(realDtMs, hooks) {
  acc += Math.min(realDtMs, 100) * timeScale();
  let n = 0;
  while (acc >= STEP_MS && n < MAX_STEPS) {
    hooks.before(STEP_MS);
    Engine.update(engine, STEP_MS);
    hooks.after(STEP_MS);
    rt.simTime += STEP_MS / 1000;
    acc -= STEP_MS;
    n++;
  }
  if (n >= MAX_STEPS) acc = 0; // drop backlog instead of spiralling
  return n;
}

export function resetAccumulator() { acc = 0; }

// Normalised velocity (per 60 Hz frame), valid for any body state.
export function velocityOf(b) {
  if (b.isStatic) {
    const k = BASE_MS / STEP_MS;
    return { x: b.velocity.x * k, y: b.velocity.y * k };
  }
  return Body.getVelocity(b);
}

// ─── COLLISION QUEUE ───
Events.on(engine, 'collisionStart', ev => {
  for (const pair of ev.pairs) {
    const a = pair.bodyA.parent, b = pair.bodyB.parent;
    const aBall = a.kind === 'ball', bBall = b.kind === 'ball';
    if (!aBall && !bBall) continue;
    const col = pair.collision;
    const sup = col.supports && col.supports[0];
    const nx = col.normal.x, ny = col.normal.y;

    if (aBall && bBall) {
      const va = velocityOf(a), vb = velocityOf(b);
      const impact = Math.abs((va.x - vb.x) * nx + (va.y - vb.y) * ny);
      const x = sup ? sup.x : (a.position.x + b.position.x) / 2;
      const y = sup ? sup.y : (a.position.y + b.position.y) / 2;
      queue.push({ type: 'hit', kind: 'ball', ball: a, other: b, x, y, nx, ny, impact, primary: true });
      queue.push({ type: 'hit', kind: 'ball', ball: b, other: a, x, y, nx: -nx, ny: -ny, impact, primary: false });
      continue;
    }

    const ball = aBall ? a : b, other = aBall ? b : a;
    const kind = other.kind === 'wall' ? 'wall' : other.kind === 'shape' ? 'shape' : null;
    if (!kind) continue;
    const vb = velocityOf(ball), vo = velocityOf(other);
    const impact = Math.abs((vb.x - vo.x) * nx + (vb.y - vo.y) * ny);
    queue.push({
      type: 'hit', kind, ball, other,
      shape: kind === 'shape' ? other.shape : null,
      side: kind === 'wall' ? other.side : null,
      x: sup ? sup.x : ball.position.x,
      y: sup ? sup.y : ball.position.y,
      // Matter's normal points from bodyB toward bodyA; flip it so it
      // always points from the surface toward the ball.
      nx: aBall ? nx : -nx, ny: aBall ? ny : -ny,
      impact, primary: true,
    });
  }
});
