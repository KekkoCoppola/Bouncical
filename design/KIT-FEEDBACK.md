# Feedback per il Design Kit di ScrollStudio

Riepilogo dei componenti nuovi, dei miglioramenti e del fix critico a monte emersi durante il redesign di **Bouncical**. Da riportare nell'hub e nel kit condiviso (`ScrollStudio/design-kit/`).

---

## 1. Bug fix critico a monte (Upstream)

### `scrollstudio-wordmark-light.svg`
- **File**: `ScrollStudio/design-kit/assets/scrollstudio-wordmark-light.svg` (riga 3).
- **Problema**: Il file conteneva la stringa `--ink-700` dentro un commento XML (`<!-- ... letters in the dark --ink-700 ... -->`). Secondo la specifica W3C XML 1.0 (§ 2.5), la sequenza `--` è sintatticamente illegale all'interno dei commenti XML. Di conseguenza, il parser SVG integrato nei browser moderni (Chromium, WebKit) blocca il rendering del file con errore `Double hyphen within comment`, mostrando l'icona di immagine rotta e il testo alt del logo.
- **Risoluzione applicata**: Sostituito `--ink-700` con `ink-700` nel commento dell'asset. Il file è ora pienamente valido e renderizza all'istante sia in standalone che come `<img>`.

---

## 2. Regole CSS raccomandate per `family.css`

### Gestione globale dell'attributo `[hidden]`
- **Problema**: I componenti del kit come `.ss-overlay`, `.ss-modal`, `.ss-toast` e `.ss-drop` definiscono regole con `display: flex` o `display: grid`. Poiché i selettori di classe hanno specificità `(0, 1, 0)` mentre il selettore di attributo `[hidden]` del browser ha la stessa specificità `(0, 1, 0)` (ma dichiarato prima nei default UA), un elemento HTML `<div class="ss-overlay" hidden>` rimane visibile.
- **Proposta per `family.css`**:
  ```css
  [hidden] {
    display: none !important;
  }
  ```

### Stato a riposo per `.ss-toast`
- **Problema**: `.ss-toast` ha padding, sfondo `--paper` e `--shadow-panel` attivi di default. Se l'app inserisce un container `<div id="toast" class="ss-toast"></div>` statico nell'HTML, la capsula vuota viene visualizzata permanentemente a fondo schermo.
- **Proposta per `family.css`**:
  ```css
  .ss-toast:empty,
  .ss-toast:not(.show) {
    display: none !important;
  }
  ```

---

## 3. Nuovi componenti derivati (proposti per inclusione nel kit)

Tutti i componenti derivati sono stati costruiti rispettando rigorosamente la procedura "Componenti nuovi" di `FAMILY-DESIGN.md` e usano esclusivamente token di `tokens.css`.

### A. Griglia strumenti di disegno (`.ss-tool-grid`, `.ss-tool-btn`)
- **Ruolo**: Selezione esclusiva di uno strumento di lavoro (es. matita, gomma, sposta, forme) in una toolbar o sezione di pannello.
- **Componente affine**: Segmented control (`.ss-segmented`) e pulsanti icona bare (`.ss-icon-btn--bare`).
- **Primitivi**: Superficie incassata `--field`, inchiostro `--ink-700`, attivo su `--ink-900` con testo `--on-ink` e ombra `--shadow-raise`. Angoli `--radius: 4px`.
- **Ricetta CSS**:
  ```css
  .ss-tool-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-2);
  }

  .ss-tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 52px;
    padding: var(--s-1) 2px;
    font: inherit;
    font-size: var(--fs-xs);
    line-height: 1.1;
    color: var(--ink-700);
    background: var(--field);
    border: 0;
    border-radius: var(--radius);
    cursor: pointer;
    user-select: none;
    transition:
      background-color var(--dur-hover) ease-out,
      color var(--dur-hover) ease-out,
      box-shadow var(--dur-hover) ease-out,
      transform var(--dur-hover) ease-out;
  }

  .ss-tool-btn .ss-icon {
    width: 16px;
    height: 16px;
  }

  .ss-tool-btn:hover {
    color: var(--ink-900);
    box-shadow: inset 0 0 0 1px var(--hairline);
  }

  .ss-tool-btn[aria-pressed="true"] {
    color: var(--on-ink);
    background: var(--ink-900);
    box-shadow: var(--shadow-raise);
  }

  .ss-tool-btn:active {
    transform: translateY(1px);
  }
  ```

