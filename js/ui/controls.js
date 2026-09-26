/* ========== Bouncical — ui/controls.js ========== */
/* Toolbar buttons, format menu, panels (World, FX, Music, Scenes, Shape
   inspector), recording flow, song loading and keyboard shortcuts. */

import { settings, setSetting, resetSection, ASPECTS } from '../config.js';
import { $, $$, h, toast, openModal, closeModal, confirmDialog, isModalOpen } from './dom.js';
import { slider, toggle, select, segmented, swatches, section, button } from './form.js';
import { registerPanel, openPanel, closePanel, togglePanel, currentPanel } from './panels.js';
import { game, onGame, rules, toggleRun, start, clearScene, setAspect, loadTemplate, select as selectShape, removeShape } from '../game.js';
import { history, cmd, isEmpty, addShape } from '../scene.js';
import { setTool, TOOLS } from '../tools.js';
import { A, setMuted, unlock, INSTRUMENTS, SCALES, NOTE_NAMES, midiToName } from '../audio.js';
import { song, loadSongFile, removeSong, resetSong, setMidiTrack, songProgress, onSongChange, currentTrack, onRunState } from '../song.js';
import { TEMPLATES } from '../templates.js';
import { canRecord, startRecording, stopRecording, recordingSeconds, rec, fileNameFor } from '../recorder.js';
import { createShape, serializeShape, restoreShape, rotateShape, setShapeScale, setShapeMaterial, stopShapeMotion, SHAPE_LABELS } from '../shapes.js';
import { view } from '../render.js';
import { mountRulesUI } from '../rules/ui.js';
import { fmtTime, DEG, wrapDeg, PALETTE } from '../util.js';

const fine = window.matchMedia('(pointer: fine)').matches;

export function initControls() {
  bindToolbar();
  bindFormatMenu();
  initPanels();
  bindSong();
  bindRecording();
  bindKeyboard();
}

// ─── TOOLBAR ───
function bindToolbar() {
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $$('[data-panel]').forEach(b => b.addEventListener('click', () => togglePanel(b.dataset.panel)));
  $('#btn-play').addEventListener('click', () => { unlock(); toggleRun(); });
  $('#btn-clear').addEventListener('click', () => {
    if (isEmpty()) { clearScene(); toast('Scene reset'); return; }
    clearScene();
    toast('Scene cleared — Undo brings it back');
  });
  $('#btn-mute').addEventListener('click', () => {
    unlock();
    setMuted(!A.muted);
    $('#btn-mute').setAttribute('aria-pressed', String(A.muted));
    $('#btn-mute').title = A.muted ? 'Unmute' : 'Mute';
  });
  $('#btn-undo').addEventListener('click', () => history.undo());
  $('#btn-redo').addEventListener('click', () => history.redo());
  history.onChange(() => {
    $('#btn-undo').disabled = !history.canUndo;
    $('#btn-redo').disabled = !history.canRedo;
  });
  onGame(type => {
    if (type !== 'run') return;
    const b = $('#btn-play');
    b.classList.toggle('running', game.running);
    b.setAttribute('aria-pressed', String(game.running));
    $('#lbl-play').textContent = game.running ? 'Pause' : 'Play';
    b.title = game.running ? 'Pause (Space)' : 'Play (Space)';
  });
}

// ─── FORMAT MENU ───
function bindFormatMenu() {
  const btn = $('#btn-format'), menu = $('#format-menu');
  const label = () => {
    $('#lbl-format').textContent = ASPECTS[settings.aspect].label;
    btn.dataset.aspect = settings.aspect;
  };
  label();
  menu.replaceChildren(...Object.entries(ASPECTS).map(([id, a]) => h('button.menu-item', {
    type: 'button', role: 'menuitemradio', 'data-aspect': id,
    onclick: () => {
      hideMenu();
      if (id === settings.aspect && id !== 'fit') return;
      const had = !isEmpty();
      setAspect(id);
      label();
      if (had) toast(`Format ${a.label} — scene re-centered`);
    },
  }, h('b', { text: a.label }), h('span', { text: a.hint }))));
  function hideMenu() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (!menu.hidden) { hideMenu(); return; }
    $$('.menu-item', menu).forEach(i => i.setAttribute('aria-checked', String(i.dataset.aspect === settings.aspect)));
    menu.hidden = false;
    const r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    const left = Math.min(window.innerWidth - mw - 8, Math.max(8, r.left + r.width / 2 - mw / 2));
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    btn.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) hideMenu(); });
  window.addEventListener('resize', hideMenu);
  onGame(type => { if (type === 'format') label(); });
  menu.hideMenu = hideMenu;
}

