/* ========== Bouncical — rules/parser.js ========== */
/* Natural-language → rule, in English and Italian. The sentence is
   normalized (lowercase, no accents, number words → digits), then:
   1. conditions are extracted ("every 3 hits", "50% chance", "max 5 times"),
   2. the trigger is detected and cut out of the sentence,
   3. the rest is split into clauses; each clause gets a subject (ball or
      shape, inherited when missing) and one or more actions with params.
   The result is a normal rule the builder can edit. No DOM here. */

import { newAction, newTrigger, normalizeRule, summarize } from './catalog.js';

// ─── NORMALIZATION ───
const NUM_WORDS = {
  one: 1, uno: 1, una: 1, un: 1, two: 2, due: 2, three: 3, tre: 3, four: 4, quattro: 4, five: 5, cinque: 5,
  six: 6, sei: 6, seven: 7, sette: 7, eight: 8, otto: 8, nine: 9, nove: 9, ten: 10, dieci: 10,
  eleven: 11, undici: 11, twelve: 12, dodici: 12, fifteen: 15, quindici: 15, twenty: 20, venti: 20,
  thirty: 30, trenta: 30, fifty: 50, cinquanta: 50, hundred: 100, cento: 100,
};
const ORDINALS = {
  other: 2, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  altro: 2, secondo: 2, terzo: 3, quarto: 4, quinto: 5, sesto: 6, settimo: 7, ottavo: 8, nono: 9, decimo: 10,
};

export function normalize(text) {
  let t = ' ' + text.toLowerCase() + ' ';
  t = t.replace(/(\s)è(?=[\s,.!?;:])/g, '$1 _is_ ');
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[’'`´]/g, ' ');
  t = t.replace(/(\d),(\d)/g, '$1.$2');
  t = t.replace(/[;:!?]/g, ' , ');
  t = t.replace(/(\d)\s*(?:x|×)\b/g, '$1 x');
  t = t.replace(/\b(?:half\s+a\s+second|half\s+second|mezzo\s+secondo)\b/g, '0.5 seconds');
  t = t.replace(/\b(one|uno|una|un|two|due|three|tre|four|quattro|five|cinque|six|seven|sette|eight|otto|nine|nove|ten|dieci|eleven|undici|twelve|dodici|fifteen|quindici|twenty|venti|thirty|trenta|fifty|cinquanta|hundred|cento)\b/g,
    w => String(NUM_WORDS[w]));
  // "sei" is also "you are" in Italian: only treat it as 6 before a noun/unit.
  t = t.replace(/\bsei\s+(?=palline|pezzi|volte|colpi|secondi|rimbalzi|copie)/g, '6 ');
  return t.replace(/\s+/g, ' ').trim();
}

// ─── VOCABULARY ───
const SHAPE_WORDS = [
  ['ring', 'circles?|rings?|cerchi(?:o|etto)?|anell[oi]'],
  ['tri', 'triangles?|tri|triangol[oi]'],
  ['rect', 'rectangles?|rect|box(?:es)?|squares?|blocks?|rettangol[oi]|quadrat[oi]|blocc(?:o|hi)|scatol[ae]'],
  ['line', 'lines?|ramps?|platforms?|segments?|bars?|sticks?|line[ae]|rampe?|rampa|piattaform[ae]|segment[oi]|barr[ae]|ast[ae]'],
  ['any', 'shapes?|objects?|obstacles?|anything|something|form[ae]|oggett[oi]|ostacol[oi]|qualcosa'],
];
const SHAPE_RE = new RegExp(`\\b(?:${SHAPE_WORDS.map(w => w[1]).join('|')})\\b`);
const BALL_RE = /\b(?:balls?|pallin[ae]|pall[ae]|it|they|its|essa|esse)\b/;

function shapeKindOf(word) {
  for (const [kind, re] of SHAPE_WORDS) if (new RegExp(`^(?:${re})$`).test(word)) return kind;
  return null;
}

const COLOR_WORDS = [
  [0, 'red|ross[oaie]'], [28, 'orange|arancion[ei]|arancio'], [52, 'yellow|giall[oaie]|gold|oro'],
  [95, 'lime'], [145, 'green|verd[ei]'], [183, 'cyan|turquoise|azzurr[oaie]|cian[oa]|turchese'],
  [215, 'blue|blu'], [270, 'purple|violet|viola'], [320, 'pink|magenta|rosa|fucsia'],
];
function colorIn(s) {
  if (/\b(?:white|bianc[oaie]|bianchi)\b/.test(s)) return 'white';
  for (const [hue, re] of COLOR_WORDS) if (new RegExp(`\\b(?:${re})\\b`).test(s)) return hue;
  return null;
}

// ─── PARAM HELPERS ───
function pctIn(s, def) {
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|per\s*cento|percento)/);
  if (m) return +m[1];
  if (/\b(?:double|twice|doppi[oa]|raddoppi\w*)\b/.test(s)) return 100;
  if (/\b(?:half|meta|dimezz\w*)\b/.test(s)) return 50;
  if (/\b(?:a\s+lot|much|way|molto|tanto|parecchio)\b/.test(s)) return def * 2;
  if (/\b(?:a\s+little|slightly|a\s+bit|un\s+po|1\s+po|leggermente|poco)\b/.test(s)) return Math.max(1, Math.round(def / 2));
  m = s.match(/\b(?:by|del|di)\s+(\d+(?:\.\d+)?)\b/);
  if (m) return +m[1];
  return def;
}
const numIn = (s, def) => { const m = s.match(/\b(\d+(?:\.\d+)?)\b/); return m ? +m[1] : def; };
const secondsIn = (s, def) => {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?|secondi|secondo)\b/);
  return m ? +m[1] : def;
};
const degIn = (s, def) => { const m = s.match(/(\d+)\s*(?:°|deg|degrees|gradi|grado)/); return m ? +m[1] : def; };

