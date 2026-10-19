/* ========== Bouncical — main.js ========== */
/* Boot: settings → stage → physics → UI → frame loop. */

import { settings, loadSettings } from './config.js';
import { stage, initStage, setWorld, worldSizeFor, onStageChange } from './stage.js';
import { resetRuntime as resetPhysics } from './physics.js';
import { scene, isEmpty, history } from './scene.js';
import { render } from './render.js';
import { game, rules, update, loadStoredRules, refitIfEmpty } from './game.js';
import { initTools } from './tools.js';
import { initControls, inspectShape } from './ui/controls.js';
import { unlock } from './audio.js';
import { parseRule } from './rules/parser.js';
import { $ } from './ui/dom.js';
import { currentPanel } from './ui/panels.js';
import * as fx from './fx.js';

function boot() {
  loadSettings();
  const canvas = $('#stage');
  initStage(canvas, $('#stage-wrap'));
  const { w, h: hh } = worldSizeFor(settings.aspect);
  setWorld(settings.aspect, w, hh);
  resetPhysics();
  onStageChange(() => refitIfEmpty());

  loadStoredRules(parseRule);
  initTools(canvas, { inspect: inspectShape });
  initControls();
  wakeAudioOnFirstGesture();

  // Debug/test hook (harmless in production).
  window.__bouncical = { game, rules, scene, history, settings, stage, fx };

  let last = performance.now();
  const hint = $('#stage-hint');
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    try {
      update(dt);
      render();
    } catch (e) {
      console.error(e); // keep the loop alive whatever happens
    }
    fx.reportFrame(dt);
    const showHint = isEmpty() && !game.running && !currentPanel();
    if (hint.hidden === showHint) hint.hidden = !showHint;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Browsers start audio only from a gesture: the first touch, click or key anywhere wakes it up.
function wakeAudioOnFirstGesture() {
  const events = ['pointerup', 'keydown'];
  const wake = () => {
    if (navigator.userActivation && !navigator.userActivation.isActive) return; // e.g. Esc
    unlock().then(ok => { if (ok) events.forEach(t => window.removeEventListener(t, wake, true)); });
  };
  events.forEach(t => window.addEventListener(t, wake, true));
}

if (!window.Matter || !window.PolyBool || !window.decomp) {
  // Nothing works without the physics libraries: say so where the scene would be.
  const hint = document.getElementById('stage-hint');
  hint.removeAttribute('data-en');
  hint.textContent = 'Some files failed to load. Please reload the page.';
  hint.hidden = false;
} else {
  boot();
}
