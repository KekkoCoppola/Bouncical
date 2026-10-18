# Piano di Redesign ScrollStudio — Bouncical

Bouncical diventa un'app figlia di **ScrollStudio**: un'altra stanza della stessa casa.
Tutto il design language, la palette, la tipografia, le ombre, la cornice e i componenti derivano rigorosamente da `ScrollStudio/design-kit/` (regole in `FAMILY-DESIGN.md`, origine in `HUB-DESIGN.md`, token in `tokens.css`, componenti in `family.css`).

---

## 1. Inventario (schermate, stati e componenti con `file:riga`)

### A. Cornice globale e Struttura pagina
- `index.html:1-17`: `<head>` — font `JetBrains Mono`, tema scuro fisso `#05050b`, favicon inline SVG, `style.css`.
- `index.html:19-20`: Contenitore principale `#app.app` (griglia fissa viewport).
- `index.html:22-43`: Barra superiore `#topbar.bar`:
  - `index.html:24-29`: Bottoni Undo `#btn-undo` e Redo `#btn-redo`.
  - `index.html:31-34`: Selettore formato `#btn-format` con `#lbl-format` e freccia caret.
  - `index.html:36-38`: Bottone scene virali `#btn-scenes`.
  - `index.html:39-42`: Bottone registrazione `#btn-rec` con indicatore `#rec-time`.
- `index.html:134`: Menu a comparsa formato `#format-menu.menu`.
- `index.html:135`: Toast per notifiche `#toast`.
- `index.html:136`: Modale generica `#modal.modal` > `.modal-card`.
- `index.html:137`: Overlay drag-and-drop `#drop-overlay.drop-overlay`.
- `index.html:138-140`: Input file nascosto `#song-input`.

### B. Schermata Splash (Ingresso & Sblocco Audio)
- `index.html:142-151`: `#splash.splash` > `.splash-inner`:
  - `index.html:144`: Logo `#splash img.splash-logo` (`assets/logo-mark.png`).
  - `index.html:145`: Sottotitolo `#splash-sub`.
  - `index.html:146`: Bottone principale d'avvio `#splash-start.btn.primary.big`.
  - `index.html:147`: Testo divisore `p.splash-or`.
  - `index.html:148`: Contenitore chip scene virali `#splash-scenes.chips.center`.
  - `index.html:149`: Nota a piè di pagina `#splash-foot`.

### C. Area di Lavoro (Stage & Canvas)
- `index.html:74-77`: `#stage-wrap`:
  - `index.html:75`: Canvas interattivo `#stage` (disegno, simulazione fisica e rendering).
  - `index.html:76`: Suggerimento contestuale `#stage-hint.stage-hint`.

### D. Barre degli Strumenti (Tools & Controls)
- `index.html:46-71`: Barra strumenti disegno `#tools.toolbar.tools`:
  - `index.html:47-49`: Strumento Ball (`data-tool="ball"`).
  - `index.html:50-52`: Strumento Move (`data-tool="move"`).
  - `index.html:53-55`: Strumento Line (`data-tool="line"`).
  - `index.html:56-58`: Strumento Circle (`data-tool="ring"`).
  - `index.html:59-61`: Strumento Triangle (`data-tool="tri"`).
  - `index.html:62-64`: Strumento Rectangle (`data-tool="rect"`).
  - `index.html:65-67`: Strumento Erase (`data-tool="erase"`).
  - `index.html:68-70`: Strumento Rubber (`data-tool="rubber"`).
- `index.html:80-106`: Barra controlli `#controls.toolbar.controls`:
  - `index.html:81-85`: Play/Pause `#btn-play.cbtn.play` con `#lbl-play` e icone svg play/pause.
  - `index.html:86-88`: Reset scena `#btn-clear.cbtn`.
  - `index.html:89-91`: Apertura pannello Musica (`data-panel="music"`).
  - `index.html:92-94`: Apertura pannello Regole (`data-panel="rules"`).
  - `index.html:95-97`: Apertura pannello Mondo (`data-panel="world"`).
  - `index.html:98-100`: Apertura pannello Effetti (`data-panel="fx"`).
  - `index.html:101-105`: Toggle Muto/Suono `#btn-mute.cbtn` con icone audio/muto.

### E. Pannelli Impostazioni (Drawer laterali / Bottom sheet)
- `index.html:109-112`: Pannello Regole `#panel-rules.panel` > `#rules-body` (`js/rules/ui.js:25-210`):
  - Area composizione regola naturale (`textarea.rule-input`).
  - Bottoni azione `Add rule` (`.btn.primary`) e `+ New rule` (`.btn`).
  - Sezione richiudibile `details.presets` ("Examples") con chip.
  - Intestazione lista con conteggio `.rule-count` e link `Delete all` (`.linkbtn`).
  - Schede delle regole `.rule-card`: switch abilitazione, riepilogo cliccabile, bottoni su/duplica/elimina (`.icon-mini`), editor interno (`WHEN` trigger, `IF` condition, `THEN` actions).