### B. Barra di controllo playback sotto il quadro (`.ss-stage-bar`)
- **Ruolo**: Alloggiare i pulsanti di play/pausa e controlli live centrati immediatamente sotto il quadro `.ss-frame`.
- **Ricetta CSS**:
  ```css
  .ss-stage-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    width: 100%;
  }
  ```

### C. Menu a comparsa (`.ss-menu`)
- **Ruolo**: Dropdown contestuale per formati video (9:16, 1:1, 16:9, Fit) e opzioni radio.
- **Componente affine**: Modale e panel su carta fluttuante.
- **Primitivi**: Sfondo `--paper`, angoli `--radius`, ombra `--shadow-panel`, animazione `ss-rise`. Voci interne con padding `--s-2` e hover su `--field`.
- **Ricetta CSS**:
  ```css
  .ss-menu {
    position: fixed;
    z-index: 45;
    min-width: 180px;
    padding: var(--s-1);
    background: var(--paper);
    border-radius: var(--radius);
    box-shadow: var(--shadow-panel);
    animation: ss-rise var(--dur-open) var(--ease-open);
  }
  ```

### D. Overlay di rilascio file (`.ss-drop-overlay`)
- **Ruolo**: Segnalazione a schermo intero durante il trascinamento di file audio/MIDI/video da desktop.
- **Componente affine**: `.ss-overlay` e `.ss-drop`.
- **Primitivi**: Sfondo sfocato `--overlay`, card centrale `.ss-drop` con bordo tratteggiato `--line-dashed` e bagliore `--wall-glow`.

---

## 4. Layout dell'editor con l'anteprima al centro (N17)

Chiesto dall'utente il 2026-10-19, stessa ricetta di TopFratmRanks (commit `71a000d`, branch `redesign/scrollstudio`); sostituisce N16.

| # | Problema nel kit | Soluzione |
|---|---|---|
| **N17** Editor con l'anteprima al centro (sostituisce N16) | nel kit l'anteprima è al massimo 300px e ogni misura è in px fissi: su un 2560×1440 o un ultrawide anteprima e comandi restano minuscoli in mezzo alla parete (in Bouncical N16 la portava a `100svh − 160px`, ma la barra Play finiva sotto la piega e i comandi restavano a 340px). | L'anteprima prende l'altezza della finestra (`--stage-chrome` = quello che la divide con il quadro) e la barra Play è larga quanto il quadro. Telefono: titolo, anteprima che riempie la prima schermata, poi i fogli; da 700px i due fogli affiancati sotto; orizzontale da 861px: titolo + foglio "make" (Strumenti, Forma selezionata, Scena e formato) \| stage; da 1200px: "make" \| stage \| foglio "finish" (Scene virali, Regole, Mondo, Musica, Effetti, Registra ed esporta). Su schermi orizzontali grandi topbar, titolo, fogli, barra Play, modali, menu, toast e footer sono ingranditi con `zoom: var(--k)`; lo stage no, perché `zoom` scala anche le unità viewport. Proposta per il kit: lo stesso principio della `u` dell'hub, applicato alle app. |

Differenze rispetto a TopFratmRanks, utili per il kit:

