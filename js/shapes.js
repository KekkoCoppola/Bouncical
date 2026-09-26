/* ========== Bouncical — shapes.js ========== */
/* Every static shape (line, rect, triangle, ring) is one entity with:
   - a transform (x, y, angle, scale) and base parameters,
   - `cuts`: rubber-eraser circles in local unscaled coordinates,
   - `poly`: the local outline (PolyBool polygon) used for drawing/picking,
   - `pieces`: convex local polygons turned into static Matter bodies.
   Rebuilding from parameters + cuts is deterministic, which keeps undo,
   templates, scaling and ring gaps consistent. */

import { world } from './physics.js';
import {
  TAU, DEG, clamp, nextId, reserveId, polyArea, pointInPoly, distToPolyEdges,
  circlePts, isConvex,
} from './util.js';

const { Body, Composite, Vertices } = Matter;

export const SHAPE_LABELS = { line: 'Line', rect: 'Rectangle', tri: 'Triangle', ring: 'Circle' };
const RING_SEG_LEN = 14;       // physics segment length along a ring
const CUT_SIDES = 20;          // polygon resolution of a rubber cut

// ─── CREATE / SERIALIZE ───
export function createShape(def) {
  const s = {
    id: 0, kind: 'line', x: 0, y: 0, angle: 0, scale: 1,
    len: 100, thick: 8, w: 80, h: 60, r: 60, gap: 0, gapAt: -90,
    cuts: [], hue: null, bounce: 0.5, friction: 0.3, spin: 0, note: null,
    // runtime
    poly: null, pieces: [], bodies: [], path: null, radius: 0,
    inWorld: false, flash: 0, flashHue: 0, moving: false,
  };
  Object.assign(s, sanitize(def));
  if (s.id) reserveId(s.id); else s.id = nextId();
  rebuild(s);
  return s;
}

const SERIAL_KEYS = ['id', 'kind', 'x', 'y', 'angle', 'scale', 'len', 'thick', 'w', 'h', 'r', 'gap',
  'gapAt', 'hue', 'bounce', 'friction', 'spin', 'note'];

function sanitize(def) {
  const out = {};
  for (const k of SERIAL_KEYS) if (def[k] !== undefined) out[k] = def[k];
  out.cuts = Array.isArray(def.cuts) ? def.cuts.map(c => ({ x: +c.x, y: +c.y, r: +c.r })) : [];
  return out;
}

export function serializeShape(s) {
  const o = {};
  for (const k of SERIAL_KEYS) o[k] = s[k];
  o.cuts = s.cuts.map(c => ({ x: c.x, y: c.y, r: c.r }));
  return o;
}

// Restore a snapshot into the same entity (keeps references valid).
export function restoreShape(s, data) {
  Object.assign(s, sanitize(data));
  rebuild(s);
}

// ─── GEOMETRY ───
function rectPts(hw, hh) { return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]; }

function arcBand(ro, ri, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * ro, Math.sin(a) * ro]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * ri, Math.sin(a) * ri]);
  }
  return pts;
}

function ringQuads(ro, ri, a0, a1, m) {
  const out = [];
  for (let i = 0; i < m; i++) {
    const b0 = a0 + ((a1 - a0) * i) / m, b1 = a0 + ((a1 - a0) * (i + 1)) / m;
    out.push([
      [Math.cos(b0) * ro, Math.sin(b0) * ro], [Math.cos(b1) * ro, Math.sin(b1) * ro],
      [Math.cos(b1) * ri, Math.sin(b1) * ri], [Math.cos(b0) * ri, Math.sin(b0) * ri],
    ]);
  }
  return out;
}

