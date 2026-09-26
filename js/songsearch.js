/* ========== Bouncical — songsearch.js ========== */
/* Find a song from a link (Spotify, YouTube, Apple Music, Deezer) or a name
   and return official 30-second previews from Apple (iTunes Search API) and
   Deezer. Spotify and YouTube never hand out audio, so their links are only
   used to learn the title and artist.
   Without a server, Apple and Deezer are queried with JSONP. With the
   optional song service (worker/song-proxy.js) every call goes through it,
   which also makes Spotify links and recordable previews reliable. */

import { SONG_SERVICE_URL } from './config.js';

const SERVICE = SONG_SERVICE_URL.replace(/\/+$/, '');
export const hasService = () => !!SERVICE;
const LIMIT = 8;
const enc = encodeURIComponent;

export class SongSearchError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MESSAGES = {
  empty: 'Type a song name or paste a link.',
  'spotify-not-track': 'Paste a link to a single Spotify song, not an album or playlist.',
  'youtube-not-video': 'Paste a link to a single YouTube video.',
  'apple-not-song': 'Paste a link to a single Apple Music song.',
  'deezer-not-track': 'Paste a link to a single Deezer track.',
  'unknown-site': 'Links from this site aren’t supported. Use Spotify, YouTube, Apple Music or Deezer, or type the song name.',
  short: 'Short share links need the song service. Open the link and paste the full address, or type the song name.',
  spotify: 'Couldn’t read this Spotify link. Type the song name instead.',
  youtube: 'Couldn’t read this YouTube link. Type the song name instead.',
  notfound: 'No songs found. Try another spelling or add the artist.',
  offline: 'Song search isn’t reachable right now. Check your connection and try again.',
};
const fail = code => new SongSearchError(code, MESSAGES[code]);

// ─── INPUT PARSING ───
const URL_RE = /((?:https?:\/\/|spotify:)[^\s<>"']+)/i;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

// Returns { kind, id?, url?, query?, service?, reason? }.
export function parseInput(raw) {
  const text = String(raw || '').trim();
  if (!text) return { kind: 'empty' };
  const m = text.match(URL_RE);
  if (!m) return { kind: 'query', query: text };
  const link = m[1].replace(/[),.;!?]+$/, '');

  if (/^spotify:/i.test(link)) {
    const s = link.match(/^spotify:track:([A-Za-z0-9]{22})$/i);
    return s ? spotify(s[1]) : { kind: 'unsupported', reason: 'spotify-not-track' };
  }
  let u;
  try { u = new URL(link); } catch (_) { return { kind: 'query', query: text }; }
  const host = u.hostname.toLowerCase().replace(/^(?:www|m)\./, '');
  const path = u.pathname;

  if (host === 'open.spotify.com' || host === 'play.spotify.com') {
    const s = path.match(/\/track\/([A-Za-z0-9]{22})(?:\/|$)/);
    return s ? spotify(s[1]) : { kind: 'unsupported', reason: 'spotify-not-track' };
  }
  if (host === 'spotify.link' || host === 'spotify.app.link') return { kind: 'short', service: 'spotify', url: link };

  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    let id = u.searchParams.get('v');
    if (!id) {
      const p = path.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
      if (p) id = p[1];
    }
    return id && YT_ID.test(id) ? youtube(id) : { kind: 'unsupported', reason: 'youtube-not-video' };
  }
  if (host === 'youtu.be') {
    const id = path.slice(1, 12);
    return YT_ID.test(id) ? youtube(id) : { kind: 'unsupported', reason: 'youtube-not-video' };
  }

  if (host === 'music.apple.com' || host === 'itunes.apple.com' || host === 'geo.music.apple.com') {
    const i = u.searchParams.get('i');
    if (i && /^\d+$/.test(i)) return { kind: 'apple', id: i, url: link };
    const song = path.match(/\/song\/(?:[^/]+\/)?(\d+)/);
    if (song) return { kind: 'apple', id: song[1], url: link };
    const album = path.match(/\/album\/(?:[^/]+\/)?(\d+)/);
    if (album) return { kind: 'apple-album', id: album[1], url: link };
    return { kind: 'unsupported', reason: 'apple-not-song' };
  }

  if (host === 'deezer.com') {
    const t = path.match(/\/track\/(\d+)/);
    return t ? { kind: 'deezer', id: t[1], url: `https://www.deezer.com/track/${t[1]}` } : { kind: 'unsupported', reason: 'deezer-not-track' };
  }
  if (host === 'deezer.page.link' || host === 'dzr.page.link' || host === 'link.deezer.com') return { kind: 'short', service: 'deezer', url: link };

  return { kind: 'unsupported', reason: 'unknown-site' };
}