// ─── PANELS ───
let rulesUI = null;

function initPanels() {
  rulesUI = mountRulesUI($('#rules-body'), rules);
  onGame(type => { if (type === 'rules' && currentPanel() !== 'rules') rulesUI.render(); });
  registerPanel('rules', { onOpen: () => { rulesUI.render(); if (fine) rulesUI.focus(); } });
  registerPanel('world', { onOpen: el => buildWorld($('.panel-body', el)) });
  registerPanel('fx', { onOpen: el => buildFx($('.panel-body', el)) });
  registerPanel('music', { onOpen: el => buildMusic($('.panel-body', el)), onClose: () => clearInterval(progressTimer) });
  registerPanel('scenes', { onOpen: el => buildScenes($('.panel-body', el)) });
  registerPanel('shape', { onClose: () => selectShape(null) });
  // The inspected shape vanished (erased, broken by a rule, new scene…).
  onGame(type => { if (type === 'select' && !view.selected && currentPanel() === 'shape') closePanel(); });
  onSongChange(() => { if (currentPanel() === 'music') buildMusic($('#panel-music .panel-body')); });
}

const fmt2 = v => (+v).toFixed(2);
const pctFmt = v => `${Math.round(v)}%`;
const set = (sec, key) => v => setSetting(sec, key, v);

function resetButton(sectionName, rebuild) {
  return h('div.panel-foot', null, button('Reset to defaults', () => { resetSection(sectionName); rebuild(); }, 'ghost'));
}

function buildWorld(body) {
  const w = settings.world;
  const arrow = a => ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][Math.round(wrapDeg(a) / 45) % 8];
  const dir = slider({ label: 'Direction', min: 0, max: 359, step: 1, value: w.gravityAngle, format: v => `${arrow(v)} ${v}°`, onInput: set('world', 'gravityAngle') });
  const str = slider({ label: 'Strength', min: 0, max: 3, step: 0.05, value: w.gravity, format: fmt2, onInput: set('world', 'gravity') });
  const quick = (label, angle, g) => button(label, () => {
    if (g != null) { setSetting('world', 'gravity', g); str.setValue(g); }
    if (angle != null) { setSetting('world', 'gravityAngle', angle); dir.setValue(angle); if (settings.world.gravity === 0) { setSetting('world', 'gravity', 1.2); str.setValue(1.2); } }
  }, 'small');
  const colorOpts = [{ v: 'random', l: 'Random' }, { v: 'rainbow', l: 'Rainbow sequence' },
    ...PALETTE.map(p => ({ v: String(p.hue), l: p.id[0].toUpperCase() + p.id.slice(1) }))];
  body.replaceChildren(
    section('Gravity', str, dir,
      h('div.btn-row', null, quick('↓', 90), quick('↑', 270), quick('←', 180), quick('→', 0), quick('Off', null, 0))),
    section('Time',
      slider({ label: 'Time speed', min: 0.1, max: 2, step: 0.05, value: w.timeScale, format: v => `${fmt2(v)}×`, onInput: set('world', 'timeScale') })),
    section('Balls',
      slider({ label: 'Size', min: 3, max: 30, step: 1, value: w.ballSize, onInput: set('world', 'ballSize') }),
      slider({ label: 'Size variation', min: 0, max: 100, step: 5, value: w.ballSizeVar, format: pctFmt, onInput: set('world', 'ballSizeVar') }),
      slider({ label: 'Bounciness', min: 0, max: 1.3, step: 0.05, value: w.ballBounce, format: fmt2, onInput: set('world', 'ballBounce') }),
      slider({ label: 'Friction', min: 0, max: 0.5, step: 0.01, value: w.ballFriction, format: fmt2, onInput: set('world', 'ballFriction') }),
      slider({ label: 'Air resistance', min: 0, max: 0.05, step: 0.001, value: w.ballAir, format: v => (+v).toFixed(3), onInput: set('world', 'ballAir') }),
      slider({ label: 'Max speed', min: 5, max: 50, step: 1, value: w.maxSpeed, onInput: set('world', 'maxSpeed') }),
      select({ label: 'Color', options: colorOpts, value: String(w.ballColor), onChange: v => setSetting('world', 'ballColor', String(v)) }),
      toggle({ label: 'Shift color on every hit', value: w.colorShift, onChange: set('world', 'colorShift') }),
      toggle({ label: 'Balls collide with each other', value: w.ballCollisions, onChange: set('world', 'ballCollisions') }),
      slider({ label: 'Max balls', min: 10, max: 500, step: 10, value: w.maxBalls, onInput: set('world', 'maxBalls') })),
    section('Borders',
      toggle({ label: 'Left wall', value: w.wallLeft, onChange: set('world', 'wallLeft') }),
      toggle({ label: 'Right wall', value: w.wallRight, onChange: set('world', 'wallRight') }),
      toggle({ label: 'Floor', value: w.floor, onChange: set('world', 'floor') }),
      toggle({ label: 'Ceiling', value: w.ceiling, onChange: set('world', 'ceiling') })),
    resetButton('world', () => buildWorld(body)),
  );
}

