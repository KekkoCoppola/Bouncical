/* ========== Bouncical — rules/catalog.js ========== */
/* Single source of truth for rules: triggers (WHEN), conditions (IF) and
   actions (THEN), with their parameters, defaults and English summaries.
   Pure data + helpers, no DOM: shared by the engine, parser and builder. */

// ─── OPTION LISTS ───
export const SHAPE_FILTER = [
  { v: 'any', l: 'any shape', n: 'shape' },
  { v: 'ring', l: 'a circle', n: 'circle' },
  { v: 'line', l: 'a line', n: 'line' },
  { v: 'tri', l: 'a triangle', n: 'triangle' },
  { v: 'rect', l: 'a rectangle', n: 'rectangle' },
];
export const WALL_SIDES = [
  { v: 'any', l: 'any wall' }, { v: 'left', l: 'the left wall' }, { v: 'right', l: 'the right wall' },
  { v: 'floor', l: 'the floor' }, { v: 'ceiling', l: 'the ceiling' },
];
export const COLORS = [
  { v: 0, l: 'red' }, { v: 28, l: 'orange' }, { v: 52, l: 'yellow' }, { v: 95, l: 'lime' },
  { v: 145, l: 'green' }, { v: 183, l: 'cyan' }, { v: 215, l: 'blue' }, { v: 270, l: 'purple' },
  { v: 320, l: 'pink' },
];

export const optLabel = (opts, v) => (opts.find(o => o.v === v) || opts[0]).l;
export const colorName = hue => {
  let best = COLORS[0], d = 999;
  for (const c of COLORS) {
    const dd = Math.min(Math.abs(c.v - hue), 360 - Math.abs(c.v - hue));
    if (dd < d) { d = dd; best = c; }
  }
  return best.l;
};
export const shapeNoun = kind => (SHAPE_FILTER.find(o => o.v === kind) || SHAPE_FILTER[0]).n;

const sel = (key, label, options, def, extra = {}) => ({ key, label, type: 'select', options, def, ...extra });
const num = (key, label, min, max, step, def, extra = {}) => ({ key, label, type: 'number', min, max, step, def, ...extra });
const opts = (...pairs) => pairs.map(([v, l]) => ({ v, l }));

// ─── TRIGGERS (WHEN) ───
const shapeTarget = sel('shape', 'Shape actions affect', opts(
  ['any', 'all shapes'], ['ring', 'circles'], ['line', 'lines'], ['tri', 'triangles'], ['rect', 'rectangles'],
), 'any');

export const TRIGGERS = {
  hit_shape: {
    label: 'Ball hits a shape', ball: true, shape: true,
    fields: [sel('shape', 'Shape', SHAPE_FILTER, 'any')],
    text: t => `a ball hits ${optLabel(SHAPE_FILTER, t.shape)}`,
  },
  hit_wall: {
    label: 'Ball hits a wall', ball: true,
    fields: [sel('side', 'Wall', WALL_SIDES, 'any')],
    text: t => `a ball hits ${optLabel(WALL_SIDES, t.side)}`,
  },
  hit_ball: {
    label: 'Ball hits another ball', ball: true, fields: [],
    text: () => 'two balls collide',
  },
  escape: {
    label: 'Ball escapes a circle', ball: true, shape: true, fields: [],
    text: () => 'a ball escapes a circle',
  },
  offscreen: {
    label: 'Ball leaves the screen', ball: true, fields: [],
    text: () => 'a ball leaves the screen',
  },
  spawn: {
    label: 'Ball appears', ball: true,
    fields: [sel('source', 'Which balls', opts(['any', 'any ball'], ['user', 'placed by you'], ['rule', 'created by rules']), 'any')],
    text: t => (t.source === 'user' ? 'you place a ball' : t.source === 'rule' ? 'a rule creates a ball' : 'a ball appears'),
  },
  timer: {
    label: 'Every N seconds',
    fields: [num('seconds', 'Every', 0.1, 120, 0.1, 2, { unit: 's' }), shapeTarget],
    text: t => `every ${t.seconds} s`,
  },
  start: {
    label: 'Simulation starts', fields: [shapeTarget],
    text: () => 'the simulation starts',
  },
  count: {
    label: 'Ball count reaches N',
    fields: [num('count', 'Balls', 1, 1000, 1, 20)],
    text: t => `there are ${t.count} balls`,
  },
  empty: {
    label: 'No balls left', fields: [],
    text: () => 'no balls are left',
  },
};