- `index.html:113-116`: Pannello Mondo `#panel-world.panel` (`js/ui/controls.js:133-167`):
  - Sezione Gravity: slider forza, slider direzione con freccia, bottoni rapidi (↓, ↑, ←, →, Off).
  - Sezione Time: slider timeScale.
  - Sezione Balls: slider raggio, variazione raggio, rimbalzo, attrito, resistenza aria, velocità max, colore, toggle color shift, toggle collisioni, slider max balls.
  - Sezione Borders: toggle parete sx, parete dx, pavimento, soffitto.
  - Piede: bottone `Reset to defaults`.
- `index.html:117-120`: Pannello Effetti `#panel-fx.panel` (`js/ui/controls.js:169-192`):
  - Sezione Quality: segmented detail (Low, Medium, High) + nota descrittiva.
  - Sezione Particles: toggle scintille, slider quantità, toggle onde d'urto.
  - Sezione Balls: toggle scie, slider lunghezza scia, toggle glow.
  - Sezione Scene: toggle luce forme, toggle shake, slider shake, toggle pulse sfondo, toggle etichette note, toggle filigrana logo.
  - Piede: bottone `Reset to defaults`.
- `index.html:121-124`: Pannello Musica `#panel-music.panel` (`js/ui/controls.js:197-283`):
  - Sezione Find a song: input ricerca, bottone Search (`.btn.primary`), nota legale/istruzioni, lista risultati (`.result`: cover, titolo, artista, badge fonte, preview audio, bottone Use, link MIDI).
  - Sezione Song: scheda brano vuoto (`.song-card.empty`) o brano attivo con barra progresso `.progress`, minutaggio, bottoni Restart, Load file, Remove.
  - Sezione Sound: select strumento, select scala, select nota base, slider ottava, select evento note, slider impatto minimo, slider volume, slider riverbero.
  - Piede: bottone `Reset to defaults`.
- `index.html:125-128`: Pannello Scene Virali `#panel-scenes.panel` (`js/ui/controls.js:431-438`):
  - Griglia card scene predefinite (`.scene-card`: emoji, nome, descrizione).
- `index.html:129-132`: Pannello Ispettore Forma `#panel-shape.panel` (`js/ui/controls.js:451-498`):
  - Sezioni: Look (swatches colore), Motion (slider spin, angle, size), Physics (slider bounciness), Circle gap (se cerchio: slider gap e gapAt), Sound (select nota).
  - Piede: bottoni `Duplicate` e `Delete` (`.btn.danger`).

### F. Stati dell'interfaccia
- **Riposo (Idle)**: tela vuota o con forme, simulazione ferma, Play in attesa.
- **In esecuzione (Running)**: simulazione attiva, palline rimbalzano, Play diventa Pause (`.running`).
- **Registrazione in corso (Recording)**: `#btn-rec.active.recording`, pallino rosso lampeggiante, timer `0:05` in esecuzione.
- **Pannello aperto**: `.panel.open`, `body.panel-open`.
- **Modale attiva**: `#modal` non nascosto, overlay con blur e sfondo schiarito, focus intrappolato.
- **Notifica attiva**: `#toast.show` (messaggio con pallino).
- **Trascina file (Drag over)**: `#drop-overlay` visibile sopra l'intera pagina con bordo tratteggiato.

---

## 2. Mappa dei Componenti (Ricetta Kit vs Componente NUOVO)

Tutti i valori provengono da `tokens.css`. Nessun colore o raggio inventato.