function buildFx(body) {
  const f = settings.fx;
  body.replaceChildren(
    section('Quality',
      segmented({ label: 'Detail', options: [{ v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }], value: f.quality, onChange: set('fx', 'quality') }),
      h('p.hint', { text: 'Lower it on older phones. Particles also scale down automatically when frames get slow.' })),
    section('Particles',
      toggle({ label: 'Impact sparks & bursts', value: f.particles, onChange: set('fx', 'particles') }),
      slider({ label: 'Amount', min: 0.2, max: 2, step: 0.1, value: f.particleAmount, format: v => `${fmt2(v)}×`, onInput: set('fx', 'particleAmount') }),
      toggle({ label: 'Shockwave rings on hard hits', value: f.impactRings, onChange: set('fx', 'impactRings') })),
    section('Balls',
      toggle({ label: 'Trails', value: f.trails, onChange: set('fx', 'trails') }),
      slider({ label: 'Trail length', min: 4, max: 40, step: 1, value: f.trailLength, onInput: set('fx', 'trailLength') }),
      toggle({ label: 'Neon glow', value: f.glow, onChange: set('fx', 'glow') })),
    section('Scene',
      toggle({ label: 'Shapes light up when hit', value: f.hitFlash, onChange: set('fx', 'hitFlash') }),
      toggle({ label: 'Screen shake', value: f.shake, onChange: set('fx', 'shake') }),
      slider({ label: 'Shake strength', min: 0.2, max: 2, step: 0.1, value: f.shakeAmount, format: v => `${fmt2(v)}×`, onInput: set('fx', 'shakeAmount') }),
      toggle({ label: 'Background pulses with notes', value: f.bgPulse, onChange: set('fx', 'bgPulse') }),
      toggle({ label: 'Show note names', value: f.noteLabels, onChange: set('fx', 'noteLabels') }),
      toggle({ label: 'Logo watermark', value: f.watermark, onChange: set('fx', 'watermark') })),
    resetButton('fx', () => buildFx(body)),
  );
}

// ─── MUSIC ───
let progressTimer = 0;

