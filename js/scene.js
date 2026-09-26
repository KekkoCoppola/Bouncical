/* ========== Bouncical — scene.js ========== */
/* Registry of shapes and balls + undo/redo. Commands keep references to
   the entities themselves (and serialized snapshots for edits), so undo
   always restores a complete, drawable object. */

import { world } from './physics.js';
import { restoreShape } from './shapes.js';
import { arrayRemove } from './util.js';

const { Composite, Body } = Matter;

export const scene = { shapes: [], balls: [] };

// ─── REGISTRY ───
export function addShape(s) {
  if (s.inWorld) return;
  scene.shapes.push(s);
  s.inWorld = true;
  if (s.bodies.length) Composite.add(world, s.bodies);
}

export function removeShape(s) {
  if (!s.inWorld) return;
  arrayRemove(scene.shapes, s);
  s.inWorld = false;
  if (s.bodies.length) Composite.remove(world, s.bodies);
}

export function addBall(b) {
  if (!b.removed && scene.balls.includes(b)) return;
  b.removed = false;
  scene.balls.push(b);
  Composite.add(world, b);
}

export function removeBall(b) {
  if (b.removed) return false;
  b.removed = true;
  arrayRemove(scene.balls, b);
  Composite.remove(world, b);
  return true;
}

export function isEmpty() { return !scene.shapes.length && !scene.balls.length; }

// Remove everything without history (templates, format changes).
export function wipe() {
  [...scene.shapes].forEach(removeShape);
  [...scene.balls].forEach(removeBall);
}

// ─── HISTORY ───
const undoStack = [], redoStack = [];
const LIMIT = 150;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

export const history = {
  onChange(fn) { listeners.add(fn); },
  push(cmd) {
    if (!cmd) return;
    undoStack.push(cmd);
    if (undoStack.length > LIMIT) undoStack.shift();
    redoStack.length = 0;
    notify();
  },
  undo() {
    const c = undoStack.pop();
    if (!c) return;
    c.undo();
    redoStack.push(c);
    notify();
  },
  redo() {
    const c = redoStack.pop();
    if (!c) return;
    c.redo();
    undoStack.push(c);
    notify();
  },
  clear() { undoStack.length = 0; redoStack.length = 0; notify(); },
  get canUndo() { return undoStack.length > 0; },
  get canRedo() { return redoStack.length > 0; },
};

function freezeBall(b) {
  Body.setVelocity(b, { x: 0, y: 0 });
  Body.setAngularVelocity(b, 0);
}

export const cmd = {
  addShape: s => ({ undo: () => removeShape(s), redo: () => addShape(s) }),
  removeShape: s => ({ undo: () => addShape(s), redo: () => removeShape(s) }),
  addBall: b => ({ undo: () => removeBall(b), redo: () => { addBall(b); } }),
  removeBall: b => ({ undo: () => { freezeBall(b); addBall(b); }, redo: () => removeBall(b) }),
  editShape: (s, before, after) => ({
    undo: () => restoreShape(s, before),
    redo: () => restoreShape(s, after),
  }),
  moveBall: (b, from, to) => ({
    undo: () => { Body.setPosition(b, from); freezeBall(b); },
    redo: () => { Body.setPosition(b, to); freezeBall(b); },
  }),
  batch: list => (list.length ? {
    undo: () => [...list].reverse().forEach(c => c.undo()),
    redo: () => list.forEach(c => c.redo()),
  } : null),
};