function whereIn(s, def) {
  if (/\b(?:(?:at|from)\s+the\s+top|from\s+above|top|dall?\s*alto|in\s+alto|dal\s+cielo|sopra|cima)\b/.test(s)) return 'top';
  if (/\b(?:cent(?:er|re)|middle|centro|mezzo)\b/.test(s)) return 'center';
  if (/\b(?:random(?:ly)?|anywhere|somewhere|casual\w*|a\s+caso|ovunque)\b/.test(s)) return 'random';
  if (/\b(?:start(?:ing)?\s+(?:point|position)|punto\s+di\s+partenza|posizione\s+iniziale)\b/.test(s)) return 'spawn';
  if (/\b(?:here|there|same\s+(?:place|spot)|at\s+the\s+(?:hit|impact)|qui|li|la\s+dove|nel\s+punto|dove\s+colpisce|stesso\s+punto)\b/.test(s)) return 'here';
  return def;
}

function dirIn(s, def) {
  if (/\b(?:toward|towards)\s+the\s+cent(?:er|re)|verso\s+il\s+centro\b/.test(s)) return 'center';
  if (/\b(?:away|lontano|via\s+dal\s+centro)\b/.test(s)) return 'away';
  if (/\b(?:up|upward|upwards|su|in\s+alto|verso\s+l\s*alto)\b/.test(s)) return 'up';
  if (/\b(?:down|downward|downwards|giu|in\s+basso|verso\s+il\s+basso)\b/.test(s)) return 'down';
  if (/\b(?:left|sinistra)\b/.test(s)) return 'left';
  if (/\b(?:right|destra)\b/.test(s)) return 'right';
  if (/\b(?:random(?:ly)?|casual\w*|a\s+caso)\b/.test(s)) return 'random';
  return def;
}

// ─── CONDITIONS ───
function extractConditions(t) {
  const cond = {};
  const cut = (re, fn) => { t = t.replace(re, (...m) => { fn(m); return ' '; }); };

  cut(/\bat\s+most\s+once\s+(?:every|per)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)\b/, m => { cond.cooldown = +m[1]; });
  cut(/\bal\s+massimo\s+1\s+volta\s+ogni\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secondi|secondo)\b/, m => { cond.cooldown = +m[1]; });
  cut(/\b(?:cooldown|wait|pausa|attesa|intervallo)\s+(?:of\s+|di\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?|secondi|secondo)\b/, m => { cond.cooldown = +m[1]; });

  cut(/(\d+(?:\.\d+)?)\s*%\s*(?:di\s+)?(?:chance|probability|probabilita|possibilita|of\s+the\s+time|delle\s+volte)\b/, m => { cond.chance = +m[1]; });
  cut(/\b(?:with|con)\s+(?:a\s+)?(?:1\s+)?(?:chance|probability|probabilita|possibilita)\s+(?:of\s+|del\s+|di\s+)?(\d+(?:\.\d+)?)\s*%?/, m => { cond.chance = +m[1]; });
  cut(/\b(?:sometimes|occasionally|a\s+volte|talvolta|ogni\s+tanto|qualche\s+volta)\b/, () => { cond.chance = 50; });
  cut(/\b(?:rarely|seldom|raramente|di\s+rado)\b/, () => { cond.chance = 20; });
  cut(/\b(?:often|usually|spesso|di\s+solito)\b/, () => { cond.chance = 75; });

  const everyEN = /\bevery\s+(?:(\d+)(?:st|nd|rd|th)?|(other|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))\s+(?:single\s+)?(?:hits?|times?|bounces?|collisions?|touches?|impacts?|contacts?)\b/;
  const everyIT = /\bogni\s+(?:(\d+)\s*(?:o|a|°)?|(altro|secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono|decimo))\s+(?:colpi|colpo|volte|volta|rimbalzi|rimbalzo|tocchi|tocco|urti|urto|collisioni|collisione|impatti|impatto)\b/;
  const after = /\b(?:after|dopo)\s+(\d+)\s+(?:hits?|bounces?|collisions?|touches?|times?|colpi|rimbalzi|tocchi|urti|volte|collisioni)\b/;
  let hitHint = false;
  for (const re of [everyEN, everyIT, after]) {
    cut(re, m => {
      cond.every = m[1] ? +m[1] : ORDINALS[m[2]] || 2;
      if (/hit|bounce|collision|touch|impact|contact|colp|rimbalz|tocc|urt|collision|impatt/.test(m[0])) hitHint = true;
    });
  }
  cut(/\b(?:in\s+total|overall|globally|in\s+totale|complessivamente|in\s+generale)\b/, () => { cond.per = 'rule'; });
  cut(/\b(?:per\s+ball|each\s+ball\s+separately|per\s+pallina|per\s+ogni\s+pallina)\b/, () => { cond.per = 'ball'; });

  cut(/\b(?:only\s+once|just\s+once|once\s+only|1\s+time\s+only|1\s+volta\s+sola|solo\s+1\s+volta|1\s+sola\s+volta|soltanto\s+1\s+volta)\b/, () => { cond.max = 1; });
  cut(/\b(?:at\s+most|max(?:imum)?|only|up\s+to|no\s+more\s+than|al\s+massimo|massimo|solo|soltanto|fino\s+a|non\s+piu\s+di)\s+(\d+)\s+(?:times|time|volte|volta)\b/, m => { cond.max = +m[1]; });
  return { t, cond, hitHint };
}

// ─── TRIGGERS ───
const HIT_VERB = /\b(?:hits?|hitting|touch(?:es|ing)?|collides?(?:\s+with)?|bounces?(?:\s+(?:on|off|against|into))?|strikes?|lands?\s+on|contacts?|bumps?(?:\s+into)?|crash(?:es)?\s+into|smash(?:es)?\s+into|colpisc\w*|tocc\w*|sbatt\w*(?:\s+contro)?|urt(?:a|ano|ando)|rimbalz\w*(?:\s+(?:su|contro|sul|sulla|sui))?|scontr\w*(?:\s+con)?|impatt(?:a|ano)|atterr\w*|cade\s+su|arriva\s+su)\b/;

