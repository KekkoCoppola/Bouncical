/* ========== Bouncical — song.js ========== */
/* What a bounce sounds like:
   - MIDI song: every bounce plays the next chord (notes starting together).
   - Audio song (MP3/M4A/WAV/OGG): every bounce lets the real track play for
     a short chunk from where it stopped; frequent bounces = continuous song.
   - No song: a note from the scale chosen by height, or the shape's note. */

import { settings, onSettings } from './config.js';
import { A, unlock, playNotes, noteForHeight, midiToName, rawContext } from './audio.js';
import { clamp } from './util.js';

const CHORD_WINDOW = 0.03;   // notes within 30 ms are one chord
const FADE = 0.008;

export const song = {
  type: null,          // null | 'midi' | 'audio'
  name: '',
  // MIDI
  tracks: [],          // [{ index, name, notes, drum, avg }]
  track: 'auto',       // 'auto' | 'all' | track index
  autoTrack: null,
  events: [],          // [{ midis, dur, vel }]
  index: 0,
  midi: null,
  // Audio
  buffer: null,
  pos: 0,              // seconds into the track while paused
  playing: null,       // { src, gain, startCtx, startPos, stopAt }
  finished: false,
};

const listeners = new Set();
export function onSongChange(fn) { listeners.add(fn); }
const notify = () => listeners.forEach(fn => fn());

// ─── LOADING ───
const MIDI_RE = /\.(mid|midi|kar|smf)$/i;
const AUDIO_RE = /\.(mp3|m4a|aac|wav|wave|ogg|oga|opus|flac|webm|mp4)$/i;

export function detectType(file) {
  const t = (file.type || '').toLowerCase();
  if (MIDI_RE.test(file.name) || t.includes('midi')) return 'midi';
  if (AUDIO_RE.test(file.name) || t.startsWith('audio/') || t === 'video/mp4' || t === 'video/webm') return 'audio';
  return null;
}

export async function loadSongFile(file) {
  const type = detectType(file);
  if (!type) throw new Error('Unsupported file. Use a MIDI (.mid) or audio file (.mp3, .m4a, .wav, .ogg).');
  const buf = await file.arrayBuffer();
  if (type === 'midi') loadMidi(buf, file.name);
  else await loadAudio(buf, file.name);
  return { type, name: song.name };
}

function loadMidi(buf, name) {
  if (!window.Midi) throw new Error('MIDI library failed to load.');
  let midi;
  try { midi = new window.Midi(buf); } catch (e) { throw new Error('This MIDI file could not be read.'); }
  const tracks = midi.tracks.map((t, i) => {
    const notes = t.notes.length;
    const avg = notes ? t.notes.reduce((s, n) => s + n.midi, 0) / notes : 0;
    const drum = t.channel === 9 || !!(t.instrument && t.instrument.percussion);
    const label = (t.name || (t.instrument && t.instrument.name) || `Track ${i + 1}`).trim();
    return { index: i, name: label, notes, drum, avg };
  }).filter(t => t.notes > 0);
  if (!tracks.length) throw new Error('No notes found in this MIDI file.');
  stopAudio();
  song.type = 'midi';
  song.name = name.replace(/\.[^.]+$/, '');
  song.midi = midi;
  song.tracks = tracks;
  song.autoTrack = pickMelodyTrack(tracks);
  song.track = 'auto';
  song.buffer = null;
  buildEvents();
  notify();
}

// Prefer a track named like a melody; otherwise the highest-pitched track
// among the busy non-drum tracks (accompaniment and drums tend to be lower).
export function pickMelodyTrack(tracks) {
  const melodic = tracks.filter(t => !t.drum);
  if (!melodic.length) return tracks[0].index;
  const hint = /melod|lead|vocal|voice|voce|canto|solo|sing|right|\brh\b|treble|soprano|flute|violin|melodia/i;
  const named = melodic.filter(t => hint.test(t.name));
  const pool = named.length ? named : melodic.filter(t => t.notes >= Math.max(...melodic.map(m => m.notes)) * 0.3);
  return pool.reduce((best, t) => (named.length ? t.notes > best.notes : t.avg > best.avg) ? t : best, pool[0]).index;
}

export function currentTrack() {
  return song.track === 'auto' ? song.autoTrack : song.track;
}

export function setMidiTrack(track) {
  song.track = track;
  buildEvents();
  notify();
}

// Group notes that start together into chords.
export function groupChords(notes) {
  const sorted = [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi);
  const events = [];
  let cur = null;
  for (const n of sorted) {
    if (cur && n.time - cur.time <= CHORD_WINDOW) cur.notes.push(n);
    else { cur = { time: n.time, notes: [n] }; events.push(cur); }
  }
  return events.map(e => ({
    midis: [...new Set(e.notes.map(n => n.midi))].sort((a, b) => a - b),
    dur: clamp(Math.max(...e.notes.map(n => n.duration)), 0.12, 1.6),
    vel: e.notes.reduce((s, n) => s + n.velocity, 0) / e.notes.length,
  }));
}

function buildEvents() {
  const midi = song.midi;
  if (!midi) return;
  let notes = [];
  if (song.track === 'all') {
    for (const t of song.tracks) if (!t.drum) notes.push(...midi.tracks[t.index].notes);
    if (!notes.length) notes = midi.tracks[song.tracks[0].index].notes;
  } else {
    notes = midi.tracks[currentTrack()].notes;
  }
  song.events = groupChords(notes);
  song.index = 0;
  song.finished = false;
}

