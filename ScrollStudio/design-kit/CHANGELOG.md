# Kit ScrollStudio — Changelog

La versione è scritta anche nel commento in testa a `tokens.css` e `family.css`: così un'app sa quale kit ha copiato (`grep -m1 "kit " css/tokens.css`; nessun risultato = kit 1.0).

## kit 1.1: temi (2026-10-18)

Tema scuro per tutta la famiglia. **Nel tema chiaro non cambia nulla**: ogni token nuovo, in chiaro, vale esattamente il valore che prima era scritto a mano nel componente. Un'app che copia il kit 1.1 resta identica finché qualcuno non sceglie il tema scuro; l'unica aggiunta visibile è lo switch del tema nella topbar.

### File nuovi

| File | Cosa |
|---|---|
| `theme.js` | legge e salva il tema, scrive `data-theme` su `<html>`, collega gli switch, aggiorna `<meta name="theme-color">`. Sincrono, nel `<head>` prima dei CSS |
| `assets/scrollstudio-wordmark-light.svg` | il wordmark disegnato chiaro (lettere `#C5C2BC`, ® `#474746`), per il tema scuro |
| `THEME-ADOPTION.md` | guida per portare il tema in un'app che usa già il kit |
| `PROMPT-THEME-APP.md` | il prompt da incollare nella chat dell'app |
| `CHANGELOG.md` | questo file |

### Contratto (uguale in hub e app)

| Cosa | Valore |
|---|---|
| Attributo | `<html data-theme="light\|dark">`, sempre esplicito dopo `theme.js` |
| Chiave `localStorage` | `scrollstudio-theme` = `light` / `dark`; se manca, segue `prefers-color-scheme` e i suoi cambi |
| Evento | `ss:theme` su `document`, `detail: { theme }` |
| API | `window.ssTheme()`, `window.ssSetTheme('light'\|'dark')` (salva, aggiorna `aria-pressed`, emette `ss:theme`) |
| Bottoni | `[data-theme-choice="light\|dark"]` in `.ss-theme`; un solo listener su `document`, quindi funzionano anche se creati dopo |

### Token nuovi (valore chiaro = quello di prima)

| Token | Chiaro | Scuro | Ruolo |
|---|---|---|---|
| `--on-ink` | `var(--paper)` = `#FBFBFA` | `var(--paper)` = `#353534` | testo e icone su superfici piene di `--ink-900` |
| `--knob` | `var(--paper)` | `var(--ink-900)` | manopole: switch spento, range, playhead |
| `--overlay` | `rgb(233 233 232 / 0.7)` | `rgb(33 33 32 / 0.7)` | fondo di `.ss-overlay` |
| `--stage-glow-end` | `rgb(250 250 250 / 0)` | `rgb(255 255 255 / 0)` | coda trasparente della luce dietro lo stage |
| `--line-dashed` | `rgb(var(--shadow-ink) / 0.25)` | `rgb(236 234 230 / 0.25)` | bordo tratteggiato di `.ss-drop` |
| `--swatch-ring` | `rgb(var(--shadow-ink) / 0.18)` | `rgb(236 234 230 / 0.18)` | anello di `.ss-swatch`: un colore scuro dell'utente non sparisce sulla carta scura |
| `--chevron` | data-URI, tratto `%2348484B` | data-URI, tratto `%23C5C2BC` | freccia di `.ss-select` (`--ink-700`) |
| `--check-mark` | data-URI, tratto `%23FBFBFA` | data-URI, tratto `%23353534` | spunta di una casella piena di `--ink-900` (colore `--on-ink`); il kit non la usa ancora, TopFratmRanks sì |

Più `color-scheme: light` su `:root` e `color-scheme: dark` nel blocco scuro: select, scrollbar, spinner e date picker nativi seguono il tema.

### Token che cambiano nel tema scuro