| Componente Bouncical | Ruolo | Ricetta Kit ScrollStudio | Derivazione (se NUOVO) / Note |
|---|---|---|---|
| **Parete di fondo** | Superficie base | `body` di `family.css` | Sfumatura dall'alto (`--wall-top` → `--wall-mid` → `--wall-bottom`), fissa. Grafite in tema scuro. |
| **Topbar cornice** | Navigazione e identità | `.ss-topbar` | Wordmark ScrollStudio doppio (`.ss-only-light`/`.ss-only-dark`) con link all'hub, barra `/`, avatar cerchio 22px (`assets/bouncical-logo.svg`) + `<span>Bouncical</span>`, nav con Undo/Redo e Muto, switch lingua `.ss-lang`, switch tema `.ss-theme`. |
| **Intestazione pagina** | Titolo e contesto | `.ss-head` | `h1.ss-head__title`: *Musica dalla fisica* (`--fs-xl` 300 centrato); `p.ss-head__lede`: *Crea i video virali delle palline che rimbalzano a tempo di musica, pronti per TikTok e Instagram.* (`--fs-sm` 400). Stesse identiche parole della card dell'hub. |
| **Layout editor principale** | Disposizione | `.ss-editor` | Sopra 860px: `.ss-panel` a sinistra + `.ss-stage` a destra. Sotto 860px: `.ss-stage` in alto + `.ss-panel` in basso. |
| **Anteprima Canvas** | Quadro appeso alla parete | `.ss-stage` > `.ss-frame` | Canvas 9:16 (o proporzione scelta) inserito in `.ss-frame`, con `--shadow-paper`, raggio 4px, luce chiara `--wall-glow` proiettata sulla parete dietro il quadro. Mai dentro un pannello. |
| **Barra comandi stage (sotto tela)** | Comandi di riproduzione tela | **NUOVO** `N5: .ss-stage-bar` | Derivato da `.ss-timeline__bar`. Allineato sotto il canvas: bottone Play/Pausa (`.ss-icon-btn` o `.ss-btn`), indicatore formato (`.ss-chip` pillola), pulsante registrazione rapida. Superficie trasparente o pillola di carta sulla parete. |
| **Pannello impostazioni** | Foglio comandi | `.ss-panel` | Carta `--paper`, angoli 4px, ombra `--shadow-panel`. Contiene sezioni richiudibili `details.ss-section`. |
| **Sezioni pannello** | Raggruppamento | `details.ss-section` | `summary` con freccia `.ss-section__chev` e corpo `.ss-section__body`. Le sezioni ospitano Strumenti, Scena, Regole, Musica, Mondo, Effetti, Forma, Registrazione. |
| **Pulsante Registra / Azione primaria** | Azione principale vista | `.ss-btn.ss-btn--primary` | **L'unica azione corallo della vista**. Pillola corallo (`--coral`), testo `--on-coral` (ink-900 per contrasto 5,4:1), ombra `--shadow-coral`. Quando registra, indicatore tempo. |
| **Pulsanti secondari** | Azioni secondarie | `.ss-btn`, `.ss-btn--sm`, `.ss-btn--block` | Pillola carta con testo `--ink-700` (hover `--ink-900`), profondità `--shadow-raise`. Per: Aggiungi regola, Carica file, Riavvia, ecc. |
| **Pulsanti icona** | Controlli grafici | `.ss-icon-btn` (`--bare`, `--coral`) | Cerchio carta o bare per chiusura pannelli/modali (✕), Undo/Redo, Playhead. |
| **Griglia strumenti disegno** | Selezione strumento attivo | **NUOVO** `N1: .ss-tool-grid` | Derivato da `.ss-segmented`. Griglia 4×2 di opzioni a pillola con icona SVG a tratto sottile 1px e testo. Stato attivo `--ink-900` con testo `--on-ink`, inattivo `--ink-700` su carta. |
| **Campi testo e textarea** | Input utente | `.ss-field` > `.ss-label` + `.ss-input` / `.ss-textarea` | Fondo incassato `--field`, angoli 4px, testo `--ink-900`, placeholder `--ink-500`. Focus viola `--focus`. |
| **Slider / Range** | Regolazione continua | `.ss-range` | Traccia incassata 2px, manopola cerchio `--knob`, aggiornamento `--p` da JS. Affiancato a `.ss-row__label` e output numerico tabular-nums. |
| **Interruttori On/Off** | Toggle booleani | `.ss-switch` | Traccia con manopola circolare `--knob`. Acceso: traccia `--ink-900`, manopola `--on-ink`. |
| **Scelte opzioni (2-4)** | Selettore segmentato | `.ss-segmented` > `.ss-segmented__option[aria-pressed]` | Per qualità effetti (Basso, Medio, Alto), modalità audio (Rimbalzi, Sottofondo), modo MIDI (Accordi, Melodia). |
| **Menu a tendina** | Scelta da elenco | `.ss-select` | Fondo `--field`, freccia data-URI `--chevron` (variante scura in dark mode), angoli 4px. |
| **Campioni colore** | Selezione colore | `.ss-swatch` e **NUOVO** `N3: .ss-swatches` | Campioni circolari con anello sottile `--swatch-ring`. Stato selezionato con anello interno di contrasto. |
| **Schede regole (Rules card)** | Elemento lista regola | **NUOVO** `N2: .ss-rule-card` | Derivato da `.ss-clip`. Carta `--paper`, angoli 4px, switch abilitazione, riepilogo in Urbanist, icone gestione bare. Quando aperta (`.is-open`), mostra l'editor WHEN / IF / THEN con campi nativi del kit. |
| **Griglia scene virali** | Elenco modelli | **NUOVO** `N4: .ss-scene-grid` | Derivato da `.ss-clip` e `.spec__paper`. Card di carta con icona, titolo e descrizione. |
| **Barra di avanzamento** | Progresso brano / export | `.ss-progress` (`--p`) | Traccia incassata 2px, riempimento inchiostro o corallo. |
| **Notifiche toast** | Feedback utente | `.ss-toast` | Carta fluttuante con ombra `--shadow-raise-hover`, testo `--ink-900`, pallino corallo se errore o grigio se informativo. |
| **Finestra modale** | Conferme e dialoghi | `.ss-overlay` > `.ss-modal` | Parete sfocata `--overlay`, carta `--shadow-paper`, titolo `--fs-lg` 300, corpo `--fs-sm`, azioni secondaria (Annulla) e primaria/distruttiva corallo (Pulisci / Elimina). Chiusura Esc e ✕. |
| **Area Drop file** | Caricamento audio/midi | `.ss-drop` | Bordo tratteggiato `--line-dashed`, icona freccia su, indicazione formati. |
| **Schermata Splash** | Ingresso e sblocco audio | **NUOVO** `N6: .ss-splash` | Ridisegnata come quadro fluttuante di carta al centro della parete: avatar Bouncical, titolo `--fs-xl`, sottotitolo, bottone corallo primario `.ss-btn.ss-btn--primary` "Inizia", chip modelli `.ss-btn.ss-btn--sm`. |

