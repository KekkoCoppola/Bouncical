# Bouncical song service (optional, free)

**Find a song** works without any server: Apple Music and Deezer are queried
straight from the browser. This small Cloudflare Worker makes two things
reliable for every visitor:

- **Spotify links**: Spotify doesn't let websites read song titles directly,
  so the Worker does it for them.
- **Previews in recorded videos**: when a preview server doesn't let web
  pages download its files, the song plays live but can't be recorded. The
  Worker fetches the file for the page, so it can always be recorded.

It is a strict proxy. It only talks to Apple (iTunes Search, preview CDN),
Deezer (API, preview CDN), Spotify (oEmbed, track pages) and YouTube (oEmbed),
needs no API keys and stores nothing. The Cloudflare **free plan** allows
100,000 requests a day and needs no credit card.

## Deploy in the browser (about 5 minutes)

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
2. Go to **Workers & Pages** → **Create** → **Create Worker**. Name it
   `bouncical-songs` and click **Deploy**.
3. Click **Edit code**, replace everything with the contents of
   [`song-proxy.js`](song-proxy.js), then click **Deploy**.
4. Open the Worker's URL, for example `https://bouncical-songs.<you>.workers.dev`.
   You should see `{"ok":true,"service":"bouncical-songs"}`.
5. In the app, open `js/config.js` and set:
   ```js
   export const SONG_SERVICE_URL = 'https://bouncical-songs.<you>.workers.dev';
   ```
   Commit and push. GitHub Pages redeploys on its own.

Optional: in the Worker's **Settings → Variables**, add
`ALLOWED_ORIGIN = https://kekkocoppola.github.io` so only your site can use it.

## Deploy from the terminal

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

## Endpoints

| Path | Returns |
|---|---|
| `/proxy?url=…` | JSON from iTunes Search / Deezer / oEmbed, or a preview audio file (allowlisted hosts only) |
| `/spotify?url=…` | `{ "title": …, "artist": … }` for a Spotify track link |
| `/expand?url=…` | `{ "url": … }` for `spotify.link` / `deezer.page.link` short links |

Tests: `npm test` at the repository root runs `tests/worker.test.mjs`.