const spotify = id => ({ kind: 'spotify', id, url: `https://open.spotify.com/track/${id}` });
const youtube = id => ({ kind: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` });

// ─── TEXT HELPERS ───
export function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP = new Set(['the', 'a', 'an', 'and', 'feat', 'ft', 'featuring', 'with', 'by', 'official', 'video', 'audio',
  'lyrics', 'lyric', 'il', 'la', 'lo', 'le', 'e', 'di', 'de', 'el', 'y']);
const tokens = s => normalizeText(s).split(' ').filter(t => t && !STOP.has(t));

// YouTube titles → a search query: "Artist - Song (Official Video) [4K]" → "Artist Song".
const NOISE = /\b(?:official|video|audio|lyrics?|visuali[sz]er|hd|hq|4k|remaster(?:ed)?|mv|m\/v|clip|testo|ufficiale|videoclip|live|explicit|extended|radio edit)\b/i;
export function cleanVideoTitle(title, author = '') {
  const original = String(title || '');
  let t = original.replace(/[([【［{][^)\]】］}]*[)\]】］}]/g, part => (NOISE.test(part) ? ' ' : part));
  t = t.replace(/\s*\|.*$/, ' ');
  t = t.replace(/\b(?:official\s+(?:music\s+)?video|official\s+audio|lyric\s+video|lyrics?|video\s+ufficiale)\b/gi, ' ');
  t = t.replace(/\s[-–—~:]\s/g, ' ').replace(/["“”«»]/g, ' ').replace(/\s+/g, ' ').trim();
  const channel = String(author || '').replace(/\s*-\s*topic$/i, '').replace(/vevo$/i, '').replace(/\bofficial\b/i, '').trim();
  const hasArtist = /\s[-–—]\s/.test(original);
  if (channel && !hasArtist && !normalizeText(t).includes(normalizeText(channel))) t = `${channel} ${t}`;
  return t || original.trim();
}

// ─── RESULTS ───
// Common shape: { key, source, title, artist, album, cover, preview, link, duration }
export function fromItunes(r) {
  if (!r || !r.trackName || (r.kind && r.kind !== 'song')) return null;
  return {
    key: `apple:${r.trackId}`, source: 'apple',
    title: r.trackName, artist: r.artistName || '', album: r.collectionName || '',
    cover: (r.artworkUrl100 || r.artworkUrl60 || '').replace(/\/\d+x\d+bb\./, '/200x200bb.'),
    preview: r.previewUrl || '', link: r.trackViewUrl || '',
    duration: (r.trackTimeMillis || 0) / 1000,
  };
}

export function fromDeezer(r) {
  if (!r || !r.title || (r.type && r.type !== 'track')) return null;
  const album = r.album || {}, artist = r.artist || {};
  return {
    key: `deezer:${r.id}`, source: 'deezer',
    title: r.title_short || r.title, artist: artist.name || '', album: album.title || '',
    cover: album.cover_medium || album.cover || '',
    preview: r.preview || '', link: r.link || `https://www.deezer.com/track/${r.id}`,
    duration: r.duration || 0,
  };
}