function detectTrigger(t) {
  let m;
  const found = (type, fields, re, match) => ({ trigger: newTrigger(type, fields), rest: t.replace(match[0], ' , ') });

  // Timer: "every 2 seconds", "ogni secondo".
  m = t.match(/\b(?:every|each|ogni)\s+(?:(\d+(?:\.\d+)?)\s*)?(ms|milliseconds?|millisecondi|s|sec|secs|seconds?|secondi|secondo|minutes?|minuti|minuto)\b/);
  if (m) {
    const n = m[1] ? +m[1] : 1;
    const unit = m[2];
    const seconds = /^m(?:s|illi)/.test(unit) ? n / 1000 : /^min/.test(unit) ? n * 60 : n;
    return found('timer', { seconds: Math.max(0.1, seconds), shape: shapeFilterIn(t) }, null, m);
  }
  m = t.match(/\b(?:(?:at|on)\s+(?:the\s+)?(?:start|beginning|launch)|when\s+(?:the\s+)?(?:simulation|game|scene|play)\s+(?:starts|begins)|when\s+i\s+press\s+play|on\s+play|all\s*(?:inizio|avvio)|alla\s+partenza|quando\s+(?:parte|inizia|comincia|premo\s+play)(?:\s+(?:il\s+gioco|la\s+simulazione))?|appena\s+(?:parte|inizia)|all\s+partenza)\b/);
  if (m) return found('start', { shape: shapeFilterIn(t) }, null, m);

  m = t.match(/\b(?:no\s+(?:more\s+)?balls?(?:\s+(?:are\s+)?left)?|all\s+(?:the\s+)?balls\s+(?:are\s+)?(?:gone|removed|destroyed|dead|off\s*screen)|non\s+(?:ci\s+sono|c\s+e)\s+piu\s+(?:nessuna\s+)?pallin[ae]|nessuna\s+pallina|tutte\s+le\s+palline\s+(?:sono\s+)?(?:sparite|scomparse|finite|uscite|morte)|finiscono\s+le\s+palline|non\s+restano\s+palline|zero\s+palline)\b/);
  if (m) return found('empty', {}, null, m);

  m = t.match(/\b(?:when|if|once|as\s+soon\s+as)\s+(?:there\s+are|we\s+have|it\s+reaches|balls\s+reach|reaching)\s+(\d+)\s+balls?\b|\b(?:quando|se|appena)\s+(?:ci\s+sono|si\s+arriva\s+a|arriv\w*\s+a|raggiung\w*)\s+(\d+)\s+palline?\b|\b(\d+)\s+balls?\s+(?:are\s+)?on\s+screen\b|\bpalline\s+(?:arrivano|raggiungono)\s+(?:a\s+)?(\d+)\b/);
  if (m) return found('count', { count: +(m[1] || m[2] || m[3] || m[4]) }, null, m);

  m = t.match(/\b(?:escape[sd]?|exits?|leaves?|gets?\s+out|goes?\s+out|breaks?\s+(?:out|free))\s+(?:of\s+|from\s+)?(?:the\s+|a\s+|1\s+)?(?:circles?|rings?)\b|\b(?:esce|escono|scappa|scappano|fugge|fuggono|evade|sfugge|scappa\s+fuori)\s+(?:fuori\s+)?(?:dal|dall|dalla|dai|dagli|da(?:\s+1)?)?\s*(?:cerchi(?:o)?|anell[oi])\b/);
  if (m) return found('escape', {}, null, m);

  m = t.match(/\b(?:(?:falls?|drops?|leaves?|exits?|goes?|flies?|gets?)\s+(?:off|out)(?:\s+of)?(?:\s+the)?(?:\s+(?:screen|world|bounds|stage|scene))?|(?:leaves?|exits?)\s+(?:the\s+)?(?:screen|world|stage|scene)|off[\s-]?screen|out\s+of\s+(?:the\s+)?(?:screen|bounds|world)|(?:esce|escono|cade|cadono|finisce|finiscono|vola|volano|va|vanno)\s+(?:fuori\s+)?(?:dallo|dal|dalla|dello)\s+(?:schermo|mondo|scena)|fuori\s+(?:dallo\s+|dal\s+)?schermo|(?:esce|escono)\s+fuori|cade\s+(?:giu|di\s+sotto))\b/);
  if (m) return found('offscreen', {}, null, m);

  m = t.match(/\b(?:(?:when|whenever|each\s+time|every\s+time)\s+(?:a\s+|the\s+)?(?:new\s+)?balls?\s+(?:is\s+|are\s+)?(?:spawn(?:s|ed)?|created|born|appears?|added|placed|dropped)|balls?\s+(?:is\s+|are\s+)?(?:spawned|created|born)|on\s+spawn|(?:quando|appena|ogni\s+volta\s+che)\s+(?:nasce|appare|compare|viene\s+creata|viene\s+aggiunta|spunta)\s+(?:1\s+|la\s+)?(?:nuova\s+)?pallina|(?:la\s+|1\s+)?(?:nuova\s+)?pallina\s+(?:nasce|appare|compare|viene\s+creata|viene\s+aggiunta|spunta))\b/);
  if (m) return found('spawn', { source: 'any' }, null, m);

  m = t.match(/\b(?:balls?\s+(?:hits?|touch(?:es)?|collides?\s+with|bumps?\s+into|meets?|crash(?:es)?\s+into)\s+(?:another|an?\s+other|other|a\s+second|each\s+other)(?:\s+balls?)?|balls?\s+collide|2\s+balls\s+(?:collide|touch|meet|hit)|ball[\s-]to[\s-]ball|(?:pallina|palla)\s+(?:colpisce|tocca|urta|sbatte\s+contro|si\s+scontra\s+con|incontra)\s+(?:1\s+altra|altre|altra)(?:\s+pallin[ae])?|palline\s+si\s+(?:scontrano|toccano|urtano|incontrano|colpiscono)|2\s+palline\s+si\s+\w+)\b/);
  if (m) return found('hit_ball', {}, null, m);

  m = t.match(HIT_VERB);
  if (m) {
    const at = m.index + m[0].length;
    const after = t.slice(at, at + 40);
    const wall = after.match(/^\s*(?:(?:on|onto|against|the|a|il|la|lo|l|un|1|sul|sulla|sui|contro|al|alla|il|del)\s+)*\b(left\s+wall|right\s+wall|walls?|sides?|edges?|borders?|floor|ground|bottom|ceiling|roof|parete\s+sinistra|parete\s+destra|muro|muri|parete|pareti|bordo|bordi|lato|lati|pavimento|terra|fondo|soffitto|tetto)\b/);
    if (wall) {
      const w = wall[1];
      const side = /floor|ground|bottom|pavimento|terra|fondo/.test(w) ? 'floor' : /ceiling|roof|soffitto|tetto/.test(w) ? 'ceiling'
        : /left|sinistra/.test(w) ? 'left' : /right|destra/.test(w) ? 'right' : 'any';
      return { trigger: newTrigger('hit_wall', { side }), rest: t.slice(0, m.index) + ' , ' + t.slice(at + wall[0].length) };
    }
    const shp = after.match(new RegExp(`^\\s*(?:(?:on|onto|against|into|with|the|a|an|any|il|la|lo|l|un|1|uno|una|sul|sulla|sui|sugli|contro|al|alla|ai|con|qualsiasi|qualunque)\\s+)*(${SHAPE_RE.source.slice(2, -2)})\\b`));
    if (shp) {
      return {
        trigger: newTrigger('hit_shape', { shape: shapeKindOf(shp[1]) || 'any' }),
        rest: t.slice(0, m.index) + ' , ' + t.slice(at + shp[0].length),
      };
    }
    // Passive form: "when the circle is hit".
    const before = t.slice(Math.max(0, m.index - 30), m.index).match(SHAPE_RE);
    return {
      trigger: newTrigger('hit_shape', { shape: before ? shapeKindOf(before[0]) || 'any' : 'any' }),
      rest: t.slice(0, m.index) + ' , ' + t.slice(at),
    };
  }
  return { trigger: null, rest: t };
}

