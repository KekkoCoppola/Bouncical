/* ========== Bouncical — song service (Cloudflare Worker) ========== */
/* Optional and free. A tiny allowlisted proxy that lets the static app on
   GitHub Pages talk to Apple, Deezer, Spotify and YouTube without CORS
   problems, so Spotify links resolve and previews can be recorded.
   It only ever fetches the hosts listed below.

   GET /proxy?url=…    JSON from the music APIs, or a 30-second preview file
   GET /spotify?url=…  { title, artist } for a Spotify track link
   GET /expand?url=…   { url } for spotify.link / deezer.page.link short links

   Deploy: see worker/README.md (free plan: 100,000 requests a day). */

const JSON_ROUTES = [
  { host: 'itunes.apple.com', path: /^\/(?:search|lookup)$/ },
  { host: 'api.deezer.com', path: /^\/(?:search|track\/\d+)$/ },
  { host: 'www.youtube.com', path: /^\/oembed$/ },
  { host: 'open.spotify.com', path: /^\/oembed$/ },
];
const AUDIO_HOSTS = [/^audio-ssl\.itunes\.apple\.com$/, /^[a-z0-9-]+\.dzcdn\.net$/];
const SHORT_HOSTS = ['spotify.link', 'spotify.app.link', 'deezer.page.link', 'dzr.page.link', 'link.deezer.com'];
const MAX_BYTES = 8 * 1024 * 1024;
const UA = 'Mozilla/5.0 (compatible; BouncicalSongService/1.0; +https://github.com/KekkoCoppola/Bouncical)';

export default {
  async fetch(request, env) {
    const origin = (env && env.ALLOWED_ORIGIN) || '*';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'GET') return json({ error: 'Only GET is supported.' }, 405, origin);
    const url = new URL(request.url);
    const target = url.searchParams.get('url') || '';
    try {
      switch (url.pathname) {
        case '/proxy': return await proxy(target, origin);
        case '/spotify': return json(await spotify(target), 200, origin);
        case '/expand': return json(await expand(target), 200, origin);
        case '/': return json({ ok: true, service: 'bouncical-songs' }, 200, origin);
        default: return json({ error: 'Not found.' }, 404, origin);
      }
    } catch (e) {
      return json({ error: e.message || 'Failed.' }, e.status || 502, origin);
    }
  },
};

// ─── HELPERS ───
function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=3600' : 'no-store', ...cors(origin) },
  });
}

function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function httpsUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { throw fail('Invalid url.'); }
  if (u.protocol !== 'https:') throw fail('Only https links are allowed.');
  return u;
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function metaContent(html, prop) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'));
  if (!tag) return '';
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]) : '';
}

// ─── /proxy ───
async function proxy(raw, origin) {
  const u = httpsUrl(raw);
  const kind = JSON_ROUTES.some(r => r.host === u.hostname && r.path.test(u.pathname)) ? 'json'
    : AUDIO_HOSTS.some(re => re.test(u.hostname)) ? 'audio' : null;
  if (!kind) throw fail('This host is not allowed.', 403);
  const ttl = kind === 'json' ? 3600 : 86400;
  const res = await fetch(u.toString(), {
    headers: { 'User-Agent': UA, Accept: kind === 'json' ? 'application/json' : 'audio/*' },
    cf: { cacheTtl: ttl, cacheEverything: true },
  });
  if (!res.ok) throw fail(`Upstream answered ${res.status}.`, 502);
  if (+(res.headers.get('content-length') || 0) > MAX_BYTES) throw fail('File too large.', 413);
  const type = res.headers.get('content-type') || (kind === 'json' ? 'application/json' : 'audio/mpeg');
  if (kind === 'audio' && !/^(?:audio\/|video\/mp4|application\/octet-stream)/i.test(type)) throw fail('Not an audio file.', 415);
  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': type, 'Cache-Control': `public, max-age=${ttl}`, ...cors(origin) },
  });
}

// ─── /spotify ───
async function spotify(raw) {
  const u = httpsUrl(raw);
  const m = u.hostname === 'open.spotify.com' && u.pathname.match(/\/track\/([A-Za-z0-9]{22})/);
  if (!m) throw fail('Not a Spotify track link.');
  const trackUrl = `https://open.spotify.com/track/${m[1]}`;
  const [oembed, page] = await Promise.allSettled([
    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`, { headers: { 'User-Agent': UA } })
      .then(r => (r.ok ? r.json() : null)),
    fetch(trackUrl, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } }).then(r => (r.ok ? r.text() : '')),
  ]);
  const html = page.status === 'fulfilled' ? page.value || '' : '';
  // <title>Song - song and lyrics by Artist | Spotify</title>
  const t = html.match(/<title>([^<]+)<\/title>/i);
  const byTitle = t && decode(t[1]).match(/^(.+?) - song(?: and lyrics)? by (.+?) \| Spotify$/i);
  if (byTitle) return { title: byTitle[1], artist: byTitle[2] };
  const title = metaContent(html, 'og:title') || (oembed.status === 'fulfilled' && oembed.value && oembed.value.title) || '';
  if (!title) throw fail('Spotify track not found.', 404);
  const artist = metaContent(html, 'music:musician_description') || metaContent(html, 'og:description').split(' · ')[0] || '';
  return { title, artist };
}

// ─── /expand ───
const FINAL = /^https:\/\/(?:open\.spotify\.com|(?:www\.)?deezer\.com)\//;
const IN_PAGE = /https:\/\/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/[A-Za-z0-9]{22}|www\.deezer\.com\/(?:[a-z]{2}\/)?track\/\d+)/;

async function expand(raw) {
  const u = httpsUrl(raw);
  if (!SHORT_HOSTS.includes(u.hostname)) throw fail('Not a supported short link.', 403);
  let current = u.toString();
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': UA } });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      if (FINAL.test(current)) return { url: current };
      continue;
    }
    // Some short-link services answer with an HTML page holding the target.
    const html = res.ok ? await res.text() : '';
    const found = html.match(IN_PAGE);
    if (found) return { url: found[0] };
    break;
  }
  throw fail('Could not open this short link.', 404);
}