function buildMusic(body) {
  const m = settings.music;
  clearInterval(progressTimer);
  const bar = h('div.progress', null, h('div.progress-fill'));
  const pos = h('span.song-pos');
  const tick = () => {
    bar.firstChild.style.width = `${(songProgress() * 100).toFixed(1)}%`;
    if (song.type === 'midi') pos.textContent = `${Math.min(song.index, song.events.length)} / ${song.events.length} notes`;
    else if (song.type === 'audio') pos.textContent = `${fmtTime(songProgress() * song.buffer.duration)} / ${fmtTime(song.buffer.duration)}`;
  };

  let songCard;
  if (!song.type) {
    songCard = h('div.song-card.empty', null,
      h('p.song-empty', { text: 'No song loaded — bounces play the scale below.' }),
      h('p.hint', { text: 'Load a MIDI file (each bounce plays the next chord) or an audio file like MP3/M4A/WAV (each bounce plays the next slice of the real track). You can also drop a file on the page.' }),
      h('div.btn-row', null, button('Load song…', () => $('#song-input').click(), 'primary')));
  } else {
    const extra = [];
    if (song.type === 'midi') {
      const auto = song.tracks.find(t => t.index === song.autoTrack);
      extra.push(select({
        label: 'Track', value: String(song.track),
        options: [
          { v: 'auto', l: `Auto — ${auto ? auto.name : '?'}` },
          ...song.tracks.map(t => ({ v: t.index, l: `${t.name} · ${t.notes} notes${t.drum ? ' · drums' : ''}` })),
          { v: 'all', l: 'All tracks together' },
        ],
        onChange: v => setMidiTrack(v === 'auto' || v === 'all' ? v : +v),
      }));
      extra.push(segmented({ label: 'Play', options: [{ v: 'chords', l: 'Chords' }, { v: 'melody', l: 'Melody only' }], value: m.midiMode, onChange: set('music', 'midiMode') }));
      extra.push(slider({ label: 'Transpose', min: -12, max: 12, step: 1, value: m.transpose, format: v => (v > 0 ? `+${v}` : `${v}`), onInput: set('music', 'transpose') }));
    } else {
      extra.push(segmented({ label: 'Mode', options: [{ v: 'bounce', l: 'Plays on bounces' }, { v: 'background', l: 'Background' }], value: m.audioMode, onChange: v => { setSetting('music', 'audioMode', v); if (v === 'background' && game.running) start(); } }));
      extra.push(slider({ label: 'Slice per bounce', min: 0.1, max: 1.5, step: 0.05, value: m.chunk, format: v => `${fmt2(v)} s`, onInput: set('music', 'chunk') }));
    }
    extra.push(toggle({ label: 'Loop song', value: m.loop, onChange: set('music', 'loop') }));
    songCard = h('div.song-card', null,
      h('div.song-title', null, h('span.badge', { text: song.type === 'midi' ? 'MIDI' : 'AUDIO' }), h('b', { text: song.name })),
      bar, pos,
      h('div.btn-row', null,
        button('Restart', () => { resetSong(); onRunState(game.running); tick(); }, 'small'),
        button('Replace…', () => $('#song-input').click(), 'small'),
        button('Remove', () => { removeSong(); toast('Song removed — back to the scale'); }, 'small danger')),
      ...extra);
    tick();
    progressTimer = setInterval(tick, 250);
  }

  body.replaceChildren(
    section('Song', songCard),
    section('Sound',
      select({ label: 'Instrument', options: Object.entries(INSTRUMENTS).map(([v, d]) => ({ v, l: d.label })), value: m.instrument, onChange: set('music', 'instrument') }),
      select({ label: 'Scale', options: Object.entries(SCALES).map(([v, d]) => ({ v, l: d.label })), value: m.scale, onChange: set('music', 'scale') }),
      select({ label: 'Root note', options: NOTE_NAMES.map(n => ({ v: n, l: n })), value: m.root, onChange: set('music', 'root') }),
      slider({ label: 'Octave', min: 2, max: 6, step: 1, value: m.octave, onInput: set('music', 'octave') }),
      select({
        label: 'Notes play on', value: m.soundOn, onChange: set('music', 'soundOn'),
        options: [{ v: 'shapes', l: 'Hits on shapes' }, { v: 'shapesWalls', l: 'Shapes + walls' }, { v: 'all', l: 'Every collision' }, { v: 'rules', l: 'Only “play a note” rules' }],
      }),
      slider({ label: 'Min impact for a note', min: 0, max: 6, step: 0.1, value: m.minImpact, format: v => (+v).toFixed(1), onInput: set('music', 'minImpact') }),
      slider({ label: 'Volume', min: 0, max: 1, step: 0.01, value: m.volume, format: v => `${Math.round(v * 100)}%`, onInput: set('music', 'volume') }),
      slider({ label: 'Reverb', min: 0, max: 1, step: 0.01, value: m.reverb, format: v => `${Math.round(v * 100)}%`, onInput: set('music', 'reverb') })),
    resetButton('music', () => buildMusic(body)),
  );
}