// Dedupe the same song across sources and rank by how well it matches.
export function rankResults(list, query) {
  const q = tokens(query);
  const best = new Map();
  list.forEach((r, i) => {
    if (!r) return;
    const have = new Set(tokens(`${r.artist} ${r.title} ${r.album}`));
    const match = q.length ? q.filter(t => have.has(t)).length / q.length : 0;
    const score = match * 2 + (r.preview ? 0.6 : 0) - i * 0.01;
    const k = `${normalizeText(r.artist)}|${normalizeText(r.title)}`;
    const prev = best.get(k);
    if (!prev || score > prev.score) best.set(k, { r, score });
  });
  return [...best.values()].sort((a, b) => b.score - a.score).map(x => x.r).slice(0, LIMIT);
}

// ─── TRANSPORT ───
const withParams = (url, params) => url + (url.includes('?') ? '&' : '?') + new URLSearchParams(params).toString();

let seq = 0;
export function jsonp(url, param = 'callback', timeout = 9000) {
  return new Promise((resolve, reject) => {
    const name = `__bouncicalJsonp${Date.now().toString(36)}${seq++}`;
    const script = document.createElement('script');
    let done = false;
    const finish = () => {
      done = true;
      clearTimeout(timer);
      delete window[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      if (done) return;
      finish();
      window[name] = () => {}; // a late answer must not throw
      reject(new Error('timeout'));
    }, timeout);
    window[name] = data => { if (!done) { finish(); resolve(data); } };
    script.onerror = () => { if (!done) { finish(); reject(new Error('network')); } };
    script.referrerPolicy = 'no-referrer';
    script.src = withParams(url, { [param]: name });
    document.head.appendChild(script);
  });
}

// JSON from a provider: through the song service when configured, else JSONP.
async function getJSON(upstream, jsonpParams = {}) {
  if (SERVICE) {
    const r = await fetch(`${SERVICE}/proxy?url=${enc(upstream)}`);
    if (!r.ok) throw new Error(`service ${r.status}`);
    return r.json();
  }
  return jsonp(Object.keys(jsonpParams).length ? withParams(upstream, jsonpParams) : upstream);
}

export function storeCountry() {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  const m = lang.match(/-([A-Za-z]{2})\b/);
  if (m) return m[1].toUpperCase();
  const byLang = { it: 'IT', de: 'DE', fr: 'FR', es: 'ES', pt: 'PT', nl: 'NL', ja: 'JP', en: 'US' };
  return byLang[lang.slice(0, 2).toLowerCase()] || 'US';
}

// ─── PROVIDERS ───
async function itunesSearch(q) {
  const d = await getJSON(`https://itunes.apple.com/search?term=${enc(q)}&media=music&entity=song&limit=${LIMIT}&country=${storeCountry()}`);
  return (d.results || []).map(fromItunes).filter(Boolean);
}

async function itunesLookup(id) {
  const d = await getJSON(`https://itunes.apple.com/lookup?id=${enc(id)}&entity=song&country=${storeCountry()}`);
  return (d.results || []).map(fromItunes).filter(Boolean);
}

async function deezerSearch(q) {
  const d = await getJSON(`https://api.deezer.com/search?q=${enc(q)}&limit=${LIMIT}`, { output: 'jsonp' });
  return (d.data || []).map(fromDeezer).filter(Boolean);
}

async function deezerTrack(id) {
  const d = await getJSON(`https://api.deezer.com/track/${enc(id)}`, { output: 'jsonp' });
  const r = d && !d.error ? fromDeezer(d) : null;
  return r ? [r] : [];
}

async function noembed(url) {
  const u = `https://noembed.com/embed?url=${enc(url)}`;
  try {
    const r = await fetch(u);
    if (r.ok) return await r.json();
  } catch (_) {}
  return jsonp(u);
}

