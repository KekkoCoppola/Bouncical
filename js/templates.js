/* ========== Bouncical — templates.js ========== */
/* Ready-made viral scenes. Each one is only shapes + balls + rules +
   settings, so everything stays editable after loading. Coordinates are
   in the 9:16 world (450 × 800). */

const CX = 225, CY = 400;

function pegs() {
  const out = [];
  for (let row = 0; row < 8; row++) {
    const y = 230 + row * 58;
    const off = row % 2 ? 25 : 0;
    for (let x = 25 + off; x <= 425; x += 50) out.push({ kind: 'ring', x, y, r: 5, thick: 8 });
  }
  return out;
}

export const TEMPLATES = [
  {
    id: 'growing', name: 'Growing Ball', emoji: '🟣',
    desc: 'One ball bounces inside a circle and grows with every hit. How big can it get?',
    aspect: '9:16',
    world: { gravity: 1, ballBounce: 1, ballFriction: 0, ballAir: 0, maxSpeed: 22 },
    fx: { trails: true, trailLength: 18 },
    music: { instrument: 'piano', scale: 'major' },
    shapes: [{ kind: 'ring', x: CX, y: CY, r: 190, thick: 10 }],
    balls: [{ x: CX, y: 320, r: 9, vx: 7, vy: -3, hue: 320 }],
    rules: [
      { trigger: { type: 'hit_shape', shape: 'ring' }, actions: [{ type: 'ball.grow', percent: 4, max: 150 }] },
    ],
  },
  {
    id: 'escape', name: 'Ring Escape', emoji: '🌀',
    desc: 'Four spinning rings with gaps. Every ball that escapes shatters its ring and releases two more.',
    aspect: '9:16',
    world: { gravity: 1, ballBounce: 0.9, maxSpeed: 20, maxBalls: 80 },
    fx: { trails: true, trailLength: 12 },
    music: { instrument: 'bell', scale: 'pentatonic' },
    shapes: [
      { kind: 'ring', x: CX, y: CY, r: 70, thick: 8, gap: 42, gapAt: -90, spin: 70, hue: 183 },
      { kind: 'ring', x: CX, y: CY, r: 110, thick: 8, gap: 40, gapAt: 0, spin: -55, hue: 270 },
      { kind: 'ring', x: CX, y: CY, r: 150, thick: 8, gap: 38, gapAt: 90, spin: 45, hue: 320 },
      { kind: 'ring', x: CX, y: CY, r: 190, thick: 8, gap: 36, gapAt: 180, spin: -35, hue: 52 },
    ],
    balls: [{ x: CX, y: CY, r: 7, vx: 3, vy: -5, hue: 95 }],
    rules: [
      {
        trigger: { type: 'escape' },
        actions: [{ type: 'shape.break' }, { type: 'world.spawn', count: 2, where: 'center', speed: 4 }, { type: 'fx.burst', style: 'firework', amount: 40 }],
      },
    ],
  },
  {
    id: 'rain', name: 'Note Rain', emoji: '🌧',
    desc: 'Balls rain through a field of pegs and play a pentatonic melody. Pegs glow in the color of the last ball.',
    aspect: '9:16',
    world: { gravity: 1.2, ballBounce: 0.5, ballSize: 6, ballSizeVar: 15, ballCollisions: false, maxBalls: 120 },
    fx: { trails: true, trailLength: 8, noteLabels: false },
    music: { instrument: 'marimba', scale: 'pentatonic' },
    shapes: pegs(),
    balls: [],
    rules: [
      { trigger: { type: 'timer', seconds: 0.45 }, actions: [{ type: 'world.spawn', count: 1, where: 'top' }] },
      { trigger: { type: 'hit_shape', shape: 'any' }, actions: [{ type: 'shape.color', mode: 'ball' }] },
    ],
  },
  {
    id: 'strings', name: 'String Art', emoji: '🕸',
    desc: 'Zero gravity. Every bounce ties a glowing string from the hit point to the ball.',
    aspect: '9:16',
    world: { gravity: 0, ballBounce: 1, ballFriction: 0, ballAir: 0, maxSpeed: 12 },
    fx: { trails: true, trailLength: 10 },
    music: { instrument: 'bell', scale: 'major' },
    shapes: [{ kind: 'ring', x: CX, y: CY, r: 200, thick: 6 }],
    balls: [{ x: CX, y: 300, r: 8, vx: 9, vy: 5, hue: 183 }],
    rules: [
      { trigger: { type: 'hit_shape', shape: 'ring' }, actions: [{ type: 'ball.strings', max: 250 }, { type: 'ball.faster', percent: 2 }] },
    ],
  },
  {
    id: 'split', name: 'Split Frenzy', emoji: '🧬',
    desc: 'Every hit has a 35% chance to clone the ball. At 150 balls: fireworks, and it starts over.',
    aspect: '9:16',
    world: { gravity: 1, ballBounce: 0.95, maxBalls: 150 },
    fx: { trails: false },
    music: { instrument: 'chip', scale: 'major' },
    shapes: [{ kind: 'ring', x: CX, y: CY, r: 190, thick: 10 }],
    balls: [{ x: CX, y: CY, r: 8, vx: 5, vy: -4, hue: 52 }],
    rules: [
      {
        trigger: { type: 'hit_shape', shape: 'ring' }, cond: { chance: 35 },
        actions: [{ type: 'ball.clone', count: 1 }, { type: 'fx.burst', style: 'confetti', amount: 12 }],
      },
      {
        trigger: { type: 'count', count: 150 },
        actions: [{ type: 'world.clear' }, { type: 'fx.burst', style: 'firework', amount: 80 }, { type: 'fx.shake', power: 14 }, { type: 'world.spawn', count: 1, where: 'center', speed: 5 }],
      },
    ],
  },
  {
    id: 'shrink', name: 'Shrinking Arena', emoji: '⭕',
    desc: 'The spinning arena shrinks on every hit while the ball keeps speeding up.',
    aspect: '9:16',
    world: { gravity: 0.8, ballBounce: 1, ballFriction: 0, ballAir: 0, maxSpeed: 24 },
    fx: { trails: true, trailLength: 16 },
    music: { instrument: 'piano', scale: 'minor' },
    shapes: [{ kind: 'ring', x: CX, y: CY, r: 210, thick: 10, spin: 30 }],
    balls: [{ x: CX, y: CY, r: 10, vx: 6, vy: -2, hue: 0 }],
    rules: [
      {
        trigger: { type: 'hit_shape', shape: 'ring' },
        actions: [{ type: 'shape.shrink', percent: 2, min: 45 }, { type: 'ball.faster', percent: 2 }],
      },
      {
        trigger: { type: 'hit_shape', shape: 'ring' }, cond: { every: 10 },
        actions: [{ type: 'fx.flash', color: 'ball' }, { type: 'fx.shake', power: 6 }],
      },
    ],
  },
  {
    id: 'empty', name: 'Empty', emoji: '⬛',
    desc: 'A blank 9:16 scene with default settings and no rules.',
    aspect: '9:16',
    world: {}, fx: {}, music: {},
    shapes: [], balls: [], rules: [],
  },
];