// ─── SCENES ───
function buildScenes(body) {
  body.replaceChildren(
    h('p.hint', { text: 'Ready-made viral setups. They are built with shapes + rules, so you can open Rules and tweak everything.' }),
    h('div.scene-grid', null, TEMPLATES.map(t => h('button.scene-card', { type: 'button', onclick: () => askLoadTemplate(t) },
      h('span.scene-emoji', { text: t.emoji }),
      h('span.scene-name', { text: t.name }),
      h('span.scene-desc', { text: t.desc })))));
}

export async function askLoadTemplate(t) {
  const busy = !isEmpty() || rules.rules.length;
  if (busy && !(await confirmDialog(`Load “${t.name}”?`, 'This replaces the current scene, its rules and the World/FX/Music settings.', 'Load scene'))) return;
  loadTemplate(t);
  closePanel();
  $('#lbl-format').textContent = ASPECTS[settings.aspect].label;
  toast(t.id === 'empty' ? 'Empty scene ready' : `${t.name} loaded — press Play`);
  $('#btn-format').dataset.aspect = settings.aspect;
}

// ─── SHAPE INSPECTOR ───
export function inspectShape(s) {
  selectShape(s);
  openPanel('shape');
  buildInspector($('#panel-shape .panel-body'), s);
  $('#panel-shape .panel-title').textContent = SHAPE_LABELS[s.kind] || 'Shape';
}

function buildInspector(body, s) {
  let snap = serializeShape(s);
  const commit = () => {
    if (!s.inWorld) return;
    const after = serializeShape(s);
    if (JSON.stringify(after) !== JSON.stringify(snap)) history.push(cmd.editShape(s, snap, after));
    snap = after;
  };
  const noteOpts = [{ v: 'auto', l: 'Auto (by height)' }];
  for (let m = 36; m <= 96; m++) noteOpts.push({ v: String(m), l: midiToName(m) });
  const parts = [
    section('Look',
      swatches({ label: 'Color', value: s.hue, allowWhite: true, onChange: v => { s.hue = v; commit(); } })),
    section('Motion',
      slider({ label: 'Spin', min: -360, max: 360, step: 5, value: s.spin, format: v => (v === 0 ? 'off' : `${v > 0 ? '↻' : '↺'} ${Math.abs(v)}°/s`), onInput: v => { s.spin = v; if (!v) stopShapeMotion(s); }, onChange: commit }),
      slider({ label: 'Angle', min: 0, max: 359, step: 1, value: Math.round(wrapDeg(s.angle / DEG)), format: v => `${v}°`, onInput: v => rotateShape(s, v * DEG - s.angle), onChange: commit }),
      slider({ label: 'Size', min: 20, max: 400, step: 5, value: Math.round(s.scale * 100), format: v => `${v}%`, onInput: v => setShapeScale(s, v / 100), onChange: commit })),
    section('Physics',
      slider({ label: 'Bounciness', min: 0, max: 1.5, step: 0.05, value: s.bounce, format: fmt2, onInput: v => { s.bounce = v; setShapeMaterial(s); }, onChange: commit })),
  ];
  if (s.kind === 'ring') {
    parts.push(section('Circle gap',
      slider({ label: 'Gap size', min: 0, max: 180, step: 1, value: s.gap, format: v => (v ? `${v}°` : 'closed'), onInput: v => restoreShape(s, { ...serializeShape(s), gap: v }), onChange: commit }),
      slider({ label: 'Gap position', min: 0, max: 359, step: 1, value: Math.round(wrapDeg(s.gapAt)), format: v => `${v}°`, onInput: v => restoreShape(s, { ...serializeShape(s), gapAt: v }), onChange: commit })));
  }
  parts.push(section('Sound',
    select({ label: 'Note', options: noteOpts, value: s.note == null ? 'auto' : String(s.note), onChange: v => { s.note = v === 'auto' ? null : +v; commit(); } })));
  parts.push(h('div.btn-row.panel-foot', null,
    button('Duplicate', () => {
      const d = createShape({ ...serializeShape(s), id: 0, x: s.x + 24, y: s.y + 24 });
      addShape(d);
      history.push(cmd.addShape(d));
      inspectShape(d);
    }),
    button('Delete', () => {
      removeShape(s);
      history.push(cmd.removeShape(s));
      closePanel();
    }, 'danger')));
  body.replaceChildren(...parts);
}

