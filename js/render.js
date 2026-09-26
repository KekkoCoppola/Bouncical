/* ========== Bouncical — render.js ========== */
/* Draws the scene into the stage canvas (world units → backing pixels).
   Everything visible in a recording is drawn here, background included. */

import { settings } from './config.js';
import { stage } from './stage.js';
import { scene } from './scene.js';
import { rt } from './physics.js';
import { TAU, hsl, shapeColor, wrapHue } from './util.js';
import * as fx from './fx.js';

// Tool previews / selection, written by tools.js.
export const view = { selected: null, preview: null, cursor: null };

const logo = new Image();
logo.src = 'assets/logo-mark.png';
logo.onload = () => { bgKey = ''; };

// ─── BACKGROUND (cached per size) ───
let bgCanvas = null, bgKey = '';
function background() {
  const { canvas } = stage;
  const key = `${canvas.width}x${canvas.height}:${settings.fx.watermark}:${logo.complete}`;
  if (key === bgKey && bgCanvas) return bgCanvas;
  bgKey = key;
  bgCanvas = bgCanvas || document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  const g = bgCanvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grd = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75);
  grd.addColorStop(0, '#11111f');
  grd.addColorStop(0.6, '#07070e');
  grd.addColorStop(1, '#020205');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  if (settings.fx.watermark && logo.complete && logo.naturalWidth) {
    const lw = Math.min(w, h) * 0.72, lh = (lw * logo.naturalHeight) / logo.naturalWidth;
    g.globalAlpha = 0.075;
    g.drawImage(logo, (w - lw) / 2, (h - lh) / 2, lw, lh);
    g.globalAlpha = 1;
  }
  return bgCanvas;
}

// ─── BALL SPRITES ───
const ballCache = new Map();
function ballSprite(hue) {
  const key = Math.round(wrapHue(hue) / 5);
  let c = ballCache.get(key);
  if (c) return c;
  const h = key * 5;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(24, 22, 2, 32, 32, 31);
  grd.addColorStop(0, hsl(h, 100, 93));
  grd.addColorStop(0.28, hsl(h, 100, 70));
  grd.addColorStop(0.78, hsl(h, 95, 52));
  grd.addColorStop(1, hsl(h, 90, 36));
  g.fillStyle = grd;
  g.beginPath();
  g.arc(32, 32, 31, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.5;
  g.stroke();
  ballCache.set(key, c);
  return c;
}

// ─── FRAME ───
export function render() {
  const { ctx, canvas } = stage;
  const k = stage.px;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(background(), 0, 0);
  drawPulse(ctx, canvas.width, canvas.height);

  const sh = fx.shakeOffset();
  ctx.setTransform(k, 0, 0, k, sh.x * k, sh.y * k);
  drawBounds(ctx);
  drawShapes(ctx);
  drawStrings(ctx);
  drawTrails(ctx);
  drawBalls(ctx);
  fx.render(ctx);
  drawOverlay(ctx);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  fx.renderFlash(ctx, canvas.width, canvas.height);
}

function drawPulse(ctx, w, h) {
  const e = fx.pulse.e;
  if (e < 0.02) return;
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  grd.addColorStop(0, hsl(fx.pulse.hue, 90, 45, e * 0.16));
  grd.addColorStop(1, hsl(fx.pulse.hue, 90, 30, 0));
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function drawBounds(ctx) {
  const W = stage.W, H = stage.H, b = rt.bounds;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (b.left) { ctx.moveTo(1, 0); ctx.lineTo(1, H); }
  if (b.right) { ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H); }
  if (b.floor) { ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); }
  if (b.ceiling) { ctx.moveTo(0, 1); ctx.lineTo(W, 1); }
  ctx.stroke();
}

