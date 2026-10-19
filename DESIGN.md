# Bouncical — Design System

Bouncical è una stanza della famiglia **ScrollStudio**: ne condivide la parete, la luce, la tipografia e la filosofia visiva.
Tutti i token cromatici, dimensionali e tipografici provengono da [`css/tokens.css`](css/tokens.css); i componenti base della famiglia sono in [`css/family.css`](css/family.css); le estensioni specifiche dell'applicazione sono in [`style.css`](style.css).

---

## 1. Principi di design

- **La stanza di ScrollStudio.** L'applicazione vive sulla stessa parete grigio chiaro (`--wall-top` → `--wall-bottom`) con illuminazione diffusa dall'alto (`--wall-light`).
- **Il quadro appeso.** L'anteprima interattiva è un quadro (`.ss-frame`) con angoli smussati (`--radius: 4px`) e ombra profonda (`--shadow-paper`), illuminato dal bagliore radiale della parete (`--wall-glow`).
- **Silenzio cromatico.** L'interfaccia è quasi monocromatica (inchiostri `--ink-900`, `--ink-700`, `--ink-500` su carta `--paper` e campo incassato `--field`). Il colore vivace appartiene esclusivamente al contenuto (forme fisiche, palline, particelle, cover musicali).
- **Unico accento corallo.** Come nell'hub il corallo (`--coral`) è riservato al solo tasto `+`, in Bouncical è strettamente riservato all'azione primaria di esportazione (`#btn-rec` / *Registra video*) e ai bottoni di conferma nelle modali. Tutti gli altri comandi primari nei form usano `--ink-900` con testo `--on-ink`.
- **Tipografia sottile.** Urbanist (Google Fonts) nei soli pesi **300** (titoli) e **400** (testo e controlli), mai grassetto, mai pesi ≥ 500.

---

## 2. Palette e Token di ruolo

I valori cromatici sono definiti unicamente in `css/tokens.css` e commutano automaticamente con il tema chiaro e scuro.

| Ruolo / Token | Chiaro | Scuro | Utilizzo |
|---|---|---|---|
| `--wall-top` → `--wall-bottom` | `#E9E9E8` → `#D7D6D5` | `#2C2C2B` → `#181817` | Gradiente di sfondo della stanza |
| `--wall-glow` | `rgb(250 250 250 / 0.85)` | `rgb(255 255 255 / 0.05)` | Luce sulla parete dietro al quadro |
| `--paper` | `#FBFBFA` | `#1C1C1D` | Fondo pannello, card aperte, toast, modali |
| `--field` | `#E9E9E8` | `#2C2C2B` | Superfici incassate (input, tasti idle, card regole) |
| `--ink-900` | `#2B2B2D` | `#FBFBFA` | Titoli, valori, stato attivo dei tasti |
| `--ink-700` | `#48484B` | `#C5C2BC` | Testi, etichette dei campi, controlli a riposo |
| `--ink-500` | `#66666A` | `#8E8B85` | Placeholder, descrizioni secondarie, icone ausiliarie |
| `--coral` | `#FD767E` | `#FD767E` | Unica azione primaria: Registra video ed Export |
| `--on-coral` | `#2B2B2D` | `#2B2B2D` | Testo su bottone corallo (contrasto 5,4:1) |
| `--on-ink` | `var(--paper)` | `var(--paper)` | Testo e icone su superfici piene di `--ink-900` |
| `--focus` | `#8E5EEA` | `#8E5EEA` | Anello di focus accessibile |

---

## 3. Struttura e Layout

L'editor (`.ss-editor` = `.ss-head` + `.ss-panel.ss-editor__make` + `.ss-stage` + `.ss-panel.ss-editor__finish`, regola **N17** in coda a `css/family.css`) mette l'anteprima al centro su ogni formato: l'anteprima è quello che si guarda, quindi prende l'altezza della finestra e i comandi le stanno accanto, alla sua scala. L'ordine nel DOM segue l'ordine visivo su desktop (il Tab va da sinistra a destra).

| Formato | Disposizione |
|---|---|
| Telefono (< 700px) | titolo, poi l'anteprima che riempie il resto della prima schermata (barra Play compresa), poi i due fogli |
| ≥ 700px e tablet verticali | come sopra, con i due fogli affiancati sotto lo stage |
| Orizzontale ≥ 861px | titolo + foglio "make" \| stage (2 colonne) |
| Orizzontale ≥ 1200px | titolo + foglio "make" \| stage \| foglio "finish" (3 colonne, gruppo centrato) |