// ─── SONG LOADING ───
function bindSong() {
  const input = $('#song-input');
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.value = ''; // picking the same file again must work
    if (f) await loadSong(f);
  });
  let depth = 0;
  const overlay = $('#drop-overlay');
  window.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; overlay.hidden = false; } });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) overlay.hidden = true; });
  window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', async e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const f = e.dataTransfer.files[0];
    if (f) await loadSong(f);
  });
}

const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');

async function loadSong(file) {
  toast(`Loading “${file.name}”…`);
  try {
    await unlock();
    const info = await loadSongFile(file);
    if (info.type === 'midi') {
      const t = song.tracks.find(x => x.index === currentTrack());
      toast(`♪ ${song.name}: ${song.events.length} notes${t ? ` from “${t.name}”` : ''}`);
    } else {
      toast(`♪ ${song.name} loaded — every bounce plays the next slice`);
    }
    onRunState(game.running); // background mode starts right away if playing
    if (currentPanel() !== 'music') openPanel('music');
  } catch (e) {
    toast(e.message || 'Could not load this file', 'error');
  }
}

// ─── RECORDING ───
let recTimer = 0;

function bindRecording() {
  const btn = $('#btn-rec');
  if (!canRecord()) {
    btn.disabled = true;
    btn.title = 'Video recording is not supported in this browser';
    return;
  }
  btn.addEventListener('click', async () => {
    if (rec.active) { await finishRecording(); return; }
    try {
      await startRecording();
      btn.classList.add('recording');
      btn.setAttribute('aria-pressed', 'true');
      btn.title = 'Stop recording';
      if (!game.running) start();
      recTimer = setInterval(() => { $('#rec-time').textContent = fmtTime(recordingSeconds()); }, 250);
      $('#rec-time').textContent = '0:00';
      toast('● Recording — tap the red button to stop');
    } catch (e) {
      toast('Recording failed: ' + (e.message || e), 'error');
    }
  });
}

async function finishRecording() {
  const btn = $('#btn-rec');
  clearInterval(recTimer);
  btn.classList.remove('recording');
  btn.setAttribute('aria-pressed', 'false');
  btn.title = 'Record video';
  $('#rec-time').textContent = '';
  const blob = await stopRecording();
  if (!blob || !blob.size) { toast('Nothing was recorded', 'error'); return; }
  const url = URL.createObjectURL(blob);
  const name = fileNameFor(blob);
  const file = new File([blob], name, { type: blob.type });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const video = h('video.rec-preview', { src: url, controls: true, playsinline: true, loop: true });
  openModal({
    title: 'Your video',
    wide: true,
    body: h('div', null, video, h('p.hint', { text: `${name} · ${(blob.size / 1048576).toFixed(1)} MB` })),
    actions: [
      { label: 'Close' },
      ...(canShare ? [{ label: 'Share…', onClick: () => { navigator.share({ files: [file], title: 'Bouncical' }).catch(() => {}); return false; } }] : []),
      { label: 'Save video', primary: true, onClick: () => { const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); return false; } },
    ],
    onClose: () => setTimeout(() => URL.revokeObjectURL(url), 1000),
  });
}

// ─── KEYBOARD ───
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    const el = e.target || document.body;
    const tag = el.tagName || '';
    // Sliders and switches don't eat shortcuts; text fields and menus do.
    const typing = tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
      || (tag === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(el.type));
    if (e.key === 'Escape') {
      if (isModalOpen()) closeModal();
      else if (!$('#format-menu').hidden) $('#format-menu').hideMenu();
      else if (currentPanel()) closePanel();
      else selectShape(null);
      return;
    }
    if (typing || isModalOpen()) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) history.redo(); else history.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); history.redo(); return; }
    if (mod || e.altKey) return;
    const bar = el.closest && el.closest('#tools, #controls, #topbar');
    if (e.key === ' ' && (tag === 'BODY' || tag === 'CANVAS' || bar)) { e.preventDefault(); unlock(); toggleRun(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= TOOLS.length) { setTool(TOOLS[n - 1]); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && view.selected) {
      const s = view.selected;
      removeShape(s);
      history.push(cmd.removeShape(s));
      closePanel();
    }
  });
}

