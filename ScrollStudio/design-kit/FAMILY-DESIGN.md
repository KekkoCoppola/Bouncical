# ScrollStudio — Design di famiglia

Regole per ridisegnare le app figlie di ScrollStudio (Bouncical, TopFratmRanks, i prossimi tool), così che sembrino stanze della stessa casa dell'hub.

## Fonte di verità e precedenza

1. `tokens.css`, `family.css`, `i18n.js`, `theme.js`: codice da copiare **così com'è** nell'app. Valori, nomi e ricette vengono da qui, non da stime. La versione del kit è nel commento in testa a `tokens.css` e `family.css`; cosa cambia fra una versione e l'altra è in `CHANGELOG.md`.
2. Questo file: regole, ruoli e procedura per i componenti che il kit non ha ancora.
3. `specimen.html` e `reference/*.jpg`: come deve apparire il risultato. In caso di dubbio, si confronta con le immagini (sono tutte nel tema chiaro; lo specimen ha lo switch per vedere lo scuro).
4. `HUB-DESIGN.md` (copia del `DESIGN.md` dell'hub, la crea la procedura in `README.md`): da dove nasce tutto (la GIF di riferimento, la stanza, le misure).

Il kit vince su qualunque altra guida di design: skill, preset, gusti dell'agente, "best practice" generiche. Se una regola qui sembra sbagliata, si chiede all'utente, non la si aggira.

## Principi (dall'hub)

- **Galleria in una stanza.** La pagina è una parete grigio chiaro (`--wall-*`; grafite nel tema scuro, vedi "Temi"). Ciò che si guarda (l'anteprima del video) è un quadro appeso alla parete: carta, angoli 4px, ombra larga verso il basso, luce chiara dietro. I comandi stanno su fogli di carta (`--paper`) appoggiati sulla parete.
- **Silenzio cromatico.** L'interfaccia è monocroma: inchiostri grigi su carta e parete. Il colore arriva solo dal contenuto (video, miniature, colori scelti dall'utente) e dal **corallo**, riservato all'unica azione principale della vista (Esporta, Crea, Pubblica) e al pallino degli errori.
- **Testo sottile e piccolo.** Urbanist 300 per titoli, nomi e numeri grandi; 400 per il resto. Mai grassetto: si mette in evidenza con dimensione e inchiostro (`--ink-900` contro `--ink-700`), non con il peso.
- **Profondità morbida.** Niente bordi intorno ai blocchi: la separazione la danno ombra e spazio. Le linee sottili (`--hairline`, `--track`) servono solo per dividere sezioni e per le tracce (slider, timeline, progress).
- **Forme con un significato.** Pillola = qualcosa che si preme. 4px = superfici e media. Cerchio = icone, avatar, manopole. Nessun altro raggio.
- **Movimento misurato.** Ciò che cambia stato si apre con `--ease-open` in 360ms. Ciò che viaggia scorre con `--ease-glide` in 600ms. L'hover è 400ms `ease-out`. Niente rimbalzi, molle o effetti elastici.

## Identità di famiglia (obbligatoria in ogni app)

| Elemento | Ricetta | Note |
|---|---|---|
| Parete | `body` di `family.css` | sfumatura dall'alto, fissa |
| Topbar | `.ss-topbar`: wordmark ScrollStudio (link all'hub) · barra obliqua · avatar + nome del prodotto · nav · switch lingua · switch tema | il wordmark non scende sotto i 30px di altezza; è un `<img>` doppio, uno per tema (vedi "Temi") |
| Titolo della pagina | `.ss-head`: titolo `--fs-xl` 300 centrato, descrizione `--fs-sm` | stesse parole della card del prodotto nell'hub |
| Anteprima | `.ss-stage` + `.ss-frame` 9:16 appeso alla parete | mai dentro un pannello |
| Lingue | `.ss-lang`, italiano di default, inglese con `data-en` | stesso meccanismo dell'hub, vedi sotto |
| Tema | `.ss-theme`, chiaro o scuro, di default quello del sistema | stesso meccanismo dell'hub, vedi "Temi" |
| Footer | `.ss-footer`: wordmark piccolo (doppio, uno per tema) + © | |
| Avatar del prodotto | il logo della card dell'hub (cerchio, anello sottile) | in topbar e come favicon del tool |

## Token

Tutti in `tokens.css`, nessun valore scritto a mano nei componenti. I colori hanno un valore per tema (vedi "Temi"); tipo, spazi, raggi e movimento sono uguali nei due temi.

| Gruppo | Token |
|---|---|
| Parete | `--wall-top` `--wall-mid` `--wall-bottom` `--wall-light` `--wall-glow` |
| Superfici | `--paper` (alias `--card`), `--field` (campi e tracce incassati), `--video-ink` |
| Inchiostri | `--ink-900` titoli/valori/attivo · `--ink-700` testo/etichette · `--ink-500` placeholder, durate, maniglie · `--hairline` · `--track` |
| Accento | `--coral`, `--on-coral` (testo su corallo = ink-900, 5,4:1), `--on-coral-icon` (solo il glifo "+" bianco dell'hub) |
| Focus | `--focus` (viola): anello di 2px, scostato di 4px (2px sui campi) |
| Ruoli | `--on-ink` testo e icone su `--ink-900` pieno · `--knob` manopole · `--overlay` fondo della modale · `--stage-glow-end` coda della luce dietro lo stage · `--line-dashed` bordo di `.ss-drop` · `--swatch-ring` anello degli swatch · `--chevron`, `--check-mark` icone in data-URI |
| Profondità | `--shadow-raise` pillole e righe · `--shadow-panel` pannelli · `--shadow-paper` quadro e modale · `--shadow-coral` azione principale |
| Tipo | `--fs-xs` 11 · `--fs-sm` 13 · `--fs-md` 16 · `--fs-lg` 22 · `--fs-xl` 28 (22 su telefono) |
| Forma | `--radius` 4 · `--radius-sm` 2 · `--radius-pill` |
| Spazio | griglia di 4px: `--s-1`…`--s-7`, `--gutter` (45u dell'hub) |
| Movimento | `--ease-open` `--ease-glide`, `--dur-open` 360 · `--dur-glide` 600 · `--dur-fade` 200 · `--dur-hover` 400 |

`--ink-500` qui è `#66666A`, più scuro del `#76767A` dell'hub, per passare il contrasto AA su carta e campi.

## Tipografia

| Ruolo | Taglia | Peso | Inchiostro |
|---|---|---|---|
| Titolo pagina | `--fs-xl` | 300 | 900 |
| Titolo pannello, modale, numero grande (rank, %) | `--fs-lg` | 300 | 900 |
| Titolo sezione, nome prodotto | `--fs-md` | 300 | 900 |
| Testo, comandi, nomi in lista | `--fs-sm` | 400 | 700 (nomi 900) |
| Etichette, meta, tempi, badge | `--fs-xs` | 400 | 700 / 500 |

Numeri che cambiano (tempi, percentuali, durate): `font-variant-numeric: tabular-nums`. Niente maiuscoletto né testo tutto maiuscolo.

## Componenti del kit

| Ruolo | Classe | Quando |
|---|---|---|
| Azione principale | `.ss-btn.ss-btn--primary` | **una sola per vista**: Esporta, Crea, Conferma nella modale |
| Azione secondaria | `.ss-btn` (`--sm`, `--block`) | Mescola, Aggiungi, Annulla, Pubblica |
| Azione distruttiva | `.ss-link` ("Elimina") + modale di conferma | mai un bottone rosso |
| Icona | `.ss-icon-btn` (carta), `--coral` (il "+" dell'hub), `--bare` (chiudi, minori) | sempre con `aria-label` |
| Link / tab | `.ss-link` (`aria-current`, `aria-selected`) | sottolineatura che si disegna da sinistra |
| Campo | `.ss-field` > `.ss-label` + `.ss-input` / `.ss-select` / `.ss-textarea`, `.ss-hint` | |
| Numero | `.ss-input.ss-input--num` | |
| Colore | `.ss-swatch` (`input type=color`) | |
| Riga impostazione | `.ss-row` > `.ss-row__label` + controllo | |
| Interruttore | `.ss-switch` (`input type=checkbox`) | on/off; manopola `--knob`, da acceso `--on-ink` |
| Scelta tra 2–4 | `.ss-segmented` > `.ss-segmented__option[aria-pressed]` | stile, velocità, formato |
| Slider | `.ss-range` (aggiornare `--p` da JS) | |
| Pannello | `.ss-panel` > `details.ss-section` (summary + `.ss-section__body`) | impostazioni raggruppate e richiudibili |
| Layout editor | `.ss-editor` = pannello + `.ss-stage` | su schermi stretti lo stage va sopra |
| Anteprima | `.ss-stage` > `.ss-frame` (video/canvas 9:16) | |
| Timeline | `.ss-timeline` > `.ss-timeline__bar` (play, `.ss-time`) + `.ss-timeline__lanes[--t]` > `.ss-segments` > `.ss-segment[--len]`, `.ss-scrub`, `.ss-playhead` | `--len` = durata, `--t` = posizione (0–100%) |
| Lista clip | `.ss-list` > `.ss-clip` (`.is-active`, `.is-dragging`, `.is-drop-target`) | riordinabile |
| Caricamento file | `label.ss-drop` con `input type=file` nascosto | |
| Avanzamento | `.ss-progress[--p]` | export, upload |
| Badge | `.ss-badge` | "Presto", formati |
| Messaggio | `.ss-note`, `.ss-note--error` | testo con pallino, mai riquadri colorati |
| Modale | `.ss-overlay` > `.ss-modal` (`__title`, `__body`, `__actions`, `__close`) | la parete si sfoca e schiarisce |
| Passi | `ol.ss-steps` (`aria-current="step"`) | wizard |
| Notifica | `.ss-toast` | conferme brevi |
| Switch tema | `.ss-theme` > `.ss-theme__option[data-theme-choice][aria-pressed]` (icona sole / luna) | subito dopo `.ss-lang`; su telefono in fondo alla seconda riga |
| Un elemento per tema | `.ss-only-light`, `.ss-only-dark` | immagini che non possono prendere il colore dal testo (wordmark) |

## Componenti nuovi: come derivarli

Se l'app ha qualcosa che il kit non copre (un editor di curve, un selettore di forme, una griglia di beat…), non si inventa uno stile. Si deriva così, nell'ordine:

1. **Ruolo.** È una superficie (parete o carta), un contenuto (media, colori dell'utente), un comando o l'azione principale? Il ruolo decide il resto.
2. **Componenti vicini.** Qual è il componente del kit più simile? Si parte dalla sua ricetta e si cambia il meno possibile. Una timeline è "una lista di clip disposta in orizzontale + uno slider": segmenti di carta, traccia di 2px, manopola di carta.
3. **Solo primitivi esistenti.** Superfici `--paper` / `--field`, linee `--hairline` / `--track`, inchiostri, ombre della scala di profondità, raggi 4 / 2 / pillola / cerchio, spazi della griglia di 4px, curve di movimento del kit.
4. **Stati.** Riposo, hover (inchiostro più scuro, sale di 1–3px, ombra un gradino sopra), attivo/selezionato (`--ink-900`: testo, traccia o anello interno di 1px), focus (anello viola), disattivo (opacità 0,4), trascinamento (`--shadow-paper`, sale di 3px).
5. **Test in grigio.** Senza il contenuto colorato e senza il corallo, si capisce ancora tutto? Se un'informazione passa solo dal colore, è sbagliato.
6. **Token mancante.** Solo se serve davvero: si ricava da un token esistente (opacità di un inchiostro o di `--shadow-ink`), si aggiunge a `tokens.css` dell'app con un commento e si elenca nel report. Mai una tinta nuova.
7. **Si registra.** Ricetta CSS in `family.css` dell'app, con prefisso `ss-` e una riga in questa tabella dei componenti. Alla fine si riporta nel kit dell'hub, così il prossimo progetto la ritrova.

## Contenuto o interfaccia

Si ridisegna l'**interfaccia**: pagine, pannelli, comandi, modali, testi dell'UI. Non si tocca il **contenuto**: quello che il tool disegna nel canvas o nel video esportato (palline di Bouncical, grafica della classifica di TopFratmRanks), i colori scelti dall'utente, i preset. Quelli si cambiano solo se l'utente lo chiede esplicitamente.

## Vietato

- Colori nuovi: blu, viola, verde, rosso, nemmeno "solo per gli errori". Nessun accento tranne il corallo.
- Sfumature decorative, testo sfumato (`background-clip: text`), glow colorati, glassmorphism (l'unica sfocatura è lo sfondo della modale).
- Grassetto (peso ≥ 500), maiuscolo, font diversi da Urbanist.
- Bordi intorno a card e pannelli, raggi diversi da 4 / 2 / pillola / cerchio, ombre diverse da quelle dei token.
- Emoji come icone, set di icone pieni o spessi. Le icone sono SVG su griglia di 12 con tratto 1 e `currentColor`; se serve una libreria, solo a tratto sottile (≤ 1,25).
- Sezioni "marketing" inventate: hero con illustrazioni, griglie di feature con icone, testimonianze, CTA ripetute.
- Testi riscritti: si tengono le parole dell'app (si possono solo sistemare refusi o tradurre). Un testo nuovo va proposto all'utente.
- Cambiare il comportamento: stessi flussi, stesse funzioni, stessi ID e attributi letti dal JS (o il JS si aggiorna insieme).
- Animazioni d'ingresso a cascata, parallasse.
- Un tema che non passa dai token: blocchi `[data-theme="dark"]` sparsi nei componenti, colori scritti a mano "solo per lo scuro", `filter: invert()` sull'interfaccia.

## Lingue

Italiano di default. L'inglese sta sullo stesso elemento: `data-en="…"` per il testo, `data-en-aria-label`, `data-en-placeholder`, `data-en-title`, `data-en-content` per gli attributi. Un elemento tradotto contiene solo testo (le icone stanno fuori, il testo va in uno `<span>`). I bottoni dello switch hanno `data-lang="it"` / `data-lang="en"`. La scelta resta in `localStorage` con la chiave `scrollstudio-lang`, condivisa con l'hub.

Il codice è `i18n.js` del kit: si copia e si carica con `defer`. Per i testi creati dal JS (stati dell'export, errori, etichette dinamiche): un dizionario `{ it, en }` nell'app, la lingua da `window.ssLang()` e un nuovo render all'evento `ss:lang`.

## Temi

Due temi, chiaro (di default) e scuro: la stessa galleria, di sera. Parete grafite che sfuma dall'alto verso il basso, carta un gradino più chiara della parete, campi un gradino più scuri della carta, inchiostri chiari caldi (mai bianco puro), corallo invariato, ombre nere e più dense, nessun alone colorato.

### Contratto (uguale in hub e app)

| Cosa | Lingua | Tema |
|---|---|---|
| Attributo su `<html>` | `lang="it\|en"` | `data-theme="light\|dark"` (sempre esplicito) |
| Chiave `localStorage` | `scrollstudio-lang` | `scrollstudio-theme` (`light` / `dark`; se manca segue `prefers-color-scheme` e i suoi cambi) |
| Evento su `document` | `ss:lang` | `ss:theme`, `detail: { theme }` |
| API globale | `window.ssLang()`, `window.ssSetLanguage(l)` | `window.ssTheme()`, `window.ssSetTheme(t)` |
| Bottoni | `[data-lang]` in `.ss-lang` | `[data-theme-choice="light\|dark"]` in `.ss-theme` |
| File del kit | `i18n.js` (`defer`) | `theme.js` (**sincrono, nel `<head>`, dopo `<meta name="theme-color">` e prima dei CSS**: niente lampo chiaro→scuro) |

Hub e app stanno sullo stesso origin (`https://kekkocoppola.github.io/<repo>/`), quindi la scelta fatta nell'hub vale anche nelle app e viceversa; `theme.js` ascolta anche l'evento `storage`, così il tema cambia insieme in tutte le schede aperte. In locale ogni server ha la sua porta: la scelta non passa da un'app all'altra, è normale.

`theme.js` aggiorna `<meta name="theme-color">` (il colore della barra del browser) con `--wall-top` del tema attivo: nell'HTML resta il valore chiaro. Uno switch creato dopo il caricamento (in una modale) funziona da solo, perché il click è ascoltato su `document`; deve solo nascere con l'`aria-pressed` giusto: `String(button.dataset.themeChoice === window.ssTheme())`. Il JS che disegna con i colori dell'interfaccia legge `window.ssTheme()` e ridisegna su `ss:theme`.

### Token di ruolo

Un valore che fa due mestieri si separa in un token di ruolo, che nel chiaro vale esattamente come prima e nello scuro prende il suo valore. Elenco completo, con i due valori, in `CHANGELOG.md`.

| Token | Ruolo |
|---|---|
| `--on-ink` | testo e icone su superfici piene di `--ink-900` (non `--paper`: in scuro l'inchiostro è chiaro) |
| `--knob` | manopole di switch, range e playhead |
| `--overlay` | fondo della modale |
| `--stage-glow-end` | coda trasparente della luce dietro lo stage |
| `--line-dashed` | bordo tratteggiato di `.ss-drop` |
| `--swatch-ring` | anello degli swatch colore |
| `--chevron`, `--check-mark` | icone in data-URI: freccia del select, spunta della casella |

### Regole

1. **Il chiaro resta identico.** Ogni token nuovo, nel tema chiaro, vale quello che c'era prima. Il tema scuro è solo il blocco `:root[data-theme="dark"]` di `tokens.css`, che ridefinisce i token: nessun componente ha regole per tema (a parte `.ss-only-light` / `.ss-only-dark`).
2. **Niente colori scritti a mano.** Un valore scritto in un componente è un errore anche se "in chiaro va bene": al buio resterà chiaro. Si trova con `grep -nE "#[0-9a-fA-F]{3,8}|rgb\(|%23"`; restano ammesse solo le ombre `rgb(var(--shadow-ink) / α)` (seguono `--shadow-ink`, che al buio è nero) e il contenuto.
3. **Icone in data-URI.** `currentColor` non funziona dentro `background-image`, quindi il colore è scritto nell'URI: l'intero `url("data:…")` va in una custom property con un valore per tema (`--chevron`, `--check-mark`) e il componente usa `background-image: var(--chevron)`. Un'icona nuova in data-URI = un token nuovo con i due valori. Se si può, meglio un `<svg>` inline con `stroke="currentColor"`.
4. **Immagini dell'interfaccia** che non possono prendere il colore dal testo (il wordmark è un `<img>`): una variante per tema, mostrate con `.ss-only-light` / `.ss-only-dark`. Senza `data-theme` (JS spento) si vede la chiara.
5. **Contrasti.** Le soglie di "Accessibilità" valgono in **tutti e due** i temi; i valori calcolati sono in `CHANGELOG.md`.

### Contenuto o interfaccia, al buio

Il tema cambia solo l'**interfaccia**. Restano uguali in tutti e due i temi: video, poster e miniature, il canvas e il video esportato, i colori scelti dall'utente, le bandiere dello switch lingua, i loghi dei prodotti (gli avatar hanno già il loro fondo), il fondo `--video-ink` dei media. Testi e anelli disegnati **sopra** un media (il titolo su un video) usano token propri che non cambiano col tema.

## Accessibilità

- Contrasto AA, in tutti e due i temi: testo ≥ 4,5:1 (su corallo il testo è `--on-coral`), comandi e anello di focus ≥ 3:1.
- Focus sempre visibile (anello `--focus`). Tutto si usa da tastiera: timeline e slider con le frecce, modale con Esc e focus intrappolato.
- `aria-label` su ogni bottone solo icona, `aria-pressed` su opzioni e toggle, `aria-current` su elementi attivi, `role="slider"` + `aria-value*` sullo scrubber.
- `prefers-reduced-motion`: già gestito in `family.css`.
- Bersagli toccabili di almeno 28px (34px per i comandi principali).

## Checklist di accettazione (per ogni schermata)

- [ ] Accanto a `reference/hub-desktop.jpg`, sembra la stessa casa (parete, topbar, tipo, ombre).
- [ ] Una sola azione corallo visibile.
- [ ] Nessun colore fuori dai token, tranne il contenuto.
- [ ] Nessun peso ≥ 500, nessun bordo su card e pannelli, solo i raggi ammessi.
- [ ] Ogni valore viene da un token (cerca `#`, `px` e `rgb` scritti a mano fuori da `tokens.css`).
- [ ] Hover, focus, attivo, disattivo e trascinamento sono definiti per ogni comando.
- [ ] IT ed EN completi, lo switch funziona e ricorda la scelta.
- [ ] Tema scuro: lo switch funziona e ricorda la scelta; nessun colore scritto a mano (il `grep` di "Temi" fuori da `tokens.css` trova solo ombre su `--shadow-ink` e contenuto); nessun testo o comando sparito.
- [ ] 1366×768 e 375×667 senza scroll orizzontale; a 375 lo stage sta sopra il pannello.
- [ ] Console senza errori, tutte le funzioni di prima funzionano ancora.