async function spotifyMeta(p) {
  if (SERVICE) {
    const r = await fetch(`${SERVICE}/spotify?url=${enc(p.url)}`);
    const d = r.ok ? await r.json() : null;
    if (d && d.title) return { title: d.title, artist: d.artist || '' };
    throw fail('spotify');
  }
  const d = await noembed(p.url).catch(() => null);
  if (!d || d.error || !d.title) throw fail('spotify');
  return { title: d.title, artist: d.author_name || '' };
}

async function youtubeMeta(p) {
  const d = SERVICE
    ? await getJSON(`https://www.youtube.com/oembed?url=${enc(p.url)}&format=json`).catch(() => null)
    : await noembed(p.url).catch(() => null);
  if (!d || d.error || !d.title) throw fail('youtube');
  return { title: d.title, author: d.author_name || '' };
}

async function expandShort(p) {
  if (!SERVICE) throw fail('short');
  const r = await fetch(`${SERVICE}/expand?url=${enc(p.url)}`);
  const d = r.ok ? await r.json() : null;
  if (!d || !d.url) throw fail('short');
  return d.url;
}

async function search(q) {
  const [a, d] = await Promise.allSettled([itunesSearch(q), deezerSearch(q)]);
  if (a.status === 'rejected' && d.status === 'rejected') throw fail('offline');
  const A = a.status === 'fulfilled' ? a.value : [], D = d.status === 'fulfilled' ? d.value : [];
  const mixed = [];
  for (let i = 0; i < Math.max(A.length, D.length); i++) {
    if (A[i]) mixed.push(A[i]);
    if (D[i]) mixed.push(D[i]);
  }
  const results = rankResults(mixed, q);
  if (!results.length) throw fail('notfound');
  return results;
}

// A direct store link: that exact song first, then other sources as backup.
async function exact(list, fallbackQuery) {
  if (!list.length) throw fail('notfound');
  const first = list[0];
  if (first.preview) return list.slice(0, LIMIT);
  const more = await search(fallbackQuery || `${first.artist} ${first.title}`).catch(() => []);
  return [first, ...more.filter(r => r.key !== first.key)].slice(0, LIMIT);
}

// ─── PUBLIC ───
// Resolves to { label, results } or throws SongSearchError.
export async function findSongs(input) {
  let p = parseInput(input);
  if (p.kind === 'short') p = parseInput(await expandShort(p));
  switch (p.kind) {
    case 'empty': throw fail('empty');
    case 'query': return { label: p.query, results: await search(p.query) };
    case 'apple': {
      const list = await itunesLookup(p.id).catch(() => { throw fail('offline'); });
      return { label: list[0] ? `${list[0].title} — ${list[0].artist}` : '', results: await exact(list) };
    }
    case 'apple-album': {
      const list = await itunesLookup(p.id).catch(() => { throw fail('offline'); });
      if (!list.length) throw fail('notfound');
      return { label: list[0].album, results: list.slice(0, LIMIT) };
    }
    case 'deezer': {
      const list = await deezerTrack(p.id).catch(() => { throw fail('offline'); });
      return { label: list[0] ? `${list[0].title} — ${list[0].artist}` : '', results: await exact(list) };
    }
    case 'spotify': {
      const m = await spotifyMeta(p);
      const q = `${m.artist} ${m.title}`.trim();
      return { label: m.artist ? `${m.title} — ${m.artist}` : m.title, results: await search(q) };
    }
    case 'youtube': {
      const m = await youtubeMeta(p);
      const q = cleanVideoTitle(m.title, m.author);
      return { label: q, results: await search(q) };
    }
    default: throw fail(p.reason || 'unknown-site');
  }
}

// Where the app downloads a preview from (the service adds CORS headers).
export const previewFetchUrl = preview => (SERVICE ? `${SERVICE}/proxy?url=${enc(preview)}` : preview);

export const midiSearchUrl = r => `https://bitmidi.com/search?q=${enc(`${r.title} ${r.artist}`.trim())}`;