async function loadAudio(buf, name) {
  await unlock();
  const raw = rawContext();
  if (!raw) throw new Error('Audio is not available in this browser.');
  let buffer;
  try {
    buffer = await new Promise((resolve, reject) => {
      const p = raw.decodeAudioData(buf, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  } catch (e) {
    throw new Error('This audio file could not be decoded by your browser.');
  }
  stopAudio();
  song.type = 'audio';
  song.name = name.replace(/\.[^.]+$/, '');
  song.buffer = buffer;
  song.pos = 0;
  song.finished = false;
  song.midi = null;
  song.events = [];
  song.tracks = [];
  notify();
}

export function removeSong() {
  stopAudio();
  Object.assign(song, {
    type: null, name: '', tracks: [], track: 'auto', autoTrack: null, events: [], index: 0,
    midi: null, buffer: null, pos: 0, finished: false,
  });
  notify();
}

export function resetSong() {
  stopAudio();
  song.index = 0;
  song.pos = 0;
  song.finished = false;
  notify();
}

export function songProgress() {
  if (song.type === 'midi') return song.events.length ? Math.min(1, song.index / song.events.length) : 0;
  if (song.type === 'audio' && song.buffer) return clamp(currentPos() / song.buffer.duration, 0, 1);
  return 0;
}

// ─── AUDIO PLAYBACK ───
function posAt(P, t) {
  const d = song.buffer.duration;
  const p = P.startPos + (Math.min(t, P.stopAt) - P.startCtx);
  return settings.music.loop ? p % d : Math.min(p, d);
}

function currentPos() {
  const P = song.playing;
  if (!P) return song.pos;
  return posAt(P, rawContext().currentTime);
}

function stopAudio() {
  const P = song.playing;
  if (!P) return;
  const raw = rawContext();
  const t = raw.currentTime;
  song.pos = posAt(P, t);
  song.playing = null;
  try {
    P.gain.gain.cancelScheduledValues(t);
    P.gain.gain.setValueAtTime(P.gain.gain.value, t);
    P.gain.gain.linearRampToValueAtTime(0, t + FADE);
    P.src.stop(t + FADE + 0.01);
  } catch (_) {}
}

// Start (or extend) playback so the song plays until now + seconds.
// seconds = Infinity plays until paused (background mode).
function playAudioFor(seconds) {
  if (!song.buffer || !A.ready) return false;
  const raw = rawContext();
  const t = raw.currentTime;
  const d = song.buffer.duration;
  const P = song.playing;
  const stopAt = seconds === Infinity ? Infinity : t + seconds;

  if (P && t < P.stopAt - 0.002) {
    if (stopAt <= P.stopAt) return true;
    const g = P.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    P.stopAt = stopAt;
    // A later stop() call replaces the earlier one (Web Audio spec).
    if (stopAt !== Infinity) {
      g.setValueAtTime(1, stopAt - FADE);
      g.linearRampToValueAtTime(0, stopAt);
      try { P.src.stop(stopAt + 0.02); } catch (_) {}
    } else {
      try { P.src.stop(t + 1e6); } catch (_) {}
    }
    return true;
  }

  if (P) song.pos = posAt(P, t);
  if (!settings.music.loop && song.pos >= d - 0.01) { song.finished = true; song.playing = null; return false; }
  const offset = settings.music.loop ? song.pos % d : song.pos;
  const src = raw.createBufferSource();
  src.buffer = song.buffer;
  if (settings.music.loop) { src.loop = true; src.loopStart = 0; src.loopEnd = d; }
  const gain = raw.createGain();
  src.connect(gain);
  gain.connect(A.songBus.input);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + FADE);
  let end = stopAt;
  if (!settings.music.loop) end = Math.min(stopAt, t + (d - offset));
  src.start(t, offset); // start() must come before stop()
  if (end !== Infinity) {
    gain.gain.setValueAtTime(1, Math.max(t + FADE, end - FADE));
    gain.gain.linearRampToValueAtTime(0, end);
    src.stop(end + 0.02);
  }
  const rec = { src, gain, startCtx: t, startPos: offset, stopAt: end };
  src.onended = () => {
    if (song.playing !== rec) return;
    song.pos = posAt(rec, rec.stopAt);
    song.playing = null;
    if (!settings.music.loop && song.pos >= d - 0.02) song.finished = true;
  };
  song.playing = rec;
  return true;
}

// Background mode follows the simulation's play/pause.
export function onRunState(running) {
  if (song.type !== 'audio' || settings.music.audioMode !== 'background') return;
  if (running) playAudioFor(Infinity);
  else stopAudio();
}

onSettings((section, key) => {
  if (section === 'music' && (key === 'audioMode' || key === 'loop' || key === '*')) stopAudio();
});

// ─── HIT SOUND ───
// Returns a label (note name / ♪) when something played, else null.
// Mute only silences the master bus, so songs keep advancing while muted.
export function hitSound({ y, H, impact, ball, shape }) {
  if (!A.ready) return null;
  const vel = clamp(0.25 + impact / 12, 0.25, 1);

  if (song.type === 'midi' && song.events.length) {
    if (song.index >= song.events.length) {
      if (!settings.music.loop) { song.finished = true; return null; }
      song.index = 0;
    }
    const ev = song.events[song.index];
    let midis = ev.midis.map(m => m + settings.music.transpose);
    if (settings.music.midiMode === 'melody') midis = [midis[midis.length - 1]];
    if (!playNotes(midis, clamp(vel * (0.55 + ev.vel * 0.6), 0.1, 1), ev.dur)) return null;
    song.index++;
    return midiToName(midis[midis.length - 1]);
  }

  if (song.type === 'audio' && song.buffer) {
    if (settings.music.audioMode === 'background') return null;
    return playAudioFor(settings.music.chunk) ? '♪' : null;
  }

  const m = shape && shape.note != null ? shape.note : noteForHeight(y, H, ball ? ball.noteShift : 0);
  return playNotes([m], vel, 0.35) ? midiToName(m) : null;
}