| Token | Chiaro | Scuro |
|---|---|---|
| `--wall-top` | `#E9E9E8` | `#2C2C2B` |
| `--wall-mid` | `#E1E1E0` | `#272726` |
| `--wall-bottom` | `#D7D6D5` | `#212120` |
| `--wall-light` | `rgb(255 255 255 / 0.38)` | `rgb(255 255 255 / 0.04)` |
| `--wall-glow` | `rgb(250 250 250 / 0.85)` | `rgb(255 255 255 / 0.08)` |
| `--paper` (e `--card`) | `#FBFBFA` | `#353534` |
| `--field` | `var(--wall-top)` | `#282827` |
| `--ink-900` | `#2B2B2D` | `#ECEAE6` |
| `--ink-700` | `#48484B` | `#C5C2BC` |
| `--ink-500` | `#66666A` | `#A3A09A` |
| `--hairline` | `rgb(34 31 29 / 0.1)` | `rgb(236 234 230 / 0.1)` |
| `--track` | `rgb(34 31 29 / 0.16)` | `rgb(236 234 230 / 0.16)` |
| `--focus` | `#8E5EEA` | `#9670EC` (il viola di prima è 2,9:1 sulla carta scura) |
| `--shadow-ink` | `34 31 29` | `0 0 0` |
| `--shadow-raise` | `0 2px 10px`, α 0,12 | α 0,36 |
| `--shadow-raise-hover` | `0 4px 14px`, α 0,16 | α 0,44 |
| `--shadow-panel` | α 0,22 + 0,05 | α 0,6 + 0,2 |
| `--shadow-paper` | α 0,3 + 0,06 | α 0,65 + 0,25 |
| `--shadow-coral` | corallo, α 0,55 | nero, α 0,45 (un'ombra corallo sulla grafite sarebbe un alone colorato) |
| `--shadow-coral-hover` | corallo, α 0,6 | nero, α 0,5 |

Non cambiano: `--coral`, `--on-coral` (`#2B2B2D`, 5,4:1 sul corallo), `--on-coral-icon`, `--video-ink`, tipo, spazi, raggi, movimento.

### Regole cambiate in `family.css`

| Regola | Prima | Ora |
|---|---|---|
| `.ss-select` | data-URI scritto nella regola | `background-image: var(--chevron)` |
| `.ss-swatch` | anello `rgb(var(--shadow-ink) / 0.18)` | `var(--swatch-ring)` |
| `.ss-switch::after`, `.ss-range` (thumb webkit e moz), `.ss-playhead::after` | `var(--paper)` | `var(--knob)` |
| `.ss-switch:checked::after` | manopola uguale da spento | `background: var(--on-ink)`: sulla traccia `--ink-900` la manopola prende il colore "su inchiostro" (in chiaro è la stessa carta di prima) |
| `.ss-stage::before` | `rgb(250 250 250 / 0)` | `var(--stage-glow-end)` |
| `.ss-drop` | bordo `rgb(var(--shadow-ink) / 0.25)` | `var(--line-dashed)` |
| `.ss-overlay` | `rgb(233 233 232 / 0.7)` | `var(--overlay)` |
| `@media (max-width: 640px)` | | `.ss-theme` chiude la seconda riga della topbar (vedi sotto) |

### Componenti nuovi

| Classe | Cosa |
|---|---|
| `.ss-theme` > `.ss-theme__option[data-theme-choice][aria-pressed]` | switch del tema: due icone (sole, luna), subito dopo `.ss-lang`. A riposo `--ink-500`, hover e scelto `--ink-900`, bersaglio 28px. Su telefono va in fondo alla seconda riga, a destra della nav (o da solo, a destra, se l'app non ha nav): a 375px la prima riga con il nome del prodotto non ha 72px liberi |
| `.ss-only-light` / `.ss-only-dark` | mostrano un elemento solo in un tema; senza `data-theme` (JS spento) vale il chiaro. Per il doppio wordmark |

### Contrasti del tema scuro

Calcolati con la formula WCAG 2.x sui valori dei token; le trasparenze sono composte sulla carta.

| Coppia | Scuro | Soglia |
|---|---|---|
| `--ink-900` su parete (alto · basso) / carta / campo | 11,63 · 13,41 / 10,22 / 12,28 | 4,5 |
| `--ink-700` su parete / carta / campo | 7,87 · 9,07 / 6,91 / 8,30 | 4,5 |
| `--ink-500` su parete / carta / campo | 5,36 · 6,18 / 4,71 / 5,66 | 4,5 |
| `--on-coral` su `--coral` | 5,43 | 4,5 |
| `--on-ink` su `--ink-900` / su `--ink-700` | 10,22 / 6,91 | 4,5 |
| `--coral` su parete / carta | 5,37 · 6,19 / 4,72 | 3 |
| `--focus` su parete / carta / campo | 3,88 · 4,47 / 3,41 / 4,09 | 3 |
| `--knob` su carta / su `--track` (switch spento) | 10,22 / 6,52 | 3 |
| `--ink-500` (icona tema a riposo) su `--wall-top` | 5,36 | 3 |
| `--track` su carta | 1,57 (in chiaro 1,38) | visibile |

## kit 1.0 (2026-10-18)

Prima versione: `tokens.css`, `family.css`, `i18n.js`, `specimen.html`, `FAMILY-DESIGN.md`, `PROMPT.md`, `reference/`. Solo tema chiaro.
