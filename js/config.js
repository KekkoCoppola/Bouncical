/* ========== Bouncical — config.js ========== */
/* Defaults and persisted preferences (world, effects, music, format). */

import { debounce } from './util.js';

// ─── SONG SERVICE ───
// Optional free Cloudflare Worker (see worker/README.md). Leave empty to use
// the no-server mode; set it to e.g. 'https://bouncical-songs.you.workers.dev'
// to enable Spotify links and recordable previews for every visitor.
export const SONG_SERVICE_URL = '';

// ─── SCENE FORMATS (world units) ───
export const ASPECTS = {
  '9:16': { w: 450, h: 800, label: '9:16', hint: 'TikTok · Reels · Shorts' },
  '1:1': { w: 640, h: 640, label: '1:1', hint: 'Square post' },
  '16:9': { w: 800, h: 450, label: '16:9', hint: 'YouTube · landscape' },
  fit: { w: 0, h: 0, label: 'Fit', hint: 'Fill this screen' },
};

// ─── DEFAULTS ───
export const DEFAULTS = {
  world: {
    gravity: 1.2,          // strength (Matter gravity magnitude)
    gravityAngle: 90,      // degrees, 90 = down
    timeScale: 1,
    ballSize: 8,           // radius in world units
    ballSizeVar: 25,       // ± % random variation
    ballBounce: 0.65,
    ballFriction: 0.02,
    ballAir: 0,
    maxSpeed: 25,
    ballColor: 'random',   // 'random' | 'rainbow' | hue as string
    colorShift: true,      // hue shifts a little on every hit
    wallLeft: true,
    wallRight: true,
    floor: false,
    ceiling: false,
    ballCollisions: true,
    maxBalls: 200,
  },
  fx: {
    quality: 'high',       // 'low' | 'medium' | 'high'
    particles: true,
    particleAmount: 1,
    trails: true,
    trailLength: 14,
    glow: true,
    impactRings: true,
    hitFlash: true,
    shake: true,
    shakeAmount: 1,
    noteLabels: false,
    bgPulse: true,
    watermark: true,
  },
  music: {
    instrument: 'pluck',
    scale: 'pentatonic',
    root: 'C',
    octave: 4,
    volume: 0.8,
    reverb: 0.3,
    soundOn: 'shapes',     // 'shapes' | 'shapesWalls' | 'all' | 'rules'
    minImpact: 1.2,
    midiMode: 'chords',    // 'chords' | 'melody'
    transpose: 0,
    loop: true,
    audioMode: 'bounce',   // 'bounce' | 'background'
    chunk: 0.35,           // seconds of song per bounce
  },
};

const clone = o => JSON.parse(JSON.stringify(o));

export const settings = {
  aspect: '9:16',
  world: clone(DEFAULTS.world),
  fx: clone(DEFAULTS.fx),
  music: clone(DEFAULTS.music),
};

// ─── CHANGE LISTENERS ───
const listeners = new Set();
export function onSettings(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(section, key) { listeners.forEach(fn => fn(section, key)); }

export function setSetting(section, key, value) {
  if (settings[section][key] === value) return;
  settings[section][key] = value;
  save();
  emit(section, key);
}

export function setAspectSetting(aspect) {
  settings.aspect = aspect;
  save();
}

export function resetSection(section) {
  settings[section] = clone(DEFAULTS[section]);
  save();
  emit(section, '*');
}

// Replace whole sections (used by templates): defaults + overrides.
export function applySections(overrides) {
  for (const section of ['world', 'fx', 'music']) {
    if (!overrides[section]) continue;
    settings[section] = Object.assign(clone(DEFAULTS[section]), overrides[section]);
    emit(section, '*');
  }
  save();
}

// ─── PERSISTENCE ───
const KEY = 'bouncical_settings_v1';
const save = debounce(() => {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
}, 250);

export function loadSettings() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d) return;
    if (ASPECTS[d.aspect]) settings.aspect = d.aspect;
    for (const section of ['world', 'fx', 'music']) {
      if (!d[section]) continue;
      for (const k in DEFAULTS[section]) {
        if (typeof d[section][k] === typeof DEFAULTS[section][k]) settings[section][k] = d[section][k];
      }
    }
  } catch (_) {}
}
