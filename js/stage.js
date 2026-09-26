/* ========== Bouncical — stage.js ========== */
/* The scene lives in a fixed logical world (e.g. 450×800 for 9:16) that is
   scaled to fit whatever space the layout gives it. Rotating the phone,
   resizing the window or opening the keyboard never changes the physics. */

import { ASPECTS } from './config.js';
import { clamp } from './util.js';

export const stage = {
  canvas: null,
  ctx: null,
  wrap: null,
  aspect: '9:16',
  W: 450,             // world width  (units)
  H: 800,             // world height (units)
  cssW: 0,            // on-screen size in CSS px
  cssH: 0,
  cssScale: 1,        // CSS px per world unit
  px: 1,              // backing-store px per world unit
  minShortPx: 0,      // raised while recording (e.g. 1080)
  maxDpr: 2.5,
};

const MAX_BACKING_PX = 3840 * 2160;
const listeners = new Set();
export function onStageChange(fn) { listeners.add(fn); }

export function initStage(canvas, wrap) {
  stage.canvas = canvas;
  stage.ctx = canvas.getContext('2d', { alpha: false });
  stage.wrap = wrap;
  const relayout = () => layout();
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(wrap);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);
}

// Available space inside the stage area, in CSS px.
export function availSize() {
  const r = stage.wrap.getBoundingClientRect();
  return { w: Math.max(80, r.width - 12), h: Math.max(80, r.height - 12) };
}

// World size for an aspect; 'fit' takes the space available right now.
export function worldSizeFor(aspect) {
  if (aspect !== 'fit') return { w: ASPECTS[aspect].w, h: ASPECTS[aspect].h };
  const a = availSize();
  // Keep the logical size in a sane range so physics feel the same.
  const k = clamp(800 / Math.max(a.w, a.h), 0.5, 1.6);
  return { w: Math.round(a.w * k), h: Math.round(a.h * k) };
}

export function setWorld(aspect, w, h) {
  stage.aspect = aspect;
  stage.W = w;
  stage.H = h;
  layout(true);
}

export function layout(force) {
  const { canvas } = stage;
  if (!canvas) return;
  const a = availSize();
  const s = Math.min(a.w / stage.W, a.h / stage.H);
  const cssW = Math.max(1, Math.floor(stage.W * s));
  const cssH = Math.max(1, Math.floor(stage.H * s));
  if (cssW !== stage.cssW || cssH !== stage.cssH) {
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }
  const dpr = Math.min(window.devicePixelRatio || 1, stage.maxDpr);
  let px = (cssW / stage.W) * dpr;
  if (stage.minShortPx) px = Math.max(px, stage.minShortPx / Math.min(stage.W, stage.H));
  if (stage.W * px * stage.H * px > MAX_BACKING_PX) px = Math.sqrt(MAX_BACKING_PX / (stage.W * stage.H));
  const bw = Math.round(stage.W * px), bh = Math.round(stage.H * px);
  const changed = force || canvas.width !== bw || canvas.height !== bh || cssW !== stage.cssW || cssH !== stage.cssH;
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  stage.cssW = cssW;
  stage.cssH = cssH;
  stage.cssScale = cssW / stage.W;
  stage.px = bw / stage.W;
  if (changed) listeners.forEach(fn => fn());
}

// Client (CSS px) → world coordinates.
export function toWorld(clientX, clientY) {
  const r = stage.canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * stage.W,
    y: ((clientY - r.top) / r.height) * stage.H,
  };
}

// A distance in CSS px expressed in world units (touch tolerance etc.).
export const cssToWorld = d => d / (stage.cssScale || 1);