- **Formato variabile**: il quadro non è sempre 9:16. La forma è `--frame-ratio` (larghezza/altezza, scritta da `js/stage.js` su `.ss-editor` insieme a `data-aspect`) al posto di `9 / 16`; con *Fit* la colonna dello stage è `minmax(0, 1fr)` e il quadro prende tutta l'altezza rimasta. Con 16:9 la colonna `minmax(0, …)` si stringe e l'altezza segue l'aspect-ratio.
- **Menu flottante dentro lo zoom**: `.ss-menu` è `position: fixed` e zoomato; `left`/`top` in px vengono moltiplicati dallo zoom e `offsetWidth` è non zoomato. Si misura il menu con `getBoundingClientRect()` e si scrive `left / zoom`, `top / zoom` (`zoom` letto da `getComputedStyle(menu).zoom`).
- **`vh` dentro una modale zoomata**: `.rec-preview { max-height: 55vh }` diventa `calc(55vh / var(--k))`, come `.ss-modal--scroll` in TopFratmRanks.
- **`--k` all'ottavo pieno**: qui ci sono anche i gradini 1.875 e 2.125, che in TopFratmRanks mancano (es. a 3060×1913 lì resta 2, qui è 2.125).
- **`--stage-chrome` misurato**: 255px su telefono (topbar su due righe), 234px da 700px, `132px × --k` in orizzontale (quadro a 76 + gap 12 + barra Play 28 + 16 di margine).

## Token aggiunti

| Token | Valore | Motivo |
|---|---|---|
| `--panel-w` | 340px | un foglio di `.ss-editor` (×`--k`); oggi nel kit è un numero dentro `minmax(280px, 340px)` |
| `--k` | 1 → 2.25 | scala dei comandi (N17): `min(larghezza/1440, altezza/900)` arrotondato all'ottavo, solo su schermi orizzontali; 1 su telefoni e tablet |

`--stage-w` (N16) è stato tolto: non è più usato.

### Copia del CSS

In `css/family.css`, in coda:

```css
/* N17 Preview-first editor (asked by the user, 2026-10-19; replaces N16, same recipe as
   TopFratmRanks). The preview is what you look at, so it takes the window's height and the rest
   sits next to it, at its scale:
   - phone: title, the preview filling the rest of the first screen, then the two sheets
   - from 700px (and portrait tablets): the same, with the two sheets side by side
   - landscape from 861px: title + sheet "make" (tools, selected shape, scene & format) | stage
   - landscape from 1200px: title + sheet "make" | stage | sheet "finish" (viral scenes, rules,
     world, music, effects, record)
   On landscape screens every control is zoomed by --k (tokens.css). The stage is not: its frame
   is sized on 100svh, and zoom scales viewport units too. --stage-chrome is what shares the
   window's height with the frame: topbar, title, gaps, the bar under the frame and a margin.
   The scene's format changes, so the frame's shape is --frame-ratio (width / height), set with
   data-aspect on .ss-editor by js/stage.js; "Fit" fills the space the layout gives the stage */

.ss-editor {
  --frame-ratio: 0.5625; /* 9:16 until js/stage.js sets the scene's format */
  --stage-chrome: 255px; /* measured: frame top 199 + gap 12 + bar 28 + 16 */
  --frame-h: calc(100svh - var(--stage-chrome));
  --frame-w: min(100%, calc(var(--frame-h) * var(--frame-ratio)));
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "head" "stage" "make" "finish";
  gap: var(--s-5);
}

.ss-editor > .ss-head {
  grid-area: head;
  padding: var(--s-2) 0 0;
}

.ss-editor > .ss-stage {
  grid-area: stage;
  position: relative;
  top: auto;
  gap: calc(var(--s-2) * var(--k));
}

.ss-editor__make {
  grid-area: make;
}

.ss-editor__finish {
  grid-area: finish;
}

/* The light behind the stage stays behind the sheets next to it */
.ss-editor > .ss-panel {
  position: relative;
  z-index: 1;
}

/* The frame takes the scene's format; the bar under it is as wide as the frame */
.ss-editor .ss-frame,
.ss-editor .ss-stage-bar {
  width: var(--frame-w);
}

.ss-editor .ss-frame {
  aspect-ratio: var(--frame-ratio);
}

/* Fit: all the stage's width, all the height left */
.ss-editor[data-aspect="fit"] {
  --frame-w: 100%;
}

.ss-editor[data-aspect="fit"] .ss-frame {
  aspect-ratio: auto;
  height: var(--frame-h);
}

@media (min-width: 700px) {
  .ss-editor {
    --stage-chrome: 234px; /* one-row topbar: frame top 178 + gap 12 + bar 28 + 16 */
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas: "head head" "stage stage" "make finish";
  }
}

@media (orientation: landscape) and (min-width: 861px) {
  .ss-editor {
    --stage-chrome: calc(132px * var(--k)); /* (frame top 76 + gap 12 + bar 28 + 16) × k */
    --frame-w: 100%; /* the stage column is already the frame's width */
    --stage-track: minmax(0, calc(var(--frame-h) * var(--frame-ratio)));
    grid-template-columns: calc(var(--panel-w) * var(--k)) var(--stage-track);
    grid-template-rows: auto auto auto 1fr;
    grid-template-areas: "head stage" "make stage" "finish stage" ". stage";
    justify-content: center;
    gap: calc(var(--s-5) * var(--k)) calc(var(--s-6) * var(--k));
    padding-top: calc(var(--s-2) * var(--k));
    padding-bottom: calc(var(--s-7) * var(--k));
  }

  .ss-editor[data-aspect="fit"] {
    --stage-track: minmax(0, 1fr);
  }

  .ss-editor > .ss-head {
    align-items: flex-start;
    padding: 0;
    text-align: left;
  }

  .ss-editor > .ss-stage {
    position: sticky;
    top: calc(var(--s-3) * var(--k));
  }

  .ss-topbar,
  .ss-head,
  .ss-panel,
  .ss-stage-bar,
  .stage-hint,
  .ss-modal,
  .ss-menu,
  .ss-toast,
  .ss-drop,
  .ss-footer {
    zoom: var(--k);
  }

  /* Inside a zoomed box viewport units are zoomed too: divided back, edges stay aligned */
  .ss-topbar,
  .ss-head,
  .ss-footer {
    padding-inline: calc(var(--gutter) / var(--k));
  }

  .rec-preview {
    max-height: calc(55vh / var(--k));
  }
}

@media (orientation: landscape) and (min-width: 1200px) {
  .ss-editor {
    grid-template-columns:
      calc(var(--panel-w) * var(--k))
      var(--stage-track)
      calc(var(--panel-w) * var(--k));
    grid-template-rows: auto auto 1fr;
    grid-template-areas: "head stage finish" "make stage finish" ". stage finish";
  }
}
```