// Base outline + convex physics pieces in local (scaled) coordinates.
function baseGeometry(s) {
  const k = s.scale;
  switch (s.kind) {
    case 'rect': {
      const p = rectPts((s.w * k) / 2, (s.h * k) / 2);
      return { regions: [p], pieces: [p] };
    }
    case 'tri': {
      const hw = (s.w * k) / 2, hh = (s.h * k) / 2;
      const p = [[-hw, hh], [0, -hh], [hw, hh]];
      return { regions: [p], pieces: [p] };
    }
    case 'ring': {
      const R = s.r * k, T = Math.max(2, (s.thick * k) / 2);
      const ro = R + T, ri = Math.max(1, R - T);
      const gap = clamp(s.gap || 0, 0, 300) * DEG;
      if (gap <= 0.001) {
        const n = clamp(Math.round(R * 0.6), 48, 160);
        const m = clamp(Math.ceil((TAU * R) / RING_SEG_LEN), 16, 120);
        return { regions: [circlePts(0, 0, ro, n), circlePts(0, 0, ri, n)], pieces: ringQuads(ro, ri, 0, TAU, m) };
      }
      const a0 = s.gapAt * DEG + gap / 2, a1 = s.gapAt * DEG + TAU - gap / 2;
      const span = a1 - a0;
      const n = clamp(Math.round((R * 0.6 * span) / TAU), 12, 160);
      const m = clamp(Math.ceil((span * R) / RING_SEG_LEN), 3, 120);
      return { regions: [arcBand(ro, ri, a0, a1, n)], pieces: ringQuads(ro, ri, a0, a1, m) };
    }
    default: { // line
      const p = rectPts((s.len * k) / 2, Math.max(1.5, (s.thick * k) / 2));
      return { regions: [p], pieces: [p] };
    }
  }
}

// ─── RUBBER CUTS ───
const asPoly = regions => ({ regions, inverted: false });

function circleHitsPoly(cx, cy, r, pts) {
  return pointInPoly(cx, cy, pts) || distToPolyEdges(cx, cy, pts) < r;
}

function toConvex(reg) {
  if (reg.length < 3 || Math.abs(polyArea(reg)) < 3) return [];
  const pts = reg.map(p => [p[0], p[1]]);
  const d = window.decomp;
  d.removeDuplicatePoints(pts, 0.01);
  d.removeCollinearPoints(pts, 0.001);
  if (pts.length < 3) return [];
  d.makeCCW(pts);
  if (isConvex(pts)) return [pts];
  let parts = d.quickDecomp(pts);
  if (!parts || !parts.length) parts = d.decomp(pts) || [];
  return parts.filter(p => p.length >= 3 && Math.abs(polyArea(p)) > 2);
}

// Region b lies inside region a (i.e. it is a hole of a).
function hasHole(regions) {
  for (let i = 0; i < regions.length; i++) {
    for (let j = 0; j < regions.length; j++) {
      if (i !== j && pointInPoly(regions[j][0][0], regions[j][0][1], regions[i])) return true;
    }
  }
  return false;
}

function subtractFromPiece(piece, circ, cx, cy) {
  const PB = window.PolyBool;
  const res = PB.difference(asPoly([piece]), asPoly([circ]));
  if (!hasHole(res.regions)) return res.regions.flatMap(toConvex);
  // The cut sits fully inside the piece: split the piece through the cut
  // center so each half's result is hole-free.
  const big = 1e5;
  const left = PB.intersect(asPoly([piece]), asPoly([[[cx, -big], [cx, big], [-big, big], [-big, -big]]]));
  const right = PB.intersect(asPoly([piece]), asPoly([[[cx, -big], [big, -big], [big, big], [cx, big]]]));
  const out = [];
  for (const half of [left, right]) {
    if (!half.regions.length) continue;
    out.push(...PB.difference(half, asPoly([circ])).regions.flatMap(toConvex));
  }
  return out;
}

function applyCut(s, cx, cy, r) {
  const circ = circlePts(cx, cy, r, CUT_SIDES);
  s.poly = window.PolyBool.difference(s.poly, asPoly([circ]));
  const out = [];
  for (const p of s.pieces) {
    if (!circleHitsPoly(cx, cy, r, p)) { out.push(p); continue; }
    out.push(...subtractFromPiece(p, circ, cx, cy));
  }
  s.pieces = out;
}

// ─── BUILD ───
export function rebuild(s) {
  const g = baseGeometry(s);
  s.poly = asPoly(g.regions);
  s.pieces = g.pieces.map(p => { const q = p.map(v => [v[0], v[1]]); window.decomp.makeCCW(q); return q; });
  for (const c of s.cuts) applyCut(s, c.x * s.scale, c.y * s.scale, c.r * s.scale);
  updateDerived(s);
  buildBodies(s);
}

function updateDerived(s) {
  let r = 0;
  const path = new Path2D();
  for (const reg of s.poly.regions) {
    if (!reg.length) continue;
    path.moveTo(reg[0][0], reg[0][1]);
    for (let i = 1; i < reg.length; i++) path.lineTo(reg[i][0], reg[i][1]);
    path.closePath();
    for (const p of reg) r = Math.max(r, Math.hypot(p[0], p[1]));
  }
  s.path = path;
  s.radius = r;
}

