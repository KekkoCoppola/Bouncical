# Vendored libraries

These files are unmodified builds copied from npm, so the app works offline
and never depends on a CDN being reachable. All are MIT-licensed.

| File | Package | Version | License | Global |
|---|---|---|---|---|
| `matter.min.js` | [matter-js](https://github.com/liabru/matter-js) | 0.19.0 | MIT © Liam Brummitt | `Matter` |
| `decomp.min.js` | [poly-decomp](https://github.com/schteppe/poly-decomp.js) | 0.3.0 | MIT © Stefan Hedman | `decomp` |
| `polybool.min.js` | [polybooljs](https://github.com/velipso/polybooljs) | 1.2.0 | MIT © Sean Connelly | `PolyBool` |
| `tone.min.js` | [tone](https://github.com/Tonejs/Tone.js) | 14.8.49 | MIT © Yotam Mann | `Tone` |
| `midi.min.js` | [@tonejs/midi](https://github.com/Tonejs/Midi) | 2.0.28 | MIT © Yotam Mann | `Midi` |

To update one, install the new version from npm and copy its browser build
(`build/*.js` or `dist/*.min.js`) over the file above.