function shapeFilterIn(t) {
  const m = t.match(SHAPE_RE);
  return m ? shapeKindOf(m[0]) || 'any' : 'any';
}

// ─── ACTIONS ───
// Each entry: regex + subject ('ball' | 'shape' | 'any' | 'world') + builder.
// Entries earlier in the list win when matches overlap.
const X = (re, subj, make) => ({ re, subj, make });

const ENTRIES = [
  X(/\b(?:(?:remove|delete|clear|destroy|kill|pop)\s+(?:all|every)\s+(?:the\s+)?balls?|all\s+(?:the\s+)?balls\s+(?:disappear|vanish|explode|are\s+removed|die|pop)|(?:elimina|rimuovi|cancella|distruggi|togli)\s+tutte\s+le\s+palline|tutte\s+le\s+palline\s+(?:spariscono|scompaiono|esplodono|vengono\s+eliminate|muoiono)|clear\s+the\s+(?:screen|balls)|svuota\s+(?:lo\s+schermo|tutto))\b/,
    'world', () => ['world.clear', {}]),
  X(/\b(?:pause[sd]?|stop\s+the\s+(?:game|simulation)|game\s+over|end\s+the\s+game|the\s+game\s+(?:stops|ends)|freeze\s+everything|metti\s+in\s+pausa|va\s+in\s+pausa|(?:il\s+)?gioco\s+(?:si\s+ferma|finisce)|pausa|ferma\s+(?:il\s+gioco|la\s+simulazione|tutto)|fine\s+(?:del\s+)?gioco)\b/,
    'world', () => ['world.pause', {}]),
  X(/^.*\bgravit(?:y|a)\b.*$/, 'world', (m, s) => { // the whole clause is about gravity
    let mode = 'flip';
    const p = {};
    if (/\b(?:reset|normal|ripristin\w*|torna\s+normale|normale)\b/.test(s)) mode = 'reset';
    else if (/\b(?:random|casual\w*|a\s+caso)\b/.test(s)) mode = 'random';
    else if (/\b(?:zero|off|none|disappears?|vanish\w*|turns?\s+off|spegne|si\s+spegne|scompare|sparisce|nulla|annulla|disattiva|toglie|0)\b/.test(s)) mode = 'zero';
    else if (/\b(?:flip\w*|revers\w*|invert\w*|upside|opposite|invert[ei]|capovolg\w*|ribalt\w*|al\s+contrario|sottosopra|cambia\s+verso)\b/.test(s)) mode = 'flip';
    else if (/\b(?:rotat\w*|turns?|spins?|ruota|gira)\b/.test(s)) { mode = 'rotate'; p.degrees = degIn(s, 90); }
    else if (/\b(?:left|right|sideways|sinistra|destra|di\s+lato|lateral\w*)\b/.test(s)) { mode = 'set'; p.angle = /left|sinistra/.test(s) ? 180 : 0; p.strength = 1.2; }
    else if (/\b(?:stronger|increases?|more|heavier|higher|double|aumenta|piu\s+forte|raddoppia|cresce|maggiore)\b/.test(s)) { mode = 'stronger'; p.amount = /double|raddoppia/.test(s) ? 1.2 : 0.3; }
    else if (/\b(?:weaker|decreases?|less|lighter|lower|half|diminuisce|piu\s+debole|meno|dimezza|cala|si\s+riduce|riduce)\b/.test(s)) { mode = 'weaker'; p.amount = 0.3; }
    else if (/\b(?:up|upward|su|verso\s+l\s*alto|in\s+alto)\b/.test(s)) { mode = 'set'; p.angle = 270; p.strength = 1.2; }
    else if (/\b(?:down|downward|giu|verso\s+il\s+basso)\b/.test(s)) { mode = 'set'; p.angle = 90; p.strength = 1.2; }
    else if (/(?:\bto\b|\ba\b|=)\s*(\d+(?:\.\d+)?)/.test(s)) { mode = 'set'; p.strength = +s.match(/(?:\bto\b|\ba\b|=)\s*(\d+(?:\.\d+)?)/)[1]; p.angle = 90; }
    return ['world.gravity', { mode, ...p }];
  }),
  X(/\b(?:slow[\s-]?(?:motion|mo)|bullet\s+time|time\s+(?:slows(?:\s+down)?|stops)|slow\s+down\s+time|rallentatore|(?:il\s+)?tempo\s+(?:rallenta|si\s+ferma)|rallenta\s+il\s+tempo|time\s+speeds\s+up|speed\s+up\s+time|tempo\s+accelera|accelera\s+il\s+tempo|fast\s+forward)\b/,
    'world', (m, s) => {
      const fast = /speeds\s+up|speed\s+up\s+time|accelera|fast\s+forward/.test(m[0]);
      const x = s.match(/(\d+(?:\.\d+)?)\s*x\b/);
      return ['world.time', { scale: x ? +x[1] : fast ? 2 : 0.3, duration: secondsIn(s, 2) }];
    }),
  X(/\b(?:floor|ground|pavimento|terra|ceiling|roof|soffitto|tetto|(?:side\s+)?walls|pareti|muri|borders|bordi|left\s+wall|right\s+wall|parete\s+sinistra|parete\s+destra)\b[^,]*?\b(?:disappears?|vanish\w*|opens?|is\s+removed|breaks|goes\s+away|scompare|sparisce|spariscono|si\s+apre|si\s+aprono|crolla|appears?|closes?|returns?|comes\s+back|compare|appare|si\s+chiude|si\s+chiudono|torna|tornano|toggles?|switch\w*|alterna)\b/,
    'world', (m) => {
      const s = m[0];
      const which = /left\s+wall|parete\s+sinistra/.test(s) ? 'left' : /right\s+wall|parete\s+destra/.test(s) ? 'right'
        : /floor|ground|pavimento|terra/.test(s) ? 'floor' : /ceiling|roof|soffitto|tetto/.test(s) ? 'ceiling'
          : /borders|bordi/.test(s) ? 'all' : 'walls';
      const state = /\b(?:toggles?|switch\w*|alterna)\b/.test(s) ? 'toggle'
        : /\b(?:appears?|closes?|returns?|comes\s+back|compare|appare|si\s+chiud\w*|torna\w*)\b/.test(s) ? 'on' : 'off';
      return ['world.bounds', { which, state }];
    }),
  X(/\b(?:(?:makes?|diventa|diventano|becomes?)\s+(\d+)\s+(?:balls|palline)|clon\w*|duplicat\w*|copies|multipl\w*|split\w*\s+in(?:to)?\s+2|makes?\s+(?:a\s+)?cop(?:y|ies)|si\s+duplica|si\s+duplicano|si\s+clona|si\s+moltiplica|si\s+sdoppia|x2)\b/,
    'ball', (m, s) => {
      const n = m[1] ? Math.max(1, +m[1] - 1) : numIn(s.replace(/\bx2\b/, ''), 1);
      return ['ball.clone', { count: Math.min(10, n) }];
    }),
  X(/\b(?:spawn|spawns|create|creates|add|adds|drop|drops|release|releases|generate|generates|make|makes|launch|launches|rain|rains|shoot|shoots|fire|fires|emit|emits)\s+(?:a\s+|an\s+|another\s+|(\d+)\s+)?(?:new\s+|more\s+|extra\s+)?balls?\b|\b(?:genera|generano|crea|creano|aggiungi|aggiunge|lancia|lanciano|fai\s+cadere|fa\s+cadere|spawna|piove|piovono|sgancia)\s+(?:(\d+)\s+|nuove\s+|altre\s+|altra\s+)?(?:nuov[ae]\s+)?(?:palline|pallina|palle|palla)\b|\b(?:(\d+)\s+)?(?:new|another|more|extra)\s+balls?\s+(?:appears?|spawns?|drops?|falls?|comes?|arrives?|is\s+created|are\s+created)\b|\b(?:nasce|nascono|appare|appaiono|compare|compaiono|spunta|spuntano|arriva|arrivano)\s+(?:(\d+)\s+)?(?:nuov[ae]\s+|altr[ae]\s+)?(?:palline|pallina)\b|\b(?:(\d+)\s+)?(?:nuov[ae]|altr[ae])\s+(?:palline|pallina)\s+(?:appaiono|appare|nascono|nasce|cadono|cade|arrivano|arriva|compaiono|compare|spuntano|spunta)\b/,
    'world', (m, s, ctx) => {
      const n = +(m[1] || m[2] || m[3] || m[4] || m[5] || 1);
      const p = { count: Math.min(30, n), where: whereIn(s, ctx.ballTrigger ? 'here' : 'top') };
      const sp = s.match(/\b(?:speed|velocita)\s+(\d+)/);
      if (sp) p.speed = +sp[1];
      return ['world.spawn', p];
    }),
  X(/\b(?:particles?|sparks?|sparkles?|confetti|fireworks?|stars?|glitter|scintill\w*|particell\w*|coriandoli|fuochi(?:\s+d\s*artificio)?|stelle|stelline|brillantini)\b/,
    'world', (m, s) => {
      const w = m[0];
      const style = /confetti|coriandoli/.test(w) ? 'confetti' : /firework|fuochi/.test(w) ? 'firework' : /star|stell/.test(w) ? 'stars' : 'sparks';
      const amount = /\b(?:lots|many|tons|huge|big|tant\w*|molt\w*|grande|enorme)\b/.test(s) ? 80 : numIn(s, 30);
      return ['fx.burst', { style, amount }];
    }),
  X(/\b(?:shakes?|shaking|screen\s+shake|trembles?|quake|earthquake|trema|tremano|tremare|scuote|vibra|vibrazione|terremoto|scossa)\b/,
    'world', (m, s) => ['fx.shake', { power: /strong|big|hard|forte|grande|violent/.test(s) ? 16 : /light|small|little|leggera|piccola|poco/.test(s) ? 4 : numIn(s, 8) }]),
  X(/\b(?:flash(?:es)?|blinks?|lampeggi\w*|lampo|bagliore)\b/, 'world', (m, s) => {
    const c = colorIn(s);
    return ['fx.flash', c === 'white' ? { color: 'white' } : c != null ? { color: 'set', hue: c } : { color: 'ball' }];
  }),
  X(/\b(?:shock\s*wave|shockwave|ripple|onda(?:\s+d\s*urto)?)\b/, 'world', (m, s) => ['fx.wave', { size: numIn(s, 90) }]),
  X(/\b(?:shows?|displays?|writes?|prints?|says?|text|mostra|mostrano|scrive|scrivi|dice|scritta|testo)\b[^,]*?__q(\d)__/, 'world',
    (m, s, ctx) => ['fx.text', { text: ctx.quotes[+m[1]] || '+1' }]),
  X(/\b(?:plays?|makes?|emits?|suona|suonano|emette|riproduce)\s+(?:a\s+|the\s+|1\s+|la\s+|il\s+)?(?:(random|next|high|low|higher|lower|casuale|prossima|successiva|alta|bassa|acuta|grave)\s+)?(?:note|sound|nota|suono)\b/,
    'world', m => {
      const w = m[1] || '';
      const which = /next|prossima|successiva/.test(w) ? 'next' : /high|alta|acuta/.test(w) ? 'high' : /low|bassa|grave/.test(w) ? 'low' : 'random';
      return ['sound.note', { which }];
    }),
  X(/\b(?:(?:higher|high|raise[sd]?|sharper)\s+(?:note|pitch|tone)|pitch\s+(?:goes\s+)?up|note\s+(?:goes\s+up|rises)|(?:nota|tono|suono)\s+(?:piu\s+)?(?:alt[ao]|acut[ao])|piu\s+acut\w*|alza\s+(?:la\s+)?nota|nota\s+sale)\b/,
    'ball', (m, s) => ['ball.note', { dir: 'up', steps: numIn(s, 1) }]),
  X(/\b(?:(?:lower|low|deeper|deep)\s+(?:note|pitch|tone)|pitch\s+(?:goes\s+)?down|note\s+(?:goes\s+down|drops)|bass|(?:nota|tono|suono)\s+(?:piu\s+)?(?:bass[ao]|grave)|piu\s+grave|abbassa\s+(?:la\s+)?nota|nota\s+scende)\b/,
    'ball', (m, s) => ['ball.note', { dir: 'down', steps: numIn(s, 1) }]),
  X(/\b(?:(?:opens?|widens?|grows?|closes?|narrows?|shrinks?|si\s+apre|si\s+allarga|si\s+chiude|si\s+restringe|allarga|apre|chiude|restringe)\s+(?:a\s+|an\s+|the\s+|its\s+|il\s+|un\s+|1\s+|la\s+|lo\s+)?)?(?:gap|opening|hole|varco|buco|apertura|passaggio|fessura)(?:\s+(?:opens?|widens?|grows?|gets\s+(?:bigger|wider|smaller|narrower)|closes?|narrows?|shrinks?|si\s+apre|si\s+allarga|si\s+chiude|si\s+restringe|cresce|diminuisce|aumenta))?\b/, 'shape', (m, s) => {
    const mode = /\b(?:clos\w*|shut\w*|chiud\w*|chius\w*)\b/.test(s) ? 'close'
      : /\b(?:narrow\w*|smaller|shrinks?|restring\w*|stringe|piu\s+piccol\w*|riduc\w*)\b/.test(s) ? 'narrow'
        : /\bopens?\s+to\b|\bapre\s+a\b/.test(s) ? 'open' : 'widen';
    return ['shape.gap', { mode, degrees: degIn(s, numIn(s, mode === 'open' ? 40 : 20)) }];
  }),
  X(/\b(?:respawn\w*|re-?spawn\w*|comes?\s+back|reappears?|returns?\s+to\s+(?:the\s+)?start|riappare|riappaiono|rinasce|rinascono|ricompare|ricompaiono|torna\s+(?:all\s*inizio|al\s+punto\s+di\s+partenza)|rispunta|resuscita)(?:\s+(?:but\s+|ma\s+)?(?:(\d+)\s*%\s+)?(bigger|larger|smaller|piu\s+grand[ei]|piu\s+piccol\w*|grand[ei]|piccol\w*))?\b/,
    'ball', (m, s) => {
      const size = m[2] || '';
      const k = m[1] ? +m[1] : 25;
      const grow = /bigger|larger|grand/.test(size) ? k : /smaller|piccol/.test(size) ? -k : 0;
      return ['ball.respawn', { where: whereIn(s, 'spawn') === 'here' ? 'spawn' : whereIn(s, 'spawn'), grow }];
    }),
  X(/\b(?:teleport\w*|teletrasport\w*|warps?|jumps?\s+to\s+(?:a\s+)?random\s+(?:spot|place)|appare\s+altrove|salta\s+altrove)\b/,
    'ball', (m, s) => ['ball.teleport', { where: whereIn(s, 'random') === 'here' ? 'random' : whereIn(s, 'random') }]),
  X(/\b(?:explodes?|explode|bursts?|shatters?|splits?(?:\s+in(?:to)?\s+\d+)?|breaks?(?:\s+(?:into|in)\s+\d+)?|breaks?\s+apart|crumbles?|esplod\w*|scoppi\w*|si\s+frantuma\w*|si\s+divide\w*|si\s+spacca\w*|va\s+in\s+(?:mille\s+)?pezzi|si\s+rompe|si\s+rompono|si\s+spezza\w*|crolla|si\s+sbriciola)\b/,
    'any', (m, s, ctx) => {
      if (ctx.subject === 'shape') return ['shape.break', {}];
      const n = s.match(/\b(?:into|in)\s+(\d+)\b/) || s.match(/\b(\d+)\s+(?:pieces|balls|pezzi|palline|parti)\b/);
      return ['ball.explode', { count: n ? +n[1] : 4 }];
    }),
  X(/\b(?:disappears?|vanish(?:es)?|is\s+removed|gets\s+removed|dies|is\s+destroyed|gets\s+destroyed|destroyed|deleted?|pops?|scompar\w*|sparisc\w*|svanisc\w*|viene\s+(?:rimoss|eliminat|distrutt)\w*|muore|muoiono|si\s+distrugge|eliminat\w*)\b/,
    'any', (m, s, ctx) => (ctx.subject === 'shape' ? ['shape.break', {}] : ['ball.remove', {}])),
  X(/\b(?:(?:stops?|smette\w*\s+di|non)\s+(?:spinning|rotating|girare|ruotare|gira)|spins?|spinning|rotates?|rotating|rotation|turns?\s+around|revolves?|twirls?|gira|girano|girare|ruota|ruotano|ruotare|rotazione|rotea|roteano)\b/,
    'shape', (m, s) => {
      const p = {};
      let mode = 'cw';
      if (/\b(?:stops?|smette|si\s+ferma|non\s+gira|ferma)\b/.test(s)) mode = 'stop';
      else if (/\b(?:revers\w*|invert\w*|opposite|other\s+way|inverte|contrario|opposto|cambia\s+(?:senso|direzione|verso))\b/.test(s)) mode = 'reverse';
      else if (/\b(?:faster|quicker|piu\s+veloce|accelera\w*|velocizz\w*)\b/.test(s)) { mode = 'faster'; p.percent = pctIn(s, 25); }
      else if (/\b(?:slower|piu\s+lent\w*|rallent\w*)\b/.test(s)) { mode = 'slower'; p.percent = pctIn(s, 25); }
      else if (/\b(?:counter\w*|anti\w*|left|ccw|antiorari\w*|sinistra)\b/.test(s)) mode = 'ccw';
      if (mode === 'cw' || mode === 'ccw') {
        p.speed = degIn(s, /\b(?:fast|quick\w*|veloce\w*|rapid\w*)\b/.test(s) ? 180 : /\b(?:slow\w*|lent\w*|piano)\b/.test(s) ? 30 : 90);
      }
      return ['shape.spin', { mode, ...p }];
    }),
  X(/\b(?:chang\w*\s+(?:its\s+|the\s+|their\s+)?colou?rs?|colou?rs?\s+changes?|new\s+colou?r|random\s+colou?r|(?:turns?|becomes?|goes|gets|are|is|_is_|be)\s+(?:colou?red\s+)?(?:red|orange|yellow|lime|green|cyan|blue|purple|violet|pink|magenta|white|gold)|rainbow|cambi\w*\s+(?:di\s+|il\s+)?colore|colore\s+(?:casuale|diverso|nuovo)|(?:diventa|diventano|sono|_is_|si\s+colora\w*(?:\s+di)?|colorat\w*\s+di)\s+(?:ross\w*|arancion\w*|arancio|giall\w*|verd\w*|azzurr\w*|cian\w*|blu|viola|rosa|fucsia|magenta|bianc\w*|oro)|arcobaleno|takes?\s+the\s+ball\s*s?\s+colou?r|prende\s+il\s+colore|stesso\s+colore|same\s+colou?r|colou?red|si\s+colora\w*)\b/,
    'any', (m, s, ctx) => {
      const c = colorIn(s);
      if (ctx.subject === 'shape') {
        if (/ball\s*s?\s+colou?r|colore\s+della\s+pallina|stesso\s+colore|same\s+colou?r|prende\s+il\s+colore/.test(s)) return ['shape.color', { mode: 'ball' }];
        if (c === 'white') return ['shape.color', { mode: 'white' }];
        if (c != null) return ['shape.color', { mode: 'set', hue: c }];
        return ['shape.color', { mode: /rainbow|arcobaleno|next|prossim/.test(s) ? 'next' : 'random' }];
      }
      if (/rainbow|arcobaleno/.test(s)) return ['ball.color', { mode: 'rainbow' }];
      if (c != null && c !== 'white') return ['ball.color', { mode: 'set', hue: c }];
      return ['ball.color', { mode: 'random' }];
    }),
  X(/\b(?:doubles?\s+(?:in\s+)?size|grows?|growing|expands?|enlarges?|swells?|inflates?|(?:gets?|becomes?)\s+(?:bigger|larger|huge)|bigger|larger|scales?\s+up|cresc\w*|ingrand\w*|si\s+gonfia\w*|(?:diventa|diventano)\s+(?:piu\s+)?(?:grand[ei]|gross[oaie]|enorm[ei])|piu\s+grand[ei]|aumenta\w*\s+(?:di\s+)?(?:dimensioni|dimensione|grandezza)|raddoppia\s+(?:di\s+)?dimensione)\b/,
    'any', (m, s, ctx) => [ctx.subject === 'shape' ? 'shape.grow' : 'ball.grow', { percent: pctIn(s, 10) }]),
  X(/\b(?:shrinks?|shrinking|(?:gets?|becomes?)\s+(?:smaller|tiny)|smaller|scales?\s+down|rimpicciol\w*|restring\w*|si\s+stringe|(?:diventa|diventano)\s+(?:piu\s+)?(?:piccol\w*|minuscol\w*)|piu\s+piccol\w*|si\s+riduc\w*|diminuisc\w*\s+(?:di\s+)?dimension\w*)\b/,
    'any', (m, s, ctx) => [ctx.subject === 'shape' ? 'shape.shrink' : 'ball.shrink', { percent: pctIn(s, 10) }]),
  X(/\b(?:bounc\w*\s+(?:higher|more|harder|stronger)|more\s+bouncy|bouncier|super\s*bounc\w*|rimbalz\w*\s+(?:di\s+)?piu|piu\s+rimbalzant\w*|bounc\w*\s+less|less\s+bouncy|rimbalz\w*\s+meno|meno\s+rimbalzant\w*)\b/,
    'ball', m => ['ball.bounce', { mode: /less|meno/.test(m[0]) ? 'less' : 'more', value: 0.15 }]),
  X(/\b(?:speeds?\s+up|accelerat\w*|goes?\s+faster|faster|quicker|velocizz\w*|accelera\w*|piu\s+veloce|va\s+piu\s+veloce|aumenta\s+(?:la\s+)?velocita|sfreccia)\b/,
    'any', (m, s, ctx) => (ctx.subject === 'shape' ? ['shape.spin', { mode: 'faster', percent: pctIn(s, 25) }] : ['ball.faster', { percent: pctIn(s, 20) }])),
  X(/\b(?:slows?\s+down|slower|decelerat\w*|rallent\w*|piu\s+lent\w*|diminuisce\s+(?:la\s+)?velocita|frena)\b/,
    'any', (m, s, ctx) => (ctx.subject === 'shape' ? ['shape.spin', { mode: 'slower', percent: pctIn(s, 25) }] : ['ball.slower', { percent: pctIn(s, 30) }])),
  X(/\b(?:revers\w*|goes?\s+back(?:wards)?|bounces?\s+back|opposite\s+direction|turns?\s+back|invert\w*(?:\s+(?:la\s+)?direzione)?|torna\s+indietro|direzione\s+opposta|cambia\s+direzione)\b/,
    'any', (m, s, ctx) => (ctx.subject === 'shape' ? ['shape.spin', { mode: 'reverse' }] : ['ball.reverse', {}])),
  X(/\b(?:jumps?|leaps?|launch(?:es|ed)?|shoots?\s+(?:up|off)|flies?\s+(?:up|away)|boost\w*|kicks?|is\s+thrown|gets\s+thrown|springs?|salta|saltano|balza|balzano|schizza|schizzano|viene\s+lanciat\w*|lanciat\w*|vola\s+via|scatta)\b/,
    'ball', (m, s) => ['ball.launch', { dir: dirIn(s, 'up'), power: numIn(s, 12) }]),
  X(/\b(?:stops?|freezes?|stands?\s+still|halts?|si\s+ferma|si\s+fermano|si\s+blocca|si\s+bloccano|si\s+congela|resta\s+ferm\w*|immobil\w*)\b/,
    'any', (m, s, ctx) => (ctx.subject === 'shape' ? ['shape.spin', { mode: 'stop' }] : ['ball.stop', {}])),
  X(/\b(?:trails?|tail|scia|scie|coda\s+luminosa)\b/, 'ball',
    (m, s) => ['ball.trail', { on: !/\b(?:no|without|loses?|removes?|senza|perde|toglie|niente)\b/.test(s) }]),
  X(/\b(?:strings?|threads?|string\s+art|draws?\s+lines?|connect\w*\s+lines?|fili|filo|disegna\s+(?:le\s+|delle\s+)?line\w*|collega\w*|ragnatela|web)\b/,
    'ball', () => ['ball.strings', {}]),
];

