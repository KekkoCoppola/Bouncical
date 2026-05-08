/* ========== GravitySinger — rules.js ========== */
/* Natural-language rule parser + engine */

window.RulesEngine = (function () {
  'use strict';

  let idCounter = 0;
  const rules = [];

  // ─── PARSER ───
  function parse(text) {
    const t = text.toLowerCase().trim();
    if (!t) return null;

    let trigger = null, action = null;

    // --- Triggers ---
    if (/ball.*(touch|hit|collid|bounc|strike|contact|land|reach)/i.test(t)) {
      let filter = null;
      if (/circle/i.test(t)) filter = 'circle';
      else if (/tri/i.test(t)) filter = 'triangle';
      else if (/rect/i.test(t)) filter = 'rectangle';
      else if (/line|ramp/i.test(t)) filter = 'line';
      trigger = { type: 'collision', filter };
    } else if (/ball.*(fall|drop|go|leav|exit).*(off|out|screen|world)|off.?screen|out.?of.?bound|fell.*off/i.test(t)) {
      trigger = { type: 'offscreen' };
    } else if (/ball.*(spawn|creat|appear|born|add|place)/i.test(t)) {
      trigger = { type: 'spawn' };
    }

    // --- Actions (more specific first) ---
    if (/respawn.*(x2|2|twice)|two.*balls|double.*respawn/i.test(t)) {
      action = { type: 'respawnX2' };
    } else if (/respawn.*(big|large|grow|larg)/i.test(t) || /come.*back.*(big|large)/i.test(t)) {
      action = { type: 'respawnBigger' };
    } else if (/respawn|come.*back|reappear|reset/i.test(t)) {
      action = { type: 'respawn' };
    } else if (/change.*colo|switch.*colo/i.test(t)) {
      action = { type: 'changeColor' };
    } else if (/(get|become|grow).*(big|large|huge)|expand|scale.*up/i.test(t) && !/respawn/i.test(t)) {
      action = { type: 'grow' };
    } else if (/(get|become).*(small|tiny)|shrink|scale.*down/i.test(t)) {
      action = { type: 'shrink' };
    } else if (/speed.*up|go.*fast|faster|accelerat/i.test(t)) {
      action = { type: 'speedUp' };
    } else if (/spin.*left|rotat.*left|turn.*left|counter.*clock/i.test(t)) {
      action = { type: 'spinLeft' };
    } else if (/spin|rotat|turn/i.test(t)) {
      action = { type: 'spin' };
    } else if (/bounce.*(high|more|forc|2x|double)|more.*bounc/i.test(t)) {
      action = { type: 'bounceHigher' };
    } else if (/explod|split|burst|shatter/i.test(t)) {
      const m = t.match(/(\d+)/);
      action = { type: 'explode', count: m ? Math.min(8, parseInt(m[1])) : 3 };
    } else if (/disappear|remov|destroy|delet|die|vanish/i.test(t)) {
      action = { type: 'remove' };
    } else if (/gravity.*(increas|strong|more|up|heav|double)/i.test(t)) {
      action = { type: 'gravityUp' };
    } else if (/gravity.*(revers|flip|invert|oppos)/i.test(t)) {
      action = { type: 'gravityFlip' };
    } else if (/deep.*note|lower.*note|bass/i.test(t)) {
      action = { type: 'deeperNote' };
    } else if (/high.*note|sharp/i.test(t)) {
      action = { type: 'higherNote' };
    }

    if (!trigger || !action) return null;
    return { id: ++idCounter, text, trigger, action, enabled: true };
  }

  function add(text) {
    const rule = parse(text);
    if (!rule) return null;
    rules.push(rule);
    save();
    return rule;
  }

  function remove(id) {
    const i = rules.findIndex(r => r.id === id);
    if (i >= 0) { rules.splice(i, 1); save(); }
  }

  function toggle(id) {
    const r = rules.find(r => r.id === id);
    if (r) { r.enabled = !r.enabled; save(); }
  }

  function getAll() { return rules; }

  // ─── EXECUTE ACTION ───
  function execute(actionDef, ball, ctx, target) {
    const { Body, World } = Matter;
    const { world, engine, userBodies, spawnBallAt, canvasW, canvasH } = ctx;

    switch (actionDef.type) {
      case 'spin':
        if (target) {
           target.spinSpeed = 0.02;
           if (target.parentId && circleGroups[target.parentId]) {
              circleGroups[target.parentId].spinSpeed = 0.02;
           }
        }
        break;
      case 'spinLeft':
        if (target) {
           target.spinSpeed = -0.02;
           if (target.parentId && circleGroups[target.parentId]) {
              circleGroups[target.parentId].spinSpeed = -0.02;
           }
        }
        break;
      case 'changeColor':
        ball.ballHue = (ball.ballHue + 60 + Math.random() * 120) % 360;
        break;
      case 'grow':
        if (ball.circleRadius < 30) Body.scale(ball, 1.3, 1.3);
        break;
      case 'shrink':
        if (ball.circleRadius > 3) Body.scale(ball, 0.7, 0.7);
        break;
      case 'speedUp':
        Body.setVelocity(ball, { x: ball.velocity.x * 1.4, y: ball.velocity.y * 1.4 });
        break;
      case 'slowDown':
        Body.setVelocity(ball, { x: ball.velocity.x * 0.5, y: ball.velocity.y * 0.5 });
        break;
      case 'bounceHigher':
        ball.restitution = Math.min(1.8, (ball.restitution || 0.65) + 0.35);
        break;
      case 'respawn': {
        const p = ball.spawnPos || { x: Math.random() * canvasW(), y: 20 };
        Body.setPosition(ball, p);
        Body.setVelocity(ball, { x: 0, y: 0 });
        break;
      }
      case 'respawnX2': {
        const p = ball.spawnPos || { x: Math.random() * canvasW(), y: 20 };
        Body.setPosition(ball, p);
        Body.setVelocity(ball, { x: 0, y: 0 });
        spawnBallAt(p.x, p.y, ball.circleRadius, Math.random() * 360);
        break;
      }
      case 'respawnBigger': {
        const p = ball.spawnPos || { x: Math.random() * canvasW(), y: 20 };
        Body.setPosition(ball, p);
        Body.setVelocity(ball, { x: 0, y: 0 });
        if (ball.circleRadius < 30) Body.scale(ball, 1.35, 1.35);
        break;
      }
      case 'explode': {
        const pos = { x: ball.position.x, y: ball.position.y };
        const hue = ball.ballHue;
        const r = Math.max(3, (ball.circleRadius || 6) * 0.5);
        World.remove(world, ball);
        const idx = userBodies.indexOf(ball);
        if (idx >= 0) userBodies.splice(idx, 1);
        for (let i = 0; i < actionDef.count; i++) {
          const a = (Math.PI * 2 * i) / actionDef.count;
          spawnBallAt(pos.x + Math.cos(a) * 12, pos.y + Math.sin(a) * 12, r, (hue + i * 40) % 360);
        }
        break;
      }
      case 'remove': {
        World.remove(world, ball);
        const idx2 = userBodies.indexOf(ball);
        if (idx2 >= 0) userBodies.splice(idx2, 1);
        break;
      }
      case 'gravityUp':
        engine.gravity.y = Math.min(5, engine.gravity.y + 0.3);
        break;
      case 'gravityFlip':
        engine.gravity.y *= -1;
        break;
      case 'deeperNote':
        ball._noteShift = (ball._noteShift || 0) - 2;
        break;
      case 'higherNote':
        ball._noteShift = (ball._noteShift || 0) + 2;
        break;
    }
  }

  // ─── EVALUATE ───
  function evalCollision(ball, target, otherType, ctx) {
    for (const r of rules) {
      if (!r.enabled || r.trigger.type !== 'collision') continue;
      if (r.trigger.filter && r.trigger.filter !== otherType) continue;
      execute(r.action, ball, ctx, target);
    }
  }

  function evalOffscreen(ball, ctx) {
    for (const r of rules) {
      if (!r.enabled || r.trigger.type !== 'offscreen') continue;
      execute(r.action, ball, ctx);
    }
  }

  function evalSpawn(ball, ctx) {
    for (const r of rules) {
      if (!r.enabled || r.trigger.type !== 'spawn') continue;
      execute(r.action, ball, ctx);
    }
  }

  function hasOffscreenRules() {
    return rules.some(r => r.enabled && r.trigger.type === 'offscreen');
  }

  // ─── PERSISTENCE ───
  function save() {
    try { localStorage.setItem('gs_rules', JSON.stringify(rules)); } catch (_) {}
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem('gs_rules') || '[]');
      d.forEach(r => { r.id = ++idCounter; rules.push(r); });
    } catch (_) {}
  }

  load();

  return { parse, add, remove, toggle, getAll, evalCollision, evalOffscreen, evalSpawn, hasOffscreenRules };
})();
