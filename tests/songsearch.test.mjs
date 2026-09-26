// Song search: link parsing, title cleanup, normalization and ranking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInput, cleanVideoTitle, fromItunes, fromDeezer, rankResults, normalizeText } from '../js/songsearch.js';

const SP = '0VjIjW4GlUZAMYd2vXMi3b';
const LINKS = [
  // Spotify
  [`https://open.spotify.com/track/${SP}`, { kind: 'spotify', id: SP }],
  [`https://open.spotify.com/track/${SP}?si=1a2b3c4d5e6f7g8h`, { kind: 'spotify', id: SP }],
  [`https://open.spotify.com/intl-it/track/${SP}?si=abc`, { kind: 'spotify', id: SP }],
  [`spotify:track:${SP}`, { kind: 'spotify', id: SP }],
  [`Ascolta Blinding Lights di The Weeknd su Spotify https://open.spotify.com/track/${SP}?si=x`, { kind: 'spotify', id: SP }],
  ['https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj', { kind: 'unsupported', reason: 'spotify-not-track' }],
  ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', { kind: 'unsupported', reason: 'spotify-not-track' }],
  ['https://spotify.link/AbCdEf123', { kind: 'short', service: 'spotify' }],
  // YouTube
  ['https://www.youtube.com/watch?v=4NRXx6U8ABQ', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://youtube.com/watch?v=4NRXx6U8ABQ&list=PL123&index=2', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://m.youtube.com/watch?v=4NRXx6U8ABQ&feature=share', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://youtu.be/4NRXx6U8ABQ?si=abcdef', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://www.youtube.com/shorts/4NRXx6U8ABQ', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://music.youtube.com/watch?v=4NRXx6U8ABQ&feature=share', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://www.youtube.com/embed/4NRXx6U8ABQ', { kind: 'youtube', id: '4NRXx6U8ABQ' }],
  ['https://www.youtube.com/playlist?list=PL123', { kind: 'unsupported', reason: 'youtube-not-video' }],
  // Apple Music / iTunes
  ['https://music.apple.com/it/album/blinding-lights/1488408555?i=1488408568', { kind: 'apple', id: '1488408568' }],
  ['https://music.apple.com/us/song/blinding-lights/1488408568', { kind: 'apple', id: '1488408568' }],
  ['https://music.apple.com/us/song/1488408568', { kind: 'apple', id: '1488408568' }],
  ['https://itunes.apple.com/us/album/after-hours/1499378108?i=1499378615&uo=4', { kind: 'apple', id: '1499378615' }],
  ['https://music.apple.com/it/album/after-hours/1499378108', { kind: 'apple-album', id: '1499378108' }],
  ['https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb', { kind: 'unsupported', reason: 'apple-not-song' }],
  // Deezer
  ['https://www.deezer.com/track/908604612', { kind: 'deezer', id: '908604612' }],
  ['https://www.deezer.com/it/track/908604612?utm_source=share', { kind: 'deezer', id: '908604612' }],
  ['https://deezer.page.link/AbC123', { kind: 'short', service: 'deezer' }],
  ['https://link.deezer.com/s/30xyz', { kind: 'short', service: 'deezer' }],
  ['https://www.deezer.com/it/album/12345', { kind: 'unsupported', reason: 'deezer-not-track' }],
  // Other
  ['https://soundcloud.com/artist/song', { kind: 'unsupported', reason: 'unknown-site' }],
  ['blinding lights the weeknd', { kind: 'query', query: 'blinding lights the weeknd' }],
  ['  Bella ciao  ', { kind: 'query', query: 'Bella ciao' }],
  ['', { kind: 'empty' }],
];

for (const [input, exp] of LINKS) {
  test(`parse: ${input || '(empty)'}`, () => {
    const p = parseInput(input);
    for (const k in exp) assert.equal(p[k], exp[k], `${k} for ${input}`);
  });
}

const TITLES = [
  ['The Weeknd - Blinding Lights (Official Video)', 'The Weeknd', 'The Weeknd Blinding Lights'],
  ['Måneskin - ZITTI E BUONI (Official Video) [Eurovision 2021]', 'Måneskin', 'Måneskin ZITTI E BUONI [Eurovision 2021]'],
  ['Blinding Lights', 'The Weeknd - Topic', 'The Weeknd Blinding Lights'],
  ['Dua Lipa - Levitating (Lyrics)', 'Taj Tracks', 'Dua Lipa Levitating'],
  ['Levitating | Dua Lipa Official Channel', 'DuaLipaVEVO', 'DuaLipa Levitating'],
  ['Adele - Hello [4K]', 'AdeleVEVO', 'Adele Hello'],
  ['Laura Pausini - La solitudine (Video Ufficiale)', 'Laura Pausini', 'Laura Pausini La solitudine'],
  ['Coldplay - Yellow (Official Video) | HD', 'Coldplay', 'Coldplay Yellow'],
];

for (const [title, author, exp] of TITLES) {
  test(`clean title: ${title}`, () => {
    assert.equal(cleanVideoTitle(title, author), exp);
  });
}

test('iTunes and Deezer results share one shape', () => {
  const a = fromItunes({
    wrapperType: 'track', kind: 'song', trackId: 1, trackName: 'Blinding Lights', artistName: 'The Weeknd',
    collectionName: 'After Hours', artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/p.m4a', trackViewUrl: 'https://music.apple.com/x', trackTimeMillis: 200040,
  });
  assert.equal(a.key, 'apple:1');
  assert.equal(a.cover, 'https://is1-ssl.mzstatic.com/image/thumb/x/200x200bb.jpg');
  assert.equal(a.duration, 200.04);
  const d = fromDeezer({
    id: 2, type: 'track', title: 'Blinding Lights', title_short: 'Blinding Lights', duration: 200,
    preview: 'https://cdnt-preview.dzcdn.net/p.mp3', link: 'https://www.deezer.com/track/2',
    artist: { name: 'The Weeknd' }, album: { title: 'After Hours', cover_medium: 'https://e-cdns-images.dzcdn.net/c.jpg' },
  });
  assert.deepEqual(Object.keys(a).sort(), Object.keys(d).sort());
  assert.equal(d.source, 'deezer');
  assert.equal(fromItunes({ wrapperType: 'collection', collectionName: 'x' }), null);
  assert.equal(fromDeezer({ type: 'album', title: 'x' }), null);
});

test('ranking dedupes across sources and prefers the best match with a preview', () => {
  const r = (source, key, artist, title, preview = 'p') => ({ key: `${source}:${key}`, source, artist, title, album: '', preview });
  const list = [
    r('apple', 1, 'Some Cover Band', 'Blinding Lights (Piano)'),
    r('deezer', 2, 'The Weeknd', 'Blinding Lights', ''),
    r('apple', 3, 'The Weeknd', 'Blinding Lights'),
    r('deezer', 4, 'The Weeknd', 'Save Your Tears'),
  ];
  const out = rankResults(list, 'the weeknd blinding lights');
  assert.equal(out[0].key, 'apple:3');
  assert.equal(out.filter(x => normalizeText(x.title) === 'blinding lights' && x.artist === 'The Weeknd').length, 1);
  assert.equal(out.length, 3);
});