function buildBodies(s) {
  if (s.inWorld && s.bodies.length) Composite.remove(world, s.bodies);
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  s.bodies = [];
  for (const p of s.pieces) {
    const wv = p.map(([x, y]) => ({ x: s.x + x * c - y * sn, y: s.y + x * sn + y * c }));
    const cen = Vertices.centre(wv);
    if (!isFinite(cen.x) || !isFinite(cen.y)) continue;
    const b = Body.create({
      position: cen,
      vertices: wv.map(v => ({ x: v.x - cen.x, y: v.y - cen.y })),
      isStatic: true, restitution: s.bounce, friction: s.friction, label: 'shape',
    });
    b.kind = 'shape';
    b.shape = s;
    s.bodies.push(b);
  }
  if (s.inWorld && s.bodies.length) Composite.add(world, s.bodies);
}

export function isEmptyShape(s) {
  return !s.pieces.length || !s.poly.regions.some(r => Math.abs(polyArea(r)) > 4);
}

// ─── TRANSFORMS ───
export function moveShape(s, dx, dy) {
  s.x += dx;
  s.y += dy;
  for (const b of s.bodies) Body.translate(b, { x: dx, y: dy });
}

// updateVelocity=true lets Matter see the moving surface (spinning rings
// carry balls with them); false is a plain teleport (inspector edits).
export function rotateShape(s, dA, updateVelocity = false) {
  s.angle += dA;
  const c = { x: s.x, y: s.y };
  for (const b of s.bodies) Body.rotate(b, dA, c, updateVelocity);
}

export function stopShapeMotion(s) {
  for (const b of s.bodies) {
    b.velocity.x = b.velocity.y = 0;
    b.positionPrev.x = b.position.x;
    b.positionPrev.y = b.position.y;
    b.anglePrev = b.angle;
    b.angularVelocity = 0;
  }
  s.moving = false;
}

export function setShapeMaterial(s) {
  for (const b of s.bodies) { b.restitution = s.bounce; b.friction = s.friction; }
}

export function setShapeScale(s, scale) {
  s.scale = clamp(scale, 0.1, 8);
  rebuild(s);
}

// ─── WORLD ↔ LOCAL ───
export function toLocal(s, wx, wy) {
  const dx = wx - s.x, dy = wy - s.y, c = Math.cos(-s.angle), sn = Math.sin(-s.angle);
  return { x: dx * c - dy * sn, y: dx * sn + dy * c };
}

export function toWorldPt(s, lx, ly) {
  const c = Math.cos(s.angle), sn = Math.sin(s.angle);
  return { x: s.x + lx * c - ly * sn, y: s.y + lx * sn + ly * c };
}

// ─── PICKING ───
export function hitTest(s, wx, wy, tol) {
  const p = toLocal(s, wx, wy);
  if (Math.hypot(p.x, p.y) > s.radius + tol) return false;
  let inside = false;
  for (const reg of s.poly.regions) if (reg.length > 2 && pointInPoly(p.x, p.y, reg)) inside = !inside;
  if (inside) return true;
  for (const reg of s.poly.regions) if (reg.length > 1 && distToPolyEdges(p.x, p.y, reg) <= tol) return true;
  return false;
}

// Rubber: cut a circle (world coords) out of the shape. Returns true if the
// shape actually changed.
export function cutShape(s, wx, wy, r) {
  const p = toLocal(s, wx, wy);
  if (Math.hypot(p.x, p.y) > s.radius + r) return false;
  const touches = s.poly.regions.some(reg => reg.length > 2 && circleHitsPoly(p.x, p.y, r, reg));
  if (!touches) return false;
  s.cuts.push({ x: p.x / s.scale, y: p.y / s.scale, r: r / s.scale });
  applyCut(s, p.x, p.y, r);
  updateDerived(s);
  buildBodies(s);
  return true;
}

// Outline points in world coordinates (used for the shatter effect).
export function outlineWorld(s, maxPts = 60) {
  const out = [];
  const total = s.poly.regions.reduce((n, r) => n + r.length, 0) || 1;
  const stepN = Math.max(1, Math.floor(total / maxPts));
  for (const reg of s.poly.regions) {
    for (let i = 0; i < reg.length; i += stepN) out.push(toWorldPt(s, reg[i][0], reg[i][1]));
  }
  return out;
}

// Shape "size" used by grow/shrink limits: bounding radius in world units.
export const shapeSize = s => s.radius;
