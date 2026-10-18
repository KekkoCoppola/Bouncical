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