const SPLIT_RE = /\s*(?:,|\.(?!\d)|\band\s+then\b|\bthen\b|\band\b|\balso\b|\bplus\b|\be\s+poi\b|\bpoi\b|\binoltre\b|\ballora\b|\bed\b|\be\b|\bquindi\b|\bdopodiche\b|\bwhile\b|\bmentre\b)\s*/;

function subjectIn(clause) {
  const sm = clause.match(SHAPE_RE), bm = clause.match(BALL_RE);
  if (sm && (!bm || sm.index < bm.index)) return { subject: 'shape', kind: shapeKindOf(sm[0]) || 'any' };
  if (bm) return { subject: 'ball' };
  return null;
}

function extractActions(text, ctx) {
  const actions = [];
  let subject = ctx.defaultSubject;
  let shapeKind = null;
  for (const raw of text.split(SPLIT_RE)) {
    const clause = raw.trim();
    if (!clause) continue;
    const sub = subjectIn(clause);
    if (sub) { subject = sub.subject; if (sub.kind) shapeKind = sub.kind; }
    const taken = [];
    const hits = [];
    for (const e of ENTRIES) {
      const re = new RegExp(e.re.source, 'g');
      let m;
      while ((m = re.exec(clause))) {
        const a = m.index, b = m.index + m[0].length;
        if (b === a) { re.lastIndex++; continue; }
        if (taken.some(([x, y]) => a < y && b > x)) continue;
        taken.push([a, b]);
        hits.push({ at: a, e, m });
      }
    }
    hits.sort((p, q) => p.at - q.at);
    const seen = new Set();
    for (const h of hits) {
      const out = h.e.make(h.m, clause, { ...ctx, subject });
      if (!out || seen.has(out[0])) continue; // "spins faster" → one spin action
      seen.add(out[0]);
      const act = newAction(out[0], out[1]);
      if (act) actions.push(act);
    }
  }
  return { actions, shapeKind };
}