function drawShapes(ctx) {
  const glow = settings.fx.glow, flashOn = settings.fx.hitFlash;
  ctx.lineJoin = 'round';
  for (const s of scene.shapes) {
    const f = flashOn ? s.flash : 0;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    if (glow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 7;
      ctx.strokeStyle = f > 0.03 ? hsl(s.flashHue, 100, 60, 0.12 + f * 0.4) : shapeColor(s.hue, 0.09, 60);
      ctx.stroke(s.path);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = f > 0.03 ? hsl(s.flashHue, 100, 60, 0.05 + f * 0.25) : shapeColor(s.hue, 0.045, 60);
    ctx.fill(s.path, 'evenodd');
    ctx.lineWidth = 2;
    ctx.strokeStyle = f > 0.03 ? hsl(s.flashHue, 100, 72 + f * 18) : shapeColor(s.hue, 0.95, 72);
    ctx.stroke(s.path);
    ctx.restore();
  }
}

function drawStrings(ctx) {
  ctx.lineWidth = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of scene.balls) {
    const st = b.strings;
    if (!st || !st.length) continue;
    ctx.strokeStyle = hsl(b.hue, 100, 65, 0.32);
    ctx.beginPath();
    const x = b.position.x, y = b.position.y;
    for (let i = 0; i < st.length; i += 2) { ctx.moveTo(st[i], st[i + 1]); ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Trails are stored as flat [x0, y0, x1, y1, …] arrays, oldest first.
function drawTrails(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  const CH = 4;
  for (const b of scene.balls) {
    const t = b.trail;
    const n = t.length / 2;
    if (n < 2) continue;
    const r = b.circleRadius;
    for (let c = 0; c < CH; c++) {
      const i0 = Math.floor(((n - 1) * c) / CH), i1 = Math.floor(((n - 1) * (c + 1)) / CH);
      if (i1 <= i0) continue;
      const k = (c + 1) / CH;
      ctx.strokeStyle = hsl(b.hue, 100, 60, 0.07 + 0.3 * k);
      ctx.lineWidth = r * (0.35 + 1.1 * k);
      ctx.beginPath();
      ctx.moveTo(t[i0 * 2], t[i0 * 2 + 1]);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(t[i * 2], t[i * 2 + 1]);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawBalls(ctx) {
  const balls = scene.balls;
  if (settings.fx.glow) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    for (const b of balls) {
      const s = b.circleRadius * 5;
      ctx.drawImage(fx.glowSprite(b.hue), b.position.x - s / 2, b.position.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const b of balls) {
    const r = b.circleRadius;
    ctx.drawImage(ballSprite(b.hue), b.position.x - r, b.position.y - r, r * 2, r * 2);
  }
}

// ─── TOOL OVERLAYS ───
function drawOverlay(ctx) {
  const sel = view.selected;
  if (sel && sel.inWorld) {
    ctx.save();
    ctx.translate(sel.x, sel.y);
    ctx.rotate(sel.angle);
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -performance.now() / 60;
    ctx.strokeStyle = 'rgba(0,255,170,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke(sel.path);
    ctx.restore();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,255,170,0.9)';
    ctx.beginPath();
    ctx.arc(sel.x, sel.y, 3, 0, TAU);
    ctx.fill();
  }

  const p = view.preview;
  if (p) {
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = 'rgba(0,255,170,0.75)';
    ctx.fillStyle = 'rgba(0,255,170,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (p.type === 'line') {
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
    } else if (p.type === 'rect') {
      ctx.rect(Math.min(p.x1, p.x2), Math.min(p.y1, p.y2), Math.abs(p.x2 - p.x1), Math.abs(p.y2 - p.y1));
      ctx.fill();
    } else if (p.type === 'tri') {
      const l = Math.min(p.x1, p.x2), r = Math.max(p.x1, p.x2), t = Math.min(p.y1, p.y2), b = Math.max(p.y1, p.y2);
      ctx.moveTo(l, b); ctx.lineTo((l + r) / 2, t); ctx.lineTo(r, b); ctx.closePath();
      ctx.fill();
    } else if (p.type === 'ring') {
      ctx.arc(p.x1, p.y1, Math.max(1, Math.hypot(p.x2 - p.x1, p.y2 - p.y1)), 0, TAU);
    } else if (p.type === 'sling') {
      ctx.setLineDash([]);
      ctx.fillStyle = hsl(p.hue, 100, 65, 0.9);
      ctx.arc(p.x1, p.y1, p.r, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      const a = Math.atan2(p.y2 - p.y1, p.x2 - p.x1), hl = 12;
      ctx.moveTo(p.x2, p.y2);
      ctx.lineTo(p.x2 - Math.cos(a - 0.45) * hl, p.y2 - Math.sin(a - 0.45) * hl);
      ctx.moveTo(p.x2, p.y2);
      ctx.lineTo(p.x2 - Math.cos(a + 0.45) * hl, p.y2 - Math.sin(a + 0.45) * hl);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const c = view.cursor;
  if (c) {
    ctx.strokeStyle = c.type === 'rubber' ? 'rgba(255,190,80,0.8)' : 'rgba(255,90,90,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, TAU);
    ctx.stroke();
  }
}
