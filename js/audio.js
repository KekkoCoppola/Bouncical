/* ========== Bouncical — audio.js ========== */
/* Tone.js engine: instruments → reverb → limiter → master → speakers,
   plus a MediaStream tap of the master bus for video recording. */

import { settings, onSettings } from './config.js';
import { clamp } from './util.js';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const midiToName = m => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

export const SCALES = {
  pentatonic: { label: 'Pentatonic', steps: [0, 2, 4, 7, 9] },
  major: { label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  blues: { label: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
  japanese: { label: 'Japanese (In)', steps: [0, 1, 5, 7, 8] },
  dorian: { label: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  harmonic: { label: 'Harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11] },
  whole: { label: 'Whole tone', steps: [0, 2, 4, 6, 8, 10] },
  chromatic: { label: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

export const INSTRUMENTS = {
  pluck: {
    label: 'Pluck', voice: 'Synth', vol: -8,
    opts: { oscillator: { type: 'triangle8' }, envelope: { attack: 0.005, decay: 0.18, sustain: 0.01, release: 0.4 } },
  },
  marimba: {
    label: 'Marimba', voice: 'FMSynth', vol: -5,
    opts: {
      harmonicity: 4.01, modulationIndex: 1.8, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.1 },
    },
  },
  bell: {
    label: 'Bell', voice: 'FMSynth', vol: -13,
    opts: {
      harmonicity: 3.5, modulationIndex: 10, oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 1.4 },
      modulationEnvelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.9 },
    },
  },
  piano: {
    label: 'Piano-ish', voice: 'Synth', vol: -9,
    opts: {
      oscillator: { type: 'fmtriangle', harmonicity: 2, modulationIndex: 1.2 },
      envelope: { attack: 0.004, decay: 0.9, sustain: 0.08, release: 0.9 },
    },
  },
  chip: {
    label: '8-bit', voice: 'Synth', vol: -17,
    opts: { oscillator: { type: 'pulse', width: 0.25 }, envelope: { attack: 0.001, decay: 0.12, sustain: 0.25, release: 0.12 } },
  },
  pad: {
    label: 'Soft pad', voice: 'AMSynth', vol: -11,
    opts: {
      harmonicity: 1.5, oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.06, decay: 0.5, sustain: 0.35, release: 1.6 },
      modulationEnvelope: { attack: 0.3, decay: 0.3, sustain: 0.8, release: 1 },
    },
  },
};

export const A = {
  ready: false,
  played: 0,       // notes played (handy for tests)
  muted: false,
  synth: null,
  master: null,
  bus: null,       // instruments go here (through reverb)
  songBus: null,   // decoded audio songs go here (dry)
  limiter: null,
  reverb: null,
  recDest: null,
};

const recent = [];

// ─── UNLOCK (needs a user gesture) ───
let unlocking = null;
export function unlock() {
  if (A.ready) return Promise.resolve(true);
  if (unlocking) return unlocking;
  unlocking = (async () => {
    if (!window.Tone) return false;
    try {
      const ctx = Tone.getContext();
      ctx.lookAhead = 0.02; // notes land with the bounce, not 100 ms later
      await Tone.start();
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
      buildGraph();
      A.ready = true;
      setInstrument(settings.music.instrument);
      return true;
    } catch (e) {
      console.warn('Audio unavailable:', e);
      return false;
    } finally {
      unlocking = null;
    }
  })();
  return unlocking;
}

export const rawContext = () => (window.Tone ? Tone.getContext().rawContext : null);
export const now = () => (A.ready ? Tone.getContext().rawContext.currentTime : 0);

function buildGraph() {
  A.master = new Tone.Gain(masterGain());
  A.limiter = new Tone.Limiter(-1);
  A.reverb = new Tone.Reverb({ decay: 2.2, preDelay: 0.01, wet: settings.music.reverb });
  A.bus = new Tone.Gain(1);
  A.songBus = new Tone.Gain(1);
  A.bus.connect(A.reverb);
  A.reverb.connect(A.limiter);
  A.songBus.connect(A.limiter);
  A.limiter.connect(A.master);
  A.master.toDestination();
  try {
    A.recDest = Tone.getContext().rawContext.createMediaStreamDestination();
    A.master.connect(A.recDest);
  } catch (e) {
    A.recDest = null;
  }
}

const masterGain = () => (A.muted ? 0 : clamp(settings.music.volume, 0, 1));

export function setMuted(m) {
  A.muted = m;
  if (A.master) A.master.gain.rampTo(masterGain(), 0.03);
}

export function setInstrument(id) {
  if (!A.ready) return;
  const def = INSTRUMENTS[id] || INSTRUMENTS.pluck;
  const old = A.synth;
  A.synth = new Tone.PolySynth(Tone[def.voice], def.opts); // default max polyphony: 32
  A.synth.volume.value = def.vol;
  A.synth.connect(A.bus);
  if (old) { try { old.releaseAll(); } catch (_) {} setTimeout(() => old.dispose(), 2500); }
}

onSettings((section, key) => {
  if (section !== 'music' || !A.ready) return;
  if (key === 'volume' || key === '*') A.master.gain.rampTo(masterGain(), 0.05);
  if (key === 'reverb' || key === '*') A.reverb.wet.rampTo(settings.music.reverb, 0.1);
  if (key === 'instrument' || key === '*') setInstrument(settings.music.instrument);
});

// ─── PLAYBACK ───
// Plays one chord (array of MIDI numbers). Returns false when skipped.
export function playNotes(midis, velocity = 0.8, duration = 0.3) {
  if (!A.ready || !A.synth || !midis.length) return false;
  const t = Tone.now();
  while (recent.length && recent[0] < t - 0.05) recent.shift();
  if (recent.length >= 12) return false; // polyphony guard for crowded scenes
  recent.push(t);
  try {
    const freqs = midis.map(m => Tone.Frequency(clamp(m, 12, 120), 'midi').toFrequency());
    A.synth.triggerAttackRelease(freqs, clamp(duration, 0.05, 4), t, clamp(velocity, 0.05, 1));
    A.played++;
  } catch (_) {
    return false;
  }
  return true;
}

// ─── SCALES ───
export function scaleMidis() {
  const sc = SCALES[settings.music.scale] || SCALES.pentatonic;
  const root = 12 * (settings.music.octave + 1) + Math.max(0, NOTE_NAMES.indexOf(settings.music.root));
  const out = [];
  for (let o = 0; o < 2; o++) for (const s of sc.steps) out.push(root + o * 12 + s);
  out.push(root + 24);
  return out;
}

// Pitch from height: higher on screen → higher note (as in the original).
export function noteForHeight(y, H, shift = 0) {
  const notes = scaleMidis();
  const norm = 1 - clamp(y / H, 0, 1);
  const idx = clamp(Math.floor(norm * notes.length) + shift, 0, notes.length - 1);
  return notes[idx];
}

export function randomScaleNote() {
  const n = scaleMidis();
  return n[Math.floor(Math.random() * n.length)];
}

export function recordingStream() {
  return A.recDest ? A.recDest.stream : null;
}
