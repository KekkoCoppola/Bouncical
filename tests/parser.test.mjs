// Run with: npm test  (or: node --test tests/*.test.mjs)
// Natural-language rule parser, English + Italian.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRule, normalize } from '../js/rules/parser.js';
import { summarize } from '../js/rules/catalog.js';

// [sentence, trigger (type or {type, ...fields}), actions [[type, {params}]], cond?]
const CASES = [
  // ── Original presets ──
  ['when the ball touches a circle it changes color', { type: 'hit_shape', shape: 'ring' }, [['ball.color', { mode: 'random' }]]],
  ['when the ball falls off screen it respawns but larger', 'offscreen', [['ball.respawn', { grow: 25 }]]],
  ['when the ball hits a line it speeds up', { type: 'hit_shape', shape: 'line' }, [['ball.faster']]],
  ['when the ball hits a triangle it explodes into 3 balls', { type: 'hit_shape', shape: 'tri' }, [['ball.explode', { count: 3 }]]],
  ['the triangle spins', { type: 'start', shape: 'tri' }, [['shape.spin', { mode: 'cw' }]]],

  // ── English ──
  ['when the ball hits a circle it grows 10% and the circle spins', { type: 'hit_shape', shape: 'ring' }, [['ball.grow', { percent: 10 }], ['shape.spin']]],
  ['every 2 seconds spawn a ball at the top', { type: 'timer', seconds: 2 }, [['world.spawn', { count: 1, where: 'top' }]]],
  ['every half second drop 2 balls in the center', { type: 'timer', seconds: 0.5 }, [['world.spawn', { count: 2, where: 'center' }]]],
  ['when a ball escapes the ring, the ring breaks and spawn 2 new balls in the center', 'escape', [['shape.break'], ['world.spawn', { count: 2, where: 'center' }]]],
  ['when the ball hits the floor it bounces higher', { type: 'hit_wall', side: 'floor' }, [['ball.bounce', { mode: 'more' }]]],
  ['when two balls collide they change color', 'hit_ball', [['ball.color']]],
  ['every 3rd hit the ball explodes into 5', { type: 'hit_shape' }, [['ball.explode', { count: 5 }]], { every: 3 }],
  ['when the ball hits a rectangle, 50% chance it clones itself', { type: 'hit_shape', shape: 'rect' }, [['ball.clone', { count: 1 }]], { chance: 50 }],
  ['when a ball hits a circle the circle shrinks by 5% at most 10 times', { type: 'hit_shape', shape: 'ring' }, [['shape.shrink', { percent: 5 }]], { max: 10 }],
  ['when there are 50 balls remove all balls', { type: 'count', count: 50 }, [['world.clear']]],
  ['when no balls are left spawn 3 balls at the center', 'empty', [['world.spawn', { count: 3, where: 'center' }]]],
  ['at the start the circles spin counter-clockwise fast', { type: 'start', shape: 'ring' }, [['shape.spin', { mode: 'ccw', speed: 180 }]]],
  ['every 5 seconds gravity flips', { type: 'timer', seconds: 5 }, [['world.gravity', { mode: 'flip' }]]],
  ['when the ball hits a line, slow motion for 3 seconds and the screen shakes', { type: 'hit_shape', shape: 'line' }, [['world.time', { scale: 0.3, duration: 3 }], ['fx.shake']]],
  ['when a ball hits a circle, confetti!', { type: 'hit_shape', shape: 'ring' }, [['fx.burst', { style: 'confetti' }]]],
  ['when a ball hits a triangle the triangle turns red', { type: 'hit_shape', shape: 'tri' }, [['shape.color', { mode: 'set', hue: 0 }]]],
  ['when a ball hits a circle the circle takes the ball\'s color', { type: 'hit_shape', shape: 'ring' }, [['shape.color', { mode: 'ball' }]]],
  ['balls leave a trail', { type: 'spawn' }, [['ball.trail', { on: true }]]],
  ['new balls are blue', { type: 'spawn' }, [['ball.color', { mode: 'set', hue: 215 }]]],
  ['when the ball hits a circle show "+1"', { type: 'hit_shape', shape: 'ring' }, [['fx.text', { text: '+1' }]]],
  ['when a ball hits a circle the gap widens by 15 degrees', { type: 'hit_shape', shape: 'ring' }, [['shape.gap', { mode: 'widen', degrees: 15 }]]],
  ['when the ball leaves the screen the floor appears', 'offscreen', [['world.bounds', { which: 'floor', state: 'on' }]]],
  ['when a ball hits a circle it draws strings', { type: 'hit_shape', shape: 'ring' }, [['ball.strings']]],
  ['when the ball hits a shape it jumps up', { type: 'hit_shape', shape: 'any' }, [['ball.launch', { dir: 'up' }]]],
  ['every other bounce the circle spins faster', { type: 'hit_shape' }, [['shape.spin', { mode: 'faster' }]], { every: 2 }],
  ['when the ball hits a box it plays a high note', { type: 'hit_shape', shape: 'rect' }, [['sound.note', { which: 'high' }]]],
  ['when a ball hits a circle, fireworks and a flash', { type: 'hit_shape', shape: 'ring' }, [['fx.burst', { style: 'firework' }], ['fx.flash']]],
  ['every 10 seconds gravity rotates 90 degrees', { type: 'timer', seconds: 10 }, [['world.gravity', { mode: 'rotate', degrees: 90 }]]],
  ['when a ball appears it gets a random color', { type: 'spawn' }, [['ball.color', { mode: 'random' }]]],
  ['when the ball hits a line its note goes up', { type: 'hit_shape', shape: 'line' }, [['ball.note', { dir: 'up' }]]],
  ['when the ball hits the left wall it reverses', { type: 'hit_wall', side: 'left' }, [['ball.reverse']]],
  ['only once when a ball hits a circle pause the game', { type: 'hit_shape', shape: 'ring' }, [['world.pause']], { max: 1 }],

  // ── Italiano ──
  ['quando la pallina tocca il cerchio diventa più grande del 10% e il cerchio gira', { type: 'hit_shape', shape: 'ring' }, [['ball.grow', { percent: 10 }], ['shape.spin']]],
  ['ogni 2 secondi genera una pallina in alto', { type: 'timer', seconds: 2 }, [['world.spawn', { count: 1, where: 'top' }]]],
  ['ogni 3 colpi la pallina esplode in 4', { type: 'hit_shape' }, [['ball.explode', { count: 4 }]], { every: 3 }],
  ['quando una pallina esce dal cerchio, il cerchio si rompe e nascono 2 nuove palline al centro', 'escape', [['shape.break'], ['world.spawn', { count: 2, where: 'center' }]]],
  ['quando la pallina colpisce un triangolo esplode in 3 palline', { type: 'hit_shape', shape: 'tri' }, [['ball.explode', { count: 3 }]]],
  ['quando due palline si scontrano cambiano colore', 'hit_ball', [['ball.color']]],
  ['quando la pallina tocca il pavimento rimbalza di più', { type: 'hit_wall', side: 'floor' }, [['ball.bounce', { mode: 'more' }]]],
  ['ogni 5 secondi la gravità si inverte', { type: 'timer', seconds: 5 }, [['world.gravity', { mode: 'flip' }]]],
  ['all\'inizio i cerchi girano in senso antiorario', { type: 'start', shape: 'ring' }, [['shape.spin', { mode: 'ccw' }]]],
  ['quando non ci sono più palline genera 3 palline al centro', 'empty', [['world.spawn', { count: 3, where: 'center' }]]],
  ['quando la pallina esce dallo schermo riappare più grande', 'offscreen', [['ball.respawn', { grow: 25 }]]],
  ['quando la pallina tocca una linea accelera del 30%', { type: 'hit_shape', shape: 'line' }, [['ball.faster', { percent: 30 }]]],
  ['quando la pallina tocca il cerchio il cerchio si rimpicciolisce del 5%', { type: 'hit_shape', shape: 'ring' }, [['shape.shrink', { percent: 5 }]]],
  ['quando la pallina tocca il cerchio diventa rossa', { type: 'hit_shape', shape: 'ring' }, [['ball.color', { mode: 'set', hue: 0 }]]],
  ['ogni volta che la pallina rimbalza cresce del 3%', { type: 'hit_shape' }, [['ball.grow', { percent: 3 }]]],
  ['con probabilità del 25% quando la pallina tocca un rettangolo si duplica', { type: 'hit_shape', shape: 'rect' }, [['ball.clone']], { chance: 25 }],
  ['quando la pallina tocca il cerchio coriandoli e lo schermo trema', { type: 'hit_shape', shape: 'ring' }, [['fx.burst', { style: 'confetti' }], ['fx.shake']]],
  ['quando la pallina tocca il cerchio rallentatore per 2 secondi', { type: 'hit_shape', shape: 'ring' }, [['world.time', { scale: 0.3, duration: 2 }]]],
  ['le palline lasciano una scia', { type: 'spawn' }, [['ball.trail', { on: true }]]],
  ['quando ci sono 30 palline elimina tutte le palline', { type: 'count', count: 30 }, [['world.clear']]],
  ['quando la pallina tocca il cerchio il varco si allarga di 20 gradi', { type: 'hit_shape', shape: 'ring' }, [['shape.gap', { mode: 'widen', degrees: 20 }]]],
  ['quando la pallina tocca il triangolo il triangolo scompare', { type: 'hit_shape', shape: 'tri' }, [['shape.break']]],
  ['quando la pallina tocca il cerchio sparisce', { type: 'hit_shape', shape: 'ring' }, [['ball.remove']]],
  ['quando la pallina tocca il cerchio suona una nota casuale', { type: 'hit_shape', shape: 'ring' }, [['sound.note', { which: 'random' }]]],
  ['quando la pallina tocca il cerchio disegna dei fili', { type: 'hit_shape', shape: 'ring' }, [['ball.strings']]],
  ['quando la pallina tocca il soffitto il pavimento scompare', { type: 'hit_wall', side: 'ceiling' }, [['world.bounds', { which: 'floor', state: 'off' }]]],
  ['al massimo 3 volte quando la pallina tocca il cerchio si clona', { type: 'hit_shape', shape: 'ring' }, [['ball.clone']], { max: 3 }],
  ['quando la pallina tocca la linea salta in alto', { type: 'hit_shape', shape: 'line' }, [['ball.launch', { dir: 'up' }]]],
  ['quando nasce una pallina diventa blu', { type: 'spawn' }, [['ball.color', { mode: 'set', hue: 215 }]]],
  ['ogni secondo il cerchio cambia colore', { type: 'timer', seconds: 1 }, [['shape.color']]],
  ['quando la pallina tocca il cerchio mostra "Bravo!"', { type: 'hit_shape', shape: 'ring' }, [['fx.text', { text: 'Bravo!' }]]],
  ['quando la pallina tocca il cerchio si ferma', { type: 'hit_shape', shape: 'ring' }, [['ball.stop']]],
  ['quando la pallina tocca il cerchio il cerchio smette di girare', { type: 'hit_shape', shape: 'ring' }, [['shape.spin', { mode: 'stop' }]]],
];