// ─── CONDITIONS (IF) ───
export const COND_DEFAULTS = { every: 1, per: 'ball', chance: 100, max: 0, cooldown: 0 };

// ─── ACTIONS (THEN) ───
const pct = (key, label, min, max, def) => num(key, label, min, max, 1, def, { unit: '%' });
const whenMode = (...modes) => p => modes.includes(p.mode);
const whenKey = (key, ...vals) => p => vals.includes(p[key]);
const SPAWN_AT = opts(['here', 'where it happened'], ['top', 'the top'], ['center', 'the center'], ['random', 'random spot'],
  ['point', 'a point'], ['spawn', "the ball's start point"]);

export const ACTION_GROUPS = ['Ball', 'Shape', 'World', 'Effects', 'Sound'];

export const ACTIONS = {
  // Ball
  'ball.color': {
    group: 'Ball', label: 'Change color',
    fields: [
      sel('mode', 'Color', opts(['random', 'random'], ['next', 'next hue'], ['set', 'pick'], ['rainbow', 'rainbow cycle']), 'random'),
      { key: 'hue', label: 'Hue', type: 'color', def: 0, show: whenMode('set') },
    ],
    text: p => (p.mode === 'set' ? `ball turns ${colorName(p.hue)}` : p.mode === 'next' ? 'ball shifts hue'
      : p.mode === 'rainbow' ? 'ball cycles the rainbow' : 'ball gets a random color'),
  },
  'ball.grow': {
    group: 'Ball', label: 'Grow',
    fields: [pct('percent', 'By', 1, 300, 10), num('max', 'Max radius', 2, 220, 1, 80)],
    text: p => `ball grows ${p.percent}%`,
  },
  'ball.shrink': {
    group: 'Ball', label: 'Shrink',
    fields: [pct('percent', 'By', 1, 90, 10), num('min', 'Min radius', 2, 60, 1, 3),
      { key: 'pop', label: 'Pop at min size', type: 'bool', def: false }],
    text: p => `ball shrinks ${p.percent}%`,
  },
  'ball.faster': {
    group: 'Ball', label: 'Speed up', fields: [pct('percent', 'By', 1, 300, 20)],
    text: p => `ball speeds up ${p.percent}%`,
  },
  'ball.slower': {
    group: 'Ball', label: 'Slow down', fields: [pct('percent', 'By', 1, 95, 30)],
    text: p => `ball slows down ${p.percent}%`,
  },
  'ball.bounce': {
    group: 'Ball', label: 'Bounciness',
    fields: [sel('mode', 'Make it', opts(['more', 'bouncier'], ['less', 'less bouncy'], ['set', 'set to']), 'more'),
      num('value', 'Amount', 0, 1.5, 0.05, 0.15)],
    text: p => (p.mode === 'set' ? `ball bounciness = ${p.value}` : `ball gets ${p.mode === 'less' ? 'less bouncy' : 'bouncier'}`),
  },
  'ball.reverse': { group: 'Ball', label: 'Reverse direction', fields: [], text: () => 'ball reverses' },
  'ball.launch': {
    group: 'Ball', label: 'Launch',
    fields: [sel('dir', 'Direction', opts(['up', 'up'], ['down', 'down'], ['left', 'left'], ['right', 'right'],
      ['random', 'random'], ['center', 'toward center'], ['away', 'away from center']), 'up'),
    num('power', 'Power', 1, 40, 1, 12)],
    text: p => `ball is launched ${p.dir === 'center' ? 'toward the center' : p.dir === 'away' ? 'away from the center' : p.dir}`,
  },
  'ball.stop': { group: 'Ball', label: 'Stop', fields: [], text: () => 'ball stops' },
  'ball.clone': {
    group: 'Ball', label: 'Clone', fields: [num('count', 'Copies', 1, 10, 1, 1)],
    text: p => `ball clones itself${p.count > 1 ? ` ×${p.count}` : ''}`,
  },
  'ball.explode': {
    group: 'Ball', label: 'Explode into pieces',
    fields: [num('count', 'Pieces', 2, 12, 1, 4), pct('size', 'Piece size', 20, 100, 60)],
    text: p => `ball explodes into ${p.count}`,
  },
  'ball.remove': { group: 'Ball', label: 'Disappear', fields: [], text: () => 'ball disappears' },
  'ball.respawn': {
    group: 'Ball', label: 'Respawn',
    fields: [sel('where', 'At', opts(['spawn', 'its start point'], ['top', 'the top'], ['center', 'the center'], ['random', 'random spot']), 'spawn'),
      num('grow', 'Size change', -80, 300, 1, 0, { unit: '%' })],
    text: p => `ball respawns${p.grow > 0 ? ` ${p.grow}% bigger` : p.grow < 0 ? ` ${-p.grow}% smaller` : ''}`,
  },
  'ball.teleport': {
    group: 'Ball', label: 'Teleport',
    fields: [sel('where', 'To', opts(['random', 'random spot'], ['top', 'the top'], ['center', 'the center']), 'random')],
    text: p => `ball teleports to ${p.where === 'random' ? 'a random spot' : 'the ' + p.where}`,
  },
  'ball.note': {
    group: 'Ball', label: 'Change pitch',
    fields: [sel('dir', 'Pitch', opts(['up', 'higher'], ['down', 'lower']), 'up'), num('steps', 'Steps', 1, 12, 1, 1)],
    text: p => `ball's note goes ${p.dir}`,
  },
  'ball.trail': {
    group: 'Ball', label: 'Trail', fields: [{ key: 'on', label: 'Trail on', type: 'bool', def: true }],
    text: p => (p.on ? 'ball leaves a trail' : 'ball loses its trail'),
  },
  'ball.strings': {
    group: 'Ball', label: 'String art', fields: [num('max', 'Max strings', 5, 400, 5, 150)],
    text: () => 'ball draws strings to its hits',
  },

  // Shape
  'shape.spin': {
    group: 'Shape', label: 'Spin',
    fields: [sel('mode', 'Spin', opts(['cw', 'clockwise'], ['ccw', 'counter-clockwise'], ['reverse', 'reverse direction'],
      ['faster', 'faster'], ['slower', 'slower'], ['stop', 'stop']), 'cw'),
    num('speed', 'Speed', 1, 720, 1, 90, { unit: '°/s', show: whenMode('cw', 'ccw') }),
    { ...pct('percent', 'By', 1, 300, 25), show: whenMode('faster', 'slower') }],
    text: (p, n) => (p.mode === 'stop' ? `${n} stops spinning` : p.mode === 'reverse' ? `${n} reverses its spin`
      : p.mode === 'faster' ? `${n} spins faster` : p.mode === 'slower' ? `${n} spins slower`
        : `${n} spins ${p.mode === 'ccw' ? 'counter-clockwise' : 'clockwise'}`),
  },
  'shape.grow': {
    group: 'Shape', label: 'Grow', fields: [pct('percent', 'By', 1, 200, 10), num('max', 'Max size', 10, 2000, 5, 500)],
    text: (p, n) => `${n} grows ${p.percent}%`,
  },
  'shape.shrink': {
    group: 'Shape', label: 'Shrink',
    fields: [pct('percent', 'By', 1, 90, 10), num('min', 'Min size', 5, 500, 1, 25),
      { key: 'pop', label: 'Break at min size', type: 'bool', def: false }],
    text: (p, n) => `${n} shrinks ${p.percent}%`,
  },
  'shape.color': {
    group: 'Shape', label: 'Change color',
    fields: [sel('mode', 'Color', opts(['ball', "the ball's color"], ['random', 'random'], ['next', 'next hue'], ['set', 'pick'], ['white', 'white']), 'ball'),
      { key: 'hue', label: 'Hue', type: 'color', def: 183, show: whenMode('set') }],
    text: (p, n) => (p.mode === 'ball' ? `${n} takes the ball's color` : p.mode === 'set' ? `${n} turns ${colorName(p.hue)}`
      : p.mode === 'white' ? `${n} turns white` : `${n} changes color`),
  },
  'shape.break': { group: 'Shape', label: 'Break apart', fields: [], text: (p, n) => `${n} breaks apart` },
  'shape.gap': {
    group: 'Shape', label: 'Circle gap',
    fields: [sel('mode', 'Gap', opts(['widen', 'widen'], ['narrow', 'narrow'], ['open', 'open to'], ['close', 'close']), 'widen'),
      num('degrees', 'Degrees', 1, 300, 1, 20, { unit: '°', show: whenMode('widen', 'narrow', 'open') })],
    text: (p, n) => (p.mode === 'close' ? `${n} closes its gap` : `${n} gap ${p.mode === 'open' ? 'opens to' : p.mode + 's by'} ${p.degrees}°`),
  },

  // World
  'world.gravity': {
    group: 'World', label: 'Gravity',
    fields: [sel('mode', 'Gravity', opts(['flip', 'flip'], ['stronger', 'stronger'], ['weaker', 'weaker'], ['set', 'set'],
      ['rotate', 'rotate'], ['random', 'random direction'], ['zero', 'turn off'], ['reset', 'reset']), 'flip'),
    num('amount', 'Amount', 0.05, 3, 0.05, 0.3, { show: whenMode('stronger', 'weaker') }),
    num('strength', 'Strength', 0, 5, 0.05, 1.2, { show: whenMode('set') }),
    num('angle', 'Direction', 0, 359, 1, 90, { unit: '°', show: whenMode('set') }),
    num('degrees', 'Rotate by', -180, 180, 1, 90, { unit: '°', show: whenMode('rotate') })],
    text: p => ({
      flip: 'gravity flips', stronger: 'gravity gets stronger', weaker: 'gravity gets weaker', set: `gravity set to ${p.strength}`,
      rotate: `gravity rotates ${p.degrees}°`, random: 'gravity points somewhere random', zero: 'gravity turns off', reset: 'gravity resets',
    })[p.mode],
  },
  'world.time': {
    group: 'World', label: 'Slow motion / time speed',
    fields: [num('scale', 'Speed', 0.05, 3, 0.05, 0.3, { unit: '×' }), num('duration', 'For', 0, 30, 0.1, 2, { unit: 's' })],
    text: p => `time runs at ${p.scale}×${p.duration ? ` for ${p.duration}s` : ''}`,
  },
  'world.spawn': {
    group: 'World', label: 'Spawn balls',
    fields: [num('count', 'Balls', 1, 30, 1, 1),
      sel('where', 'At', SPAWN_AT, 'top'),
      num('x', 'X', 0, 100, 1, 50, { unit: '%', show: whenKey('where', 'point') }),
      num('y', 'Y', 0, 100, 1, 10, { unit: '%', show: whenKey('where', 'point') }),
      num('speed', 'Initial speed', 0, 30, 1, 0),
      num('size', 'Radius (0 = default)', 0, 100, 1, 0)],
    text: p => `${p.count} new ball${p.count > 1 ? 's' : ''} at ${optLabel(SPAWN_AT, p.where)}`,
  },
  'world.clear': { group: 'World', label: 'Remove all balls', fields: [], text: () => 'all balls disappear' },
  'world.pause': { group: 'World', label: 'Pause simulation', fields: [], text: () => 'the simulation pauses' },
  'world.bounds': {
    group: 'World', label: 'Floor / walls',
    fields: [sel('which', 'Which', opts(['floor', 'floor'], ['ceiling', 'ceiling'], ['left', 'left wall'], ['right', 'right wall'],
      ['walls', 'side walls'], ['all', 'all borders']), 'floor'),
    sel('state', 'Becomes', opts(['off', 'open'], ['on', 'closed'], ['toggle', 'toggled']), 'toggle')],
    text: p => `${p.which === 'all' ? 'all borders' : p.which === 'walls' ? 'side walls' : p.which} ${p.state === 'off' ? 'open' : p.state === 'on' ? 'close' : 'toggle'}`,
  },

  // Effects
  'fx.burst': {
    group: 'Effects', label: 'Particle burst',
    fields: [sel('style', 'Style', opts(['sparks', 'sparks'], ['confetti', 'confetti'], ['firework', 'firework'], ['stars', 'stars']), 'sparks'),
      num('amount', 'Amount', 5, 200, 5, 30)],
    text: p => `${p.style} burst`,
  },
  'fx.shake': { group: 'Effects', label: 'Screen shake', fields: [num('power', 'Power', 1, 30, 1, 8)], text: () => 'screen shakes' },
  'fx.flash': {
    group: 'Effects', label: 'Flash',
    fields: [sel('color', 'Color', opts(['ball', "ball's color"], ['white', 'white'], ['set', 'pick']), 'ball'),
      { key: 'hue', label: 'Hue', type: 'color', def: 320, show: whenKey('color', 'set') }],
    text: () => 'screen flashes',
  },
  'fx.wave': { group: 'Effects', label: 'Shockwave', fields: [num('size', 'Size', 10, 600, 5, 90)], text: () => 'shockwave' },
  'fx.text': {
    group: 'Effects', label: 'Floating text',
    fields: [{ key: 'text', label: 'Text ({hits} {balls} {n})', type: 'text', def: '+1' }, num('size', 'Size', 8, 80, 1, 18)],
    text: p => `shows “${p.text}”`,
  },

  // Sound
  'sound.note': {
    group: 'Sound', label: 'Play a note',
    fields: [sel('which', 'Note', opts(['random', 'random scale note'], ['next', 'next song note'], ['high', 'high note'], ['low', 'low note']), 'random')],
    text: p => `plays ${p.which === 'next' ? 'the next song note' : `a ${p.which} note`}`,
  },
};