---

## 3. Dipendenze JS (Classi, ID e Attributi toccati)

Tutti i flussi e le funzioni restano intatti al 100%. Il JS viene aggiornato coerentemente senza rompere contratti interni.

| Elemento / Selettore JS | File JS chiamante | Trattamento nel Redesign |
|---|---|---|
| `#stage` e `#stage-wrap` | `js/main.js`, `js/stage.js`, `js/render.js` | **Invariati**. Inseriti dentro `.ss-frame` dentro `.ss-stage`. Il ResizeObserver in `stage.js` si adatterà automaticamente. |
| `#stage-hint` | `js/main.js` | **Invariato**. Stilizzato come badge / nota discreta appesa sul frame. |
| `#topbar`, `.bar`, `.grp` | `js/ui/controls.js` | Mantenuti o sostituiti con classi `.ss-topbar` e sottomoduli. Gli ID `#btn-undo`, `#btn-redo`, `#btn-format`, `#btn-scenes`, `#btn-rec`, `#rec-time` sono rigorosamente conservati. |
| `[data-tool="..."]` | `js/tools.js`, `js/ui/controls.js` | **Invariato**. Gli 8 bottoni mantengono l'attributo `data-tool` e lo stato `aria-pressed`. |
| `[data-panel="..."]` | `js/ui/controls.js`, `js/ui/panels.js` | **Invariato**. Gli attributi `data-panel` aprono la sezione corrispondente o il drawer/modal. |
| `#btn-play`, `#lbl-play` | `js/ui/controls.js` | **Invariati**. Gestiscono classe `.running`, `aria-pressed`, testo 'Play' / 'Pause'. |
| `#btn-clear`, `#btn-mute` | `js/ui/controls.js` | **Invariati**. Gestiscono click, stato audio, aria-pressed. |
| `#btn-format`, `#lbl-format`, `#format-menu` | `js/ui/controls.js` | **Invariati**. Menu formati stilizzato con token e ombre ScrollStudio. |
| `#panel-rules`, `#rules-body` | `js/ui/controls.js`, `js/rules/ui.js` | **Invariati**. `#rules-body` riceve il rendering del Rule Builder. |
| `#panel-world`, `#panel-fx`, `#panel-music`, `#panel-scenes`, `#panel-shape` | `js/ui/controls.js`, `js/ui/panels.js` | **Invariati**. Contengono i rispettivi `.panel-body` montati dinamicamente. |
| `#modal`, `.modal-card`, `.modal-title`, `.modal-body`, `.modal-actions` | `js/ui/dom.js` | **Invariati**. Aggiornato `dom.js` per usare le classi del kit `.ss-overlay`, `.ss-modal`, `.ss-modal__title`, `.ss-modal__body`, `.ss-modal__actions` garantendo piena retrocompatibilità. |
| `#toast` | `js/ui/dom.js` | **Invariato**. Stilizzato con token `.ss-toast`. |
| `#drop-overlay` | `js/ui/controls.js` | **Invariato**. Stilizzato con ricetta `.ss-drop`. |
| `#song-input` | `js/ui/controls.js` | **Invariato**. Input file invisibile. |
| `#splash`, `#splash-start`, `#splash-scenes`, `#splash-sub` | `js/main.js` | **Invariati**. ID mantenuti per il click d'avvio e la generazione dei template. |
| Controlli form generati in `js/ui/form.js` (`slider`, `toggle`, `select`, `segmented`, `swatches`, `numberInput`) | `js/ui/form.js` | Aggiornato `form.js` per emettere le classi CSS conformi al kit (`.ss-field`, `.ss-label`, `.ss-range`, `.ss-switch`, `.ss-select`, `.ss-segmented`, `.ss-swatch`). Le API esportate restano identiche. |
| Controlli generati in `js/rules/ui.js` | `js/rules/ui.js` | Aggiornato per generare le classi `.ss-rule-card`, `.ss-btn`, `.ss-icon-btn--bare`, `.ss-switch`. |

---

## 4. Tabella dei Testi (Italiano di Default / Inglese con `data-en`)

L'app diventa bilingue IT (default) + EN via `i18n.js` e attributi `data-en` (e dizionario dinamico per testi generati dal JS).

### A. Intestazione, Splash e Cornice