for (const [sentence, trig, acts, cond] of CASES) {
  test(sentence, () => {
    const res = parseRule(sentence);
    assert.notEqual(res.status, 'fail', `failed: ${res.message}`);
    const r = res.rule;
    const exp = typeof trig === 'string' ? { type: trig } : trig;
    for (const k in exp) assert.equal(r.trigger[k], exp[k], `trigger.${k} — ${summarize(r)}`);
    assert.deepEqual(r.actions.map(a => a.type), acts.map(a => a[0]), `actions — ${summarize(r)}`);
    acts.forEach(([, params], i) => {
      for (const k in params || {}) assert.equal(r.actions[i][k], params[k], `${acts[i][0]}.${k} — ${summarize(r)}`);
    });
    for (const k in cond || {}) assert.equal(r.cond[k], cond[k], `cond.${k} — ${summarize(r)}`);
  });
}

test('nonsense fails with a helpful message', () => {
  const res = parseRule('banana pizza');
  assert.equal(res.status, 'fail');
  assert.match(res.message, /Try/);
});

test('trigger without action is a partial rule', () => {
  const res = parseRule('when the ball hits a circle');
  assert.equal(res.status, 'partial');
  assert.equal(res.rule.trigger.type, 'hit_shape');
  assert.equal(res.rule.actions.length, 0);
});

test('normalize handles accents, number words and decimal commas', () => {
  assert.equal(normalize('Ogni DUE secondi, velocità 0,5'), 'ogni 2 secondi, velocita 0.5');
  assert.match(normalize('la pallina è più grande'), /_is_ piu grande/);
});