- **Topbar (`.ss-topbar`)**: Wordmark ScrollStudio con link hub, separatore a 16°, avatar con logo Bouncical, controlli rapidi (undo/redo/mute), switch lingua IT/EN e switch tema. Sotto 640px va a capo su due righe mantenendo fruibili tutti i comandi.
- **Titolo (`.ss-head`)**: primo figlio di `.ss-editor`. Centrato su telefono e tablet; da 861px in orizzontale è allineato a sinistra in cima alla colonna "make", senza padding, così lo stage parte subito sotto la topbar.
- **Foglio "make" (`.ss-editor__make`, "Scena e strumenti")**: cosa costruisci sulla scena — Strumenti · Forma selezionata (compare quando tocchi una forma) · Scena e formato.
- **Stage (`.ss-stage`)**: quadro `.ss-frame` largo `(100svh − --stage-chrome) × --frame-ratio`. La forma segue il formato della scena (9:16, 1:1, 16:9): `js/stage.js` scrive `--frame-ratio` (larghezza/altezza) e `data-aspect` su `.ss-editor`; con *Fit* il quadro riempie tutta la colonna dello stage e l'altezza rimasta. Con un formato orizzontale la colonna (`minmax(0, …)`) si stringe e l'altezza segue l'aspect-ratio. Sotto il quadro la barra `.ss-stage-bar` (Play), larga quanto il quadro. Da 861px in orizzontale lo stage è `sticky`: i fogli scorrono, l'anteprima resta lì. Il canvas segue il quadro (ResizeObserver su `#stage-wrap`, `devicePixelRatio` fino a `stage.maxDpr`).
- **Foglio "finish" (`.ss-editor__finish`, "Impostazioni")**: scene pronte, come si comporta, come suona, cosa esce — Scene virali · Regole · Mondo (Fisica) · Musica · Effetti (FX) · Registra ed esporta (sempre l'ultima).
- **`--stage-chrome`**: tutto quello che divide l'altezza della finestra con il quadro (topbar, titolo su telefono e tablet, gap, barra Play e 16px di margine sotto). Misurato: 255px su telefono (topbar su due righe), 234px da 700px, `132px × --k` in orizzontale da 861px.
- **Scala `--k`** (`css/tokens.css`): `min(larghezza/1440, altezza/900)` arrotondato all'ottavo, da 1 a 2.25, solo in orizzontale; telefoni e tablet restano a 1. Con `zoom: var(--k)` crescono topbar, titolo, fogli, barra Play, suggerimento sul quadro, modali, menu formato, toast, riquadro di rilascio file e footer; le colonne dei fogli sono `--panel-w × --k`. Lo stage, il quadro e il canvas non si zoomano (lo zoom scala anche `vw`/`svh`): il quadro è calcolato su `100svh`. È lo stesso principio della "u" dell'hub.
- **Footer (`.ss-footer`)**: Wordmark ScrollStudio e copyright 2026.

---

## 4. Componenti e Ricette

### Aggiunte alla famiglia (in coda a `css/family.css` e `css/tokens.css`)

| # | Componente | Ruolo | Affine a | Dove |
|---|---|---|---|---|
| N17 | `.ss-editor` con l'anteprima al centro (`--k`, `--stage-chrome`, `--frame-ratio`, `.ss-editor__make` / `__finish`) — sostituisce N16 | l'anteprima prende l'altezza della finestra e la forma del formato della scena; i comandi le stanno accanto e su schermi orizzontali grandi crescono con `zoom: var(--k)` | `.ss-editor` | Editor, tutti i formati |

### Strumenti di disegno (`.ss-tool-grid`, `.ss-tool-btn`)
- Griglia 4×2 posizionata nella prima sezione del pannello.
- Tasti quadrati/rettangolari arrotondati (`--radius: 4px`), sfondo `--field`, icona 16px centrata e micro-etichetta in basso.
- Stato attivo (`aria-pressed="true"`): sfondo pieno `--ink-900`, colore `--on-ink`, ombra `--shadow-raise`.

### Controlli modulo
- **Slider (`.range`)**: Traccia da 2px, riempimento live `--ink-900`, manopola tonda `--knob` con ombra morbida.
- **Switch (`.switch`)**: Traccia `--track` con manopola `--knob`; attivo con traccia `--ink-900` e manopola `--on-ink`.
- **Select (`.fselect`)**: Incassato in `--field`, chevron SVG da token (`--chevron`), senza bordi netti.
- **Segmented (`.seg`, `.seg-btn`)**: Pillola incassata con l'opzione selezionata sollevata su `--paper` con `--shadow-raise`.
- **Palette colori (`.swatches`, `.swatch`)**: Cerchietti con anello sottile `--swatch-ring`, selezione con doppio anello.

### Regole e Card
- **Editor regole (`.rule-compose`)**: Textarea incassata con focus ring `--focus`. Bottone "Aggiungi regola" in `--ink-900` per non rubare il corallo all'export.
- **Card regola (`.rule-card`)**: Fondo `--field`, switch a sinistra per abilitare/disabilitare, riassunto testuale al centro, tasti miniatura a destra.
- **Card scene virali (`.scene-card`)**: Griglia a 2 colonne, emoji distintiva, titolo in `--ink-900` e descrizione breve in `--ink-500`.

### Modali, Toast e Overlay
- **Modale (`.ss-overlay`, `.ss-modal`)**: Sfondo sfocato `--overlay`, foglio di carta sollevato con ombra `--shadow-paper`, chiusura in alto a destra, bottone primario di conferma in corallo.
- **Toast (`.ss-toast`)**: Pillola sollevata al centro schermo con animazione `ss-rise`, nascosta automaticamente se vuota o inattiva.
- **Drop Overlay (`.ss-drop-overlay`)**: Schermata semitrasparente attivata al trascinamento di file audio/MIDI con riquadro tratteggiato `.ss-drop`.

---

## 5. Bilinguismo e Temi

- **Lingue**: Italiano (default) e Inglese. Gestite da `js/i18n.js` tramite attributi `data-en`, `data-en-title`, `data-en-aria-label` e persistenza in `localStorage['scrollstudio-lang']`.
- **Temi**: Chiaro (default) e Scuro. Gestiti da `js/theme.js` tramite attributo `data-theme` su `<html>` e persistenza condivisa in `localStorage['scrollstudio-theme']`.