// ─── PUBLIC ───
// Returns { status: 'ok' | 'partial' | 'fail', rule, message }.
export function parseRule(input) {
  const original = String(input || '').trim();
  if (!original) return { status: 'fail', rule: null, message: 'Type a rule first.' };
  const quotes = [];
  const withPlaceholders = original.replace(/["“”«»]([^"“”«»]{1,40})["“”«»]/g, (_, q) => { quotes.push(q); return ` __q${quotes.length - 1}__ `; });

  let t = normalize(withPlaceholders);
  const c = extractConditions(t);
  t = c.t;
  const det = detectTrigger(t);
  let trigger = det.trigger;
  const ballTrigger = trigger && ['hit_shape', 'hit_wall', 'hit_ball', 'escape', 'offscreen', 'spawn'].includes(trigger.type);
  const { actions, shapeKind } = extractActions(det.rest, {
    quotes, ballTrigger, defaultSubject: 'ball',
  });

  if (!trigger && !actions.length) {
    return {
      status: 'fail', rule: null,
      message: 'Sorry, I could not understand that. Try: "when the ball hits a circle it grows 10%" or "ogni 2 secondi genera una pallina in alto".',
    };
  }

  let note = '';
  if (!trigger) {
    // No WHEN in the sentence: pick the most likely one.
    const STATE = ['ball.trail', 'ball.strings', 'ball.color', 'ball.note', 'ball.bounce'];
    if (c.hitHint) {
      trigger = newTrigger('hit_shape', { shape: 'any' });
    } else if (actions.some(a => a.type.startsWith('shape.'))) {
      trigger = newTrigger('start', { shape: shapeKind || 'any' });
      note = 'Runs when the simulation starts.';
    } else if (actions.every(a => STATE.includes(a.type))) {
      trigger = newTrigger('spawn', { source: 'any' });
      note = 'Applies to every new ball.';
    } else if (actions.every(a => a.type.startsWith('ball.'))) {
      trigger = newTrigger('hit_shape', { shape: 'any' });
      note = 'Runs whenever a ball hits a shape.';
    } else {
      trigger = newTrigger('start', { shape: 'any' });
      note = 'Runs when the simulation starts.';
    }
  }

  const rule = normalizeRule({ text: original, trigger, cond: c.cond, actions });
  if (!rule.actions.length) {
    return {
      status: 'partial', rule,
      message: `I understood WHEN (“${summarize(rule).split(' → ')[0].replace(/^When /, '')}”) but not what should happen — pick an action in the card.`,
    };
  }
  return { status: 'ok', rule, message: note };
}