| Posizione / Contesto | Testo Italiano (Default) | Testo Inglese (`data-en` / Dict) |
|---|---|---|
| `<title>` | Bouncical — Musica dalla fisica | Bouncical — Physics Music Sandbox |
| `<meta description>` | Disegna forme, lancia palline, scrivi regole in italiano o inglese e lascia che la gravità componga musica. Registra video musicali virali. | Draw shapes, drop balls, write rules in plain English or Italian and let gravity compose music. Record viral physics-music videos. |
| Titolo pagina (`.ss-head__title`) | Musica dalla fisica | Physics music sandbox |
| Descrizione pagina (`.ss-head__lede`) | Crea i video virali delle palline che rimbalzano a tempo di musica, pronti per TikTok e Instagram. | Make those viral videos of balls bouncing to the beat, ready for TikTok and Instagram. |
| Splash: Sottotitolo | Disegna forme, lancia palline, scrivi regole — e lascia che la gravità componga la musica. | Draw shapes, drop balls, write rules — and let gravity compose the music. |
| Splash: Bottone avvio | ▶ Inizia | ▶ Start |
| Splash: Separatore | oppure apri una scena virale | or open a viral scene |
| Splash: Piede | 🔊 Attiva l'audio · funziona offline · nessuna registrazione | 🔊 Turn the sound on · works offline · no sign-up |
| Topbar: Undo | Annulla (Ctrl+Z) | Undo (Ctrl+Z) |
| Topbar: Redo | Ripeti (Ctrl+Shift+Z) | Redo (Ctrl+Shift+Z) |
| Topbar: Formato | Formato scena | Scene format |
| Topbar: Scene virali | Scene virali | Viral scenes |
| Topbar: Registra video | Registra video | Record video |
| Suggerimento tela | Tocca per far cadere una pallina · disegna forme · premi ▶ | Tap to drop a ball · draw shapes · press ▶ |
| Footer | © 2026 | © 2026 |

### B. Strumenti (Tools) e Controlli Stage

| Strumento / Controllo | Testo / Etichetta IT | Testo / Etichetta EN |
|---|---|---|
| Strumento Ball | Pallina | Ball |
| Tooltip Ball | Pallina — tocca per lanciare, trascina per mirare (1) | Ball — tap to drop, drag to launch (1) |
| Strumento Move | Sposta | Move |
| Tooltip Move | Sposta — trascina gli oggetti, tocca una forma per modificarla (2) | Move — drag things, tap a shape to edit it (2) |
| Strumento Line | Linea | Line |
| Tooltip Line | Linea — Shift blocca l'angolo (3) | Line — Shift snaps the angle (3) |
| Strumento Circle | Cerchio | Circle |
| Tooltip Circle | Cerchio (4) | Circle (4) |
| Strumento Triangle | Triangolo | Tri |
| Tooltip Triangle | Triangolo (5) | Triangle (5) |
| Strumento Rectangle | Rettangolo | Rect |
| Tooltip Rectangle | Rettangolo (6) | Rectangle (6) |
| Strumento Erase | Cancella | Erase |
| Tooltip Erase | Cancella — rimuovi oggetti interi (7) | Erase — remove whole objects (7) |
| Strumento Rubber | Gomma | Rubber |
| Tooltip Rubber | Gomma — ritaglia pezzi dalle forme (8) | Rubber — carve pieces out of shapes (8) |
| Controllo Play | Riproduci | Play |
| Controllo Pausa | Pausa | Pause |
| Controllo Clear | Pulisci | Clear |
| Tooltip Clear | Pulisci la scena (annullabile) | Clear the scene (undoable) |
| Controllo Audio | Audio | Sound |
| Tooltip Audio | Disattiva audio / Attiva audio | Mute / Unmute |

### C. Sezione Regole (Rules)

| Elemento Regole | Testo IT | Testo EN |
|---|---|---|
| Titolo sezione | Regole | Rules |
| Sottotitolo | QUANDO → SE → ALLORA · Italiano o inglese | WHEN → IF → THEN · English or Italian |
| Placeholder textarea | Descrivi una regola in italiano o inglese… es. "quando la pallina tocca il cerchio si ingrandisce del 10%" | Describe a rule in English or Italian… e.g. "when the ball hits a circle it grows 10%" |
| Bottone aggiungi | Aggiungi regola | Add rule |
| Bottone nuova regola | + Nuova regola | + New rule |
| Sommario esempi | Esempi | Examples |
| Conteggio regole | {n} regole / 1 regola / Nessuna regola ancora | {n} rules / 1 rule / No rules yet |
| Bottone elimina tutte | Elimina tutte | Delete all |
| Tag QUANDO | QUANDO | WHEN |
| Tag SE | SE | IF |
| Tag ALLORA | ALLORA | THEN |
| Condizione: Ogni | Ogni | Every |
| Unità volta/volte | volta / volte | time / times |
| Conteggio | Conteggio | Counted |
| Per pallina / Totale | per pallina / in totale | per ball / in total |
| Probabilità | Probabilità | Chance |
| Limite max volte | Volte massime (0 = ∞) | Max times (0 = ∞) |
| Tempo di attesa | Attesa | Cooldown |
| Condizione sempre | Sempre (nessuna condizione) | Always (no condition) |
| Aggiungi azione | + Aggiungi azione | + Add action |
| Sposta su | Sposta su | Move up |
| Duplica regola | Duplica | Duplicate |
| Elimina regola | Elimina regola | Delete rule |
| Rimuovi azione | Rimuovi azione | Remove action |
| Nota lista vuota | Le regole fanno reagire la scena: scrivi cosa deve succedere in italiano o inglese, tocca un esempio, o creane una con “+ Nuova regola”. | Rules make the scene react: type what should happen in plain English or Italian, tap an example, or build one with “+ New rule”. |

