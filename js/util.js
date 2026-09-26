/* ========== Bouncical — util.js ========== */
/* Small math, geometry and color helpers shared by every module. */

// ─── MATH ───
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const wrapHue = h => ((h % 360) + 360) % 360;
export const wrapDeg = d => ((d % 360) + 360) % 360;

export function arrayRemove(arr, item) {
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
  return i >= 0;
}

// ─── GEOMETRY (points as [x, y]) ───
export function polyArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return a / 2;
}

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToPolyEdges(x, y, pts) {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const e = distToSegment(x, y, pts[j][0], pts[j][1], pts[i][0], pts[i][1]);
    if (e < d) d = e;
  }
  return d;
}

export function circlePts(cx, cy, r, n, a0 = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (TAU * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

export function isConvex(pts) {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], c = pts[(i + 2) % pts.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}

// ─── COLORS ───
// Named hues used by swatches, the rule builder and the text parser.
export const PALETTE = [
  { id: 'red', hue: 0 }, { id: 'orange', hue: 28 }, { id: 'yellow', hue: 52 },
  { id: 'lime', hue: 95 }, { id: 'green', hue: 145 }, { id: 'cyan', hue: 183 },
  { id: 'blue', hue: 215 }, { id: 'purple', hue: 270 }, { id: 'pink', hue: 320 },
];

export function hsl(h, s, l, a = 1) {
  return a >= 1 ? `hsl(${h | 0},${s}%,${l}%)` : `hsla(${h | 0},${s}%,${l}%,${a.toFixed(3)})`;
}

// Shape color: null means neutral white.
export function shapeColor(hue, alpha = 1, light = 72) {
  return hue == null ? `rgba(255,255,255,${alpha})` : hsl(hue, 100, light, alpha);
}

// ─── IDS ───
let uid = 1;
export const nextId = () => uid++;
export const reserveId = n => { if (n >= uid) uid = n + 1; };

// ─── MISC ───
export function debounce(fn, ms) {
  let t = 0;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
