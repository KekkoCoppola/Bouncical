/* ========== Bouncical — main.js ========== */
/* Boot: settings → stage → physics → UI → splash → frame loop. */

import { settings, loadSettings } from './config.js';
import { stage, initStage, setWorld, worldSizeFor, onStageChange } from './stage.js';
import { resetRuntime as resetPhysics } from './physics.js';
import { scene, isEmpty, history } from './scene.js';
import { render } from './render.js';
import { game, rules, update, loadStoredRules, refitIfEmpty } from './game.js';
import { initTools } from './tools.js';
import { initControls, inspectShape, askLoadTemplate } from './ui/controls.js';
import { unlock } from './audio.js';
import { parseRule } from './rules/parser.js';
import { TEMPLATES } from './templates.js';
import { $, h } from './ui/dom.js';
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
  initSplash();

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

function initSplash() {
  const splash = $('#splash');
  const close = () => {
    unlock();
    splash.classList.add('closing');
    setTimeout(() => { splash.hidden = true; }, 260);
  };
  $('#splash-start').addEventListener('click', close);
  $('#splash-scenes').replaceChildren(...TEMPLATES.filter(t => t.id !== 'empty').map(t => h('button.chip-btn', {
    type: 'button', title: t.desc,
    onclick: () => { close(); askLoadTemplate(t); },
  }, `${t.emoji} ${t.name}`)));
}

if (!window.Matter || !window.PolyBool || !window.decomp) {
  document.body.classList.add('boot-error');
  const s = document.getElementById('splash-sub');
  if (s) s.textContent = 'Some files failed to load. Please reload the page.';
} else {
  boot();
}