### D. Sezione Mondo (World)

| Voce Mondo | Testo IT | Testo EN |
|---|---|---|
| Titolo sezione | Mondo | World |
| Sottotitolo | Fisica della scena | Physics of the scene |
| Sezione Gravità | Gravità | Gravity |
| Forza gravità | Forza | Strength |
| Direzione gravità | Direzione | Direction |
| Gravità spenta | Spenta | Off |
| Sezione Tempo | Tempo | Time |
| Velocità tempo | Velocità tempo | Time speed |
| Sezione Palline | Palline | Balls |
| Dimensione | Dimensione | Size |
| Variazione dimensione | Variazione dimensione | Size variation |
| Rimbalzo | Rimbalzo | Bounciness |
| Attrito | Attrito | Friction |
| Resistenza dell'aria | Resistenza aria | Air resistance |
| Velocità massima | Velocità massima | Max speed |
| Colore palline | Colore | Color |
| Colore casuale / sequenza | Casuale / Sequenza arcobaleno | Random / Rainbow sequence |
| Cambio colore al tocco | Cambia colore a ogni colpo | Shift color on every hit |
| Collisione tra palline | Collisione tra palline | Balls collide with each other |
| Massimo palline | Massimo palline | Max balls |
| Sezione Bordi | Bordi | Borders |
| Parete sinistra | Parete sinistra | Left wall |
| Parete destra | Parete destra | Right wall |
| Pavimento | Pavimento | Floor |
| Soffitto | Soffitto | Ceiling |
| Reset impostazioni | Ripristina predefiniti | Reset to defaults |

### E. Sezione Effetti (FX)

| Voce Effetti | Testo IT | Testo EN |
|---|---|---|
| Titolo sezione | Effetti | Effects |
| Sottotitolo | Particelle, scie, bagliore | Particles, trails, glow |
| Sezione Qualità | Qualità | Quality |
| Livello dettaglio | Dettaglio | Detail |
| Opzioni dettaglio | Basso / Medio / Alto | Low / Medium / High |
| Nota qualità | Riduci su telefoni più vecchi. Le particelle scalano automaticamente quando calano i frame. | Lower it on older phones. Particles also scale down automatically when frames get slow. |
| Sezione Particelle | Particelle | Particles |
| Scintille ed esplosioni | Scintille ed esplosioni all'impatto | Impact sparks & bursts |
| Quantità particelle | Quantità | Amount |
| Onde d'urto | Onde d'urto sui colpi forti | Shockwave rings on hard hits |
| Scie palline | Scie | Trails |
| Lunghezza scia | Lunghezza scia | Trail length |
| Bagliore neon | Bagliore neon | Neon glow |
| Sezione Scena | Scena | Scene |
| Luce forme all'impatto | Le forme si illuminano al colpo | Shapes light up when hit |
| Scuotimento schermo | Scuotimento schermo | Screen shake |
| Intensità scuotimento | Intensità scuotimento | Shake strength |
| Pulsazione sfondo | Sfondo pulsa con le note | Background pulses with notes |
| Mostra nomi note | Mostra nomi delle note | Show note names |
| Filigrana logo | Filigrana logo | Logo watermark |

### F. Sezione Musica (Music)