In `css/tokens.css`, in coda:

```css
:root {
  --panel-w: 340px; /* one settings sheet: a column of .ss-editor in family.css (times --k) */
  --k: 1;           /* N17 control scale: the kit's px are drawn for a 1440×900 window */
}

/* N17 (asked by the user, 2026-10-19) On big landscape screens the preview grows with the window,
   so the controls grow with it: --k = min(width / 1440, height / 900), rounded down to an eighth,
   from 1 to 2.25 (the hub does the same with its "u"). Phones and tablets keep the kit's px */
@media (orientation: landscape) and (min-width: 1620px) and (min-height: 1013px) { :root { --k: 1.125; } }
@media (orientation: landscape) and (min-width: 1800px) and (min-height: 1125px) { :root { --k: 1.25; } }
@media (orientation: landscape) and (min-width: 1980px) and (min-height: 1238px) { :root { --k: 1.375; } }
@media (orientation: landscape) and (min-width: 2160px) and (min-height: 1350px) { :root { --k: 1.5; } }
@media (orientation: landscape) and (min-width: 2340px) and (min-height: 1463px) { :root { --k: 1.625; } }
@media (orientation: landscape) and (min-width: 2520px) and (min-height: 1575px) { :root { --k: 1.75; } }
@media (orientation: landscape) and (min-width: 2700px) and (min-height: 1688px) { :root { --k: 1.875; } }
@media (orientation: landscape) and (min-width: 2880px) and (min-height: 1800px) { :root { --k: 2; } }
@media (orientation: landscape) and (min-width: 3060px) and (min-height: 1913px) { :root { --k: 2.125; } }
@media (orientation: landscape) and (min-width: 3240px) and (min-height: 2025px) { :root { --k: 2.25; } }
```