// ─── NORMALIZE ───
function fillFields(fields, src) {
  const out = {};
  for (const f of fields) {
    let v = src && src[f.key] !== undefined ? src[f.key] : f.def;
    if (f.type === 'number' || f.type === 'color') {
      v = Number(v);
      if (!isFinite(v)) v = f.def;
      if (f.type === 'number') v = Math.min(f.max, Math.max(f.min, v));
    } else if (f.type === 'select') {
      if (!f.options.some(o => o.v === v)) v = f.def;
    } else if (f.type === 'bool') {
      v = !!v;
    } else {
      v = String(v ?? '').slice(0, 60);
    }
    out[f.key] = v;
  }
  return out;
}

export function newTrigger(type, src) {
  const def = TRIGGERS[type] ? type : 'hit_shape';
  return { type: def, ...fillFields(TRIGGERS[def].fields, src) };
}

export function newAction(type, src) {
  if (!ACTIONS[type]) return null;
  return { type, ...fillFields(ACTIONS[type].fields, src) };
}

export function normalizeRule(r) {
  const cond = { ...COND_DEFAULTS, ...(r.cond || {}) };
  cond.every = Math.max(1, Math.min(1000, Math.round(+cond.every) || 1));
  cond.per = cond.per === 'rule' ? 'rule' : 'ball';
  cond.chance = Math.max(0, Math.min(100, +cond.chance));
  if (!isFinite(cond.chance)) cond.chance = 100;
  cond.max = Math.max(0, Math.round(+cond.max) || 0);
  cond.cooldown = Math.max(0, +cond.cooldown || 0);
  return {
    id: r.id || 0,
    enabled: r.enabled !== false,
    text: typeof r.text === 'string' ? r.text.slice(0, 300) : '',
    trigger: newTrigger(r.trigger && r.trigger.type, r.trigger),
    cond,
    actions: (Array.isArray(r.actions) ? r.actions : []).map(a => a && newAction(a.type, a)).filter(Boolean),
  };
}

// ─── SUMMARY ───
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function nounFor(trigger) {
  if (trigger.type === 'escape') return 'circle';
  return shapeNoun(trigger.shape || 'any');
}

export function describeCond(c, trigger) {
  const parts = [];
  if (c.every > 1) {
    const perBall = c.per === 'ball' && TRIGGERS[trigger.type].ball;
    parts.push(`every ${ordinal(c.every)} time${perBall ? ' per ball' : ''}`);
  }
  if (c.chance < 100) parts.push(`${c.chance}% chance`);
  if (c.max > 0) parts.push(c.max === 1 ? 'only once' : `max ${c.max} times`);
  if (c.cooldown > 0) parts.push(`cooldown ${c.cooldown}s`);
  return parts.join(', ');
}

export function summarize(rule) {
  const t = TRIGGERS[rule.trigger.type];
  const when = `When ${t.text(rule.trigger)}`;
  const cond = describeCond(rule.cond, rule.trigger);
  const noun = nounFor(rule.trigger);
  const acts = rule.actions.map(a => ACTIONS[a.type].text(a, noun));
  return `${when}${cond ? ` (${cond})` : ''} → ${acts.length ? acts.join(', ') : '…nothing yet'}`;
}