| Voce Musica | Testo IT | Testo EN |
|---|---|---|
| Titolo sezione | Musica | Music |
| Sottotitolo | Brano, scala e strumento | Song, scale and instrument |
| Sezione Trova brano | Trova un brano | Find a song |
| Placeholder cerca | Incolla un link Spotify, YouTube, Apple Music o Deezer, o scrivi il titolo | Paste a Spotify, YouTube, Apple Music or Deezer link, or type a song |
| Bottone cerca | Cerca / Ricerca in corso… | Search / Searching… |
| Nota anteprima | Carica l'anteprima ufficiale di 30 secondi da Apple Music o Deezer; i link di Spotify e YouTube servono per riconoscere il brano. Le anteprime sono a scopo promozionale: sei responsabile dei diritti per i video che pubblichi. | Loads the official 30-second preview from Apple Music or Deezer; Spotify and YouTube links are used to recognize the song. Previews are meant for promotion: you are responsible for the rights to videos you publish. |
| Sezione Brano | Brano | Song |
| Brano assente | Nessun brano caricato — i rimbalzi suonano la scala qui sotto. | No song loaded — bounces play the scale below. |
| Istruzioni brano proprio | Trova un brano sopra, oppure carica un file tuo: MIDI (ogni rimbalzo suona l'accordo successivo) o MP3/M4A/WAV (ogni rimbalzo suona la frazione successiva della traccia). Puoi anche trascinare un file sulla pagina. | Find a song above, or load your own file: MIDI (each bounce plays the next chord) or MP3/M4A/WAV (each bounce plays the next slice of the track). You can also drop a file on the page. |
| Carica file | Carica file… | Load file… |
| Riavvia brano | Riavvia | Restart |
| Rimuovi brano | Rimuovi | Remove |
| Traccia MIDI | Traccia | Track |
| Modalità MIDI | Riproduci (Accordi / Solo melodia) | Play (Chords / Melody only) |
| Trasposizione | Trasponi | Transpose |
| Modalità Audio | Modalità (Suona sui rimbalzi / Sottofondo) | Mode (Plays on bounces / Background) |
| Frazione rimbalzo | Frazione per rimbalzo | Slice per bounce |
| Ripeti brano | Ripeti brano | Loop song |
| Sezione Suono | Suono | Sound |
| Strumento | Strumento | Instrument |
| Scala | Scala | Scale |
| Nota fondamentale | Nota fondamentale | Root note |
| Ottava | Ottava | Octave |
| Evento note | Le note suonano su | Notes play on |
| Opzioni evento note | Colpi sulle forme / Forme + pareti / Ogni collisione / Solo regole "suona una nota" | Hits on shapes / Shapes + walls / Every collision / Only “play a note” rules |
| Impatto minimo nota | Impatto minimo per una nota | Min impact for a note |
| Volume | Volume | Volume |
| Riverbero | Riverbero | Reverb |

### G. Sezione Scene Virali (Viral Scenes)

| Scena Virale | Nome e Descrizione IT | Name and Description EN |
|---|---|---|
| Intestazione | Scene virali — Carica un modello | Viral scenes — Load a template |
| Nota introduttiva | Configurazioni virali pronte. Sono costruite con forme + regole, quindi puoi aprire Regole e modificare tutto. | Ready-made viral setups. They are built with shapes + rules, so you can open Rules and tweak everything. |
| Scena 1: Growing Ball | **Pallina che cresce** · Una pallina rimbalza dentro un cerchio e cresce a ogni colpo. Quanto riuscirà a diventare grande? | **Growing Ball** · One ball bounces inside a circle and grows with every hit. How big can it get? |
| Scena 2: Ring Escape | **Fuga dal cerchio** · Quattro cerchi concentrici con fessure che girano. Ogni pallina che fugge rompe il suo cerchio e ne libera altre due. | **Ring Escape** · Four spinning rings with gaps. Every ball that escapes shatters its ring and releases two more. |
| Scena 3: Note Rain | **Pioggia di note** · Palline cadono attraverso un reticolo di pioli suonando una melodia pentatonica. I pioli brillano del colore dell'ultima pallina. | **Note Rain** · Balls rain through a field of pegs and play a pentatonic melody. Pegs glow in the color of the last ball. |
| Scena 4: String Art | **String art** · Gravità zero. Ogni rimbalzo disegna un filo luminoso dal punto d'impatto alla pallina. | **String Art** · Zero gravity. Every bounce ties a glowing string from the hit point to the ball. |
| Scena 5: Split Frenzy | **Frenesia moltiplicatrice** · Palline veloci che rimbalzano sui triangoli. Ogni tocco genera 2 nuove palline fino a scatenare il caos totale. | **Split Frenzy** · Fast balls bouncing on triangles. Every hit spawns 2 new balls until pure chaos breaks out. |
| Scena 6: Shrinking Arena | **Arena che si restringe** · Una pallina rimbalza all'interno di un'arena circolare che si restringe gradualmente a ogni impatto. | **Shrinking Arena** · One ball bounces inside a circular arena that shrinks with each hit. |

### H. Ispettore Forma (Shape Inspector)

| Voce Forma | Testo IT | Testo EN |
|---|---|---|
| Titolo | Forma selezionata | Selected shape |
| Sezione Aspetto | Aspetto | Look |
| Colore forma | Colore | Color |
| Sezione Movimento | Movimento | Motion |
| Rotazione continua | Rotazione | Spin |
| Angolo iniziale | Angolo | Angle |
| Dimensione forma | Dimensione | Size |
| Sezione Fisica | Fisica | Physics |
| Rimbalzo forma | Rimbalzo | Bounciness |
| Sezione Varco cerchio | Varco cerchio | Circle gap |
| Ampiezza varco | Ampiezza varco | Gap size |
| Posizione varco | Posizione varco | Gap position |
| Varco chiuso | chiuso | closed |
| Sezione Suono | Suono | Sound |
| Nota assegnata | Nota | Note |
| Nota automatica | Auto (in base all'altezza) | Auto (by height) |
| Bottone duplica | Duplica | Duplicate |
| Bottone elimina | Elimina | Delete |

### I. Dialoghi Modali e Notifiche Toast

| Dialogo / Notifica | Testo IT | Testo EN |
|---|---|---|
| Dialogo Pulisci scena | **Pulisci la scena?** · Tutte le forme, le palline e le regole verranno rimosse dal canvas. [Annulla] [Pulisci] | **Clear scene?** · All shapes, balls and rules will be removed from the canvas. [Cancel] [Clear] |
| Dialogo Carica scena | **Caricare “{nome}”?** · Questo sostituirà la scena attuale, le sue regole e le impostazioni di Mondo/FX/Musica. [Annulla] [Carica scena] | **Load “{name}”?** · This replaces the current scene, its rules and the World/FX/Music settings. [Cancel] [Load scene] |
| Dialogo Elimina regole | **Eliminare tutte le regole?** · Questo rimuoverà ogni regola dall'elenco. [Annulla] [Elimina tutte] | **Delete all rules?** · This removes every rule from the list. [Cancel] [Delete all] |
| Drag & Drop file overlay | Trascina un file MIDI o audio per usarlo come brano | Drop a MIDI or audio file to use it as the song |
| Toast scena reimpostata | Scena reimpostata | Scene reset |
| Toast scena pulita | Scena pulita — Annulla la ripristina | Scene cleared — Undo brings it back |
| Toast formato ricentrato | Formato {formato} — scena ricentrata | Format {format} — scene re-centered |
| Toast scena vuota | Scena vuota pronta | Empty scene ready |
| Toast scena caricata | {nome} caricata — premi Play | {name} loaded — press Play |
| Toast caricamento brano | Caricamento di “{titolo}”… | Loading “{title}”… |
| Toast brano pronto | ♪ {titolo}: anteprima di 30 s pronta — suona quando le palline rimbalzano | ♪ {title}: 30 s preview ready — it plays as the balls bounce |
| Toast brano streaming | ♪ {titolo} caricato — suona dal vivo, ma questo browser non può includerlo nelle registrazioni | ♪ {title} loaded — it plays live, but this browser can’t add it to recordings |
| Toast errore brano | Impossibile riprodurre questa anteprima. | This preview couldn’t be played. |
| Toast brano rimosso | Brano rimosso — si torna alla scala | Song removed — back to the scale |
| Toast regola aggiunta | Nuova regola aggiunta — modificala qui sotto. | New rule added — edit it below. |

---

## 5. Rischi Identificati e Domande per l'Utente

### Rischi e Soluzioni Tecniche:
1. **Dimensionamento dinamico del Canvas (`stage.js`)**:
   - *Rischio*: Inserendo il canvas dentro la struttura `.ss-editor > .ss-stage > .ss-frame`, le dimensioni calcolate da `stage.wrap.getBoundingClientRect()` potrebbero risentire di altezze fluide o overflow.
   - *Soluzione*: Mantenere `#stage-wrap` come flex container interno al frame con `width: 100%; height: 100%`, esattamente vincolato al rapporto d'aspetto (`aspect-ratio: 9/16` o secondo `--aspect`). In questo modo `ResizeObserver` mantiene la stessa precisione e le coordinate mouse/touch restano identiche al pixel.
2. **Posizionamento degli Strumenti di Disegno (Tools)**:
   - *Rischio*: Nel layout originale i tools stavano su una barra a sinistra sul desktop e in basso sul mobile. Nel design kit di ScrollStudio (`specimen.html`), tutti i comandi sono raggruppati in `.ss-panel` con sezioni `details.ss-section`.
   - *Soluzione*: Gli strumenti di disegno vengono inseriti come prima sezione aperta del `.ss-panel` ("Strumenti" / "Tools") in una griglia compatta (`.ss-tool-grid`), mantenendo gli stessi `data-tool` e scorciatoie da tastiera (1-8).
3. **Pulsante di Registrazione Video (`#btn-rec`)**:
   - *Regola del kit*: Una sola azione corallo per vista.
   - *Applicazione*: In Bouncical l'azione di esportazione/pubblicazione finale è **Registra video** (creazione del video da pubblicare su TikTok/Reels). Questo diventa l'unico bottone `.ss-btn.ss-btn--primary` visibile in fondo al pannello (sezione "Esporta e Registra") o in evidenza sulla barra stage. Durante la registrazione, si trasforma mostrando il tempo in corso (`0:05`) e l'azione per fermare e salvare il video.
4. **Schermata Splash**:
   - *Rischio*: La splash originale copriva l'intero schermo scuro (`#05050b`).
   - *Soluzione*: La splash viene trasformata in un quadro di carta fluttuante (`--paper`, `--shadow-paper`) centrato sulla parete della galleria ScrollStudio. Scompare morbidamente con fade (`--dur-open` 360ms) al click su "Inizia" o su una delle scene virali, preservando lo sblocco del contesto audio Tone.js al primo tocco.

### Domande per te prima di procedere:
1. **Disposizione degli strumenti di disegno**: preferisci che gli 8 strumenti di disegno (Pallina, Sposta, Linea, Cerchio, Triangolo, Rettangolo, Cancella, Gomma) stiano:
   - **Opzione A (Consigliata, fedele a specimen.html)**: dentro il pannello sinistro `.ss-panel` come sezione richiudibile `details.ss-section` con una griglia compatta `.ss-tool-grid`?
   - **Opzione B**: come barra orizzontale di pillole di carta appoggiata sulla parete subito sopra o sotto il quadro del canvas (`.ss-stage`)?
2. **Pulsante Corallo Principale**: confermi che l'azione primaria a cui riservare il colore corallo sia il tasto **Registra video** (`#btn-rec` / *Esporta MP4*)?
3. **Traduzione dei testi**: ti sembrano coerenti e naturali le traduzioni proposte nella tabella sopra (con terminologia musicale e fisica in italiano, e l'inglese in `data-en`)?
