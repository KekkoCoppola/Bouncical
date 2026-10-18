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

Il layout editor (`.ss-editor`) si adatta fluidamente alla risoluzione dello schermo:

### Desktop (≥ 861px)
- **Topbar (`.ss-topbar`)**: Wordmark ScrollStudio con link hub, separatore a 16°, avatar con logo Bouncical, controlli rapidi (undo/redo/mute), switch lingua IT/EN e switch tema.
- **Titolo (`.ss-head`)**: Titolo centrato `Musica dalla fisica` in peso 300 con sottotitolo bilanciato.
- **Due colonne centrate (`.ss-editor`, regola N16)**:
  - Layout centrato sull'asse del titolo (`justify-content: center`): pannello e quadro formano un blocco compatto senza vuoti vuoti intermedi.
  - A sinistra: pannello impostazioni `.ss-panel` (`--panel-w: 340px`) a fisarmonica (`details.ss-section`).
  - A destra: quadro sticky `.ss-stage` con `.ss-frame` (340px in 9:16 per bilanciare la larghezza del pannello), canvas Matter.js e barra playback `.ss-stage-bar` sotto il quadro.
  - Bottoni secondari in inchiostro (`--ink-900` con testo `--on-ink`), riservando l'unico accento corallo all'azione di registrazione video.
- **Footer (`.ss-footer`)**: Wordmark ScrollStudio e copyright 2026.

### Mobile (≤ 860px)
- Lo stage `.ss-stage` si sposta in alto (`order: -1`) per dare immediata visibilità visiva e interattiva alla simulazione.
- Il pannello comandi `.ss-panel` segue sotto a tutta larghezza, scorrevole naturalmente con la pagina.
- La topbar va a capo su due righe mantenendo fruibili tutti i comandi.

---

## 4. Componenti e Ricette

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
