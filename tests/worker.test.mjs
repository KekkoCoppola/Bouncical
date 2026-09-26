// Song service (Cloudflare Worker), exercised through its fetch handler
// with a fake network.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/song-proxy.js';

const realFetch = globalThis.fetch;
let routes, calls;

beforeEach(() => {
  routes = [];
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    for (const [match, respond] of routes) if (match(u)) return respond(u, init);
    return new Response('not mocked', { status: 599 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const on = (match, respond) => routes.push([typeof match === 'string' ? u => u.startsWith(match) : match, respond]);
const call = (path, env = {}, method = 'GET') => worker.fetch(new Request(`https://songs.example.workers.dev${path}`, { method }), env);
const q = u => encodeURIComponent(u);

test('preflight and CORS headers', async () => {
  const r = await call('/proxy', {}, 'OPTIONS');
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const r2 = await call('/', { ALLOWED_ORIGIN: 'https://kekkocoppola.github.io' });
  assert.equal(r2.headers.get('access-control-allow-origin'), 'https://kekkocoppola.github.io');
  assert.deepEqual(await r2.json(), { ok: true, service: 'bouncical-songs' });
});

test('proxies allowed JSON APIs', async () => {
  on('https://itunes.apple.com/search', () => new Response('{"resultCount":1,"results":[{"trackName":"X"}]}', { headers: { 'content-type': 'text/javascript; charset=utf-8' } }));
  const r = await call(`/proxy?url=${q('https://itunes.apple.com/search?term=x&entity=song')}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  assert.equal((await r.json()).results[0].trackName, 'X');
  assert.equal(calls[0].url, 'https://itunes.apple.com/search?term=x&entity=song');
});

test('blocks other hosts, paths and plain http', async () => {
  assert.equal((await call(`/proxy?url=${q('https://evil.example.com/x')}`)).status, 403);
  assert.equal((await call(`/proxy?url=${q('https://itunes.apple.com/admin')}`)).status, 403);
  assert.equal((await call(`/proxy?url=${q('https://api.deezer.com/user/1')}`)).status, 403);
  assert.equal((await call(`/proxy?url=${q('http://itunes.apple.com/search?term=x')}`)).status, 400);
  assert.equal((await call('/proxy?url=not-a-url')).status, 400);
  assert.equal(calls.length, 0, 'nothing was fetched');
});

test('proxies preview audio with limits', async () => {
  on('https://cdnt-preview.dzcdn.net/ok', () => new Response(new Uint8Array(1000), { headers: { 'content-type': 'audio/mpeg', 'content-length': '1000' } }));
  on('https://cdnt-preview.dzcdn.net/big', () => new Response('x', { headers: { 'content-type': 'audio/mpeg', 'content-length': String(20 * 1024 * 1024) } }));
  on('https://cdnt-preview.dzcdn.net/html', () => new Response('<html>', { headers: { 'content-type': 'text/html' } }));
  on('https://audio-ssl.itunes.apple.com/', () => new Response(new Uint8Array(10), { headers: { 'content-type': 'audio/x-m4a' } }));
  const ok = await call(`/proxy?url=${q('https://cdnt-preview.dzcdn.net/ok')}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await ok.arrayBuffer()).byteLength, 1000);
  assert.equal((await call(`/proxy?url=${q('https://cdnt-preview.dzcdn.net/big')}`)).status, 413);
  assert.equal((await call(`/proxy?url=${q('https://cdnt-preview.dzcdn.net/html')}`)).status, 415);
  assert.equal((await call(`/proxy?url=${q('https://audio-ssl.itunes.apple.com/itunes-assets/a.m4a')}`)).status, 200);
});

test('upstream errors become 502', async () => {
  on('https://api.deezer.com/search', () => new Response('down', { status: 503 }));
  const r = await call(`/proxy?url=${q('https://api.deezer.com/search?q=x')}`);
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /503/);
});

test('reads title and artist from a Spotify track page', async () => {
  const id = '0VjIjW4GlUZAMYd2vXMi3b';
  on('https://open.spotify.com/oembed', () => Response.json({ title: 'Blinding Lights' }));
  on(`https://open.spotify.com/track/${id}`, () => new Response('<html><head><title>Blinding Lights - song and lyrics by The Weeknd | Spotify</title></head></html>'));
  const r = await call(`/spotify?url=${q(`https://open.spotify.com/intl-it/track/${id}?si=abc`)}`);
  assert.deepEqual(await r.json(), { title: 'Blinding Lights', artist: 'The Weeknd' });
});

test('falls back to meta tags and oEmbed for Spotify', async () => {
  const id = '1111111111111111111111';
  on('https://open.spotify.com/oembed', () => Response.json({ title: 'Song &amp; Co' }));
  on(`https://open.spotify.com/track/${id}`, () => new Response('<meta content="Adele · 25 · Song · 2015" property="og:description"><meta property="og:title" content="Hello">'));
  let r = await call(`/spotify?url=${q(`https://open.spotify.com/track/${id}`)}`);
  assert.deepEqual(await r.json(), { title: 'Hello', artist: 'Adele' });

  routes = [];
  on('https://open.spotify.com/oembed', () => Response.json({ title: 'Only Title' }));
  on(`https://open.spotify.com/track/${id}`, () => new Response('', { status: 403 }));
  r = await call(`/spotify?url=${q(`https://open.spotify.com/track/${id}`)}`);
  assert.deepEqual(await r.json(), { title: 'Only Title', artist: '' });

  assert.equal((await call(`/spotify?url=${q('https://open.spotify.com/album/1111111111111111111111')}`)).status, 400);
});

test('expands short links by redirect or page content', async () => {
  on('https://spotify.link/abc', () => new Response(null, { status: 302, headers: { location: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b?si=x' } }));
  let r = await call(`/expand?url=${q('https://spotify.link/abc')}`);
  assert.deepEqual(await r.json(), { url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b?si=x' });

  on('https://deezer.page.link/xyz', () => new Response('<a href="https://www.deezer.com/it/track/908604612">open</a>', { status: 200 }));
  r = await call(`/expand?url=${q('https://deezer.page.link/xyz')}`);
  assert.deepEqual(await r.json(), { url: 'https://www.deezer.com/it/track/908604612' });

  assert.equal((await call(`/expand?url=${q('https://bit.ly/abc')}`)).status, 403);
});

test('rejects other methods and unknown paths', async () => {
  assert.equal((await call('/proxy', {}, 'POST')).status, 405);
  assert.equal((await call('/nope')).status, 404);
});
