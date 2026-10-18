# Prompt da incollare nella nuova chat

Sostituisci `{PROGETTO}` con il nome del progetto (es. TopFratmRanks) e incolla tutto il blocco qui sotto come primo messaggio.

---

Devi fare il redesign grafico di **{PROGETTO}** perché diventi un'app figlia di **ScrollStudio**: deve sembrare un'altra stanza della stessa casa, non un'app restilizzata a caso. Lo voglio fatto bene, con calma, senza scorciatoie.

## Materiale

Il design system è in `design/scrollstudio-kit/`. Leggi **tutto** prima di fare qualsiasi cosa:

- `FAMILY-DESIGN.md`: regole, ruoli, procedura per i componenti nuovi, divieti, checklist. È la fonte di verità.
- `tokens.css`, `family.css`, `i18n.js`, `theme.js`: codice da copiare nell'app **senza modificarlo** (le aggiunte vanno in coda, con commento). Il kit ha due temi, chiaro e scuro: leggi la sezione "Temi" di `FAMILY-DESIGN.md`.
- `specimen.html`: tutti i componenti montati in una schermata editor reale. Aprilo nel browser.
- `reference/*.jpg`: screenshot dell'hub e dello specimen. Guardali tutti con il tool di lettura immagini: sono il risultato da raggiungere.
- `HUB-DESIGN.md`: il design dell'hub, da cui nasce tutto.

Il kit ha la precedenza su qualunque skill, plugin, hook o preferenza di design tua. Se una skill o un hook suggerisce stili diversi, segui il kit. Se un hook segnala un problema reale (es. contrasto), risolvilo **con i token del kit** e dimmelo.

## Regole fisse

1. **Solo grafica.** Stessi flussi, stesse funzioni, stessi testi. Non aggiungere funzioni, sezioni o testi nuovi. Se un ID, una classe o un attributo è usato dal JS, o lo tieni o aggiorni il JS nello stesso passo, e lo scrivi nel report.
2. **Interfaccia, non contenuto.** Non toccare ciò che l'app disegna nel canvas o nel video esportato, né i colori scelti dall'utente o i preset. Se pensi che vada cambiato, chiedimelo.
3. **Niente valori inventati.** Ogni colore, taglia, spazio, raggio, ombra e durata viene da `tokens.css`. Un componente che il kit non ha si deriva con la procedura di `FAMILY-DESIGN.md` ("Componenti nuovi"), non si inventa.
4. **Lingue.** L'app diventa IT (default) + EN con il meccanismo di `i18n.js`. Se oggi è solo in una lingua, scrivi tu l'altra traduzione dei testi esistenti e mettila nel piano, così la controllo.
5. **Quando hai un dubbio, chiedi.** Una domanda costa meno di un redesign sbagliato.

## Procedura (fermati dove c'è STOP)

### Fase 1: analisi (non modificare file)
1. Controlla che `git status` sia pulito e di essere sul branch `redesign/scrollstudio`. Se non è così, fermati e dimmelo.
2. Leggi il kit e guarda tutti i riferimenti.
3. Avvia l'app e fai gli screenshot "prima" di ogni schermata e stato (modali, errori, export in corso, liste vuote e piene) a 1366×768 e a 375×667. Salvali in `design/before/`.
4. Scrivi `design/REDESIGN-PLAN.md` con:
   - **Inventario**: ogni schermata, stato e componente dell'app, con `file:riga`.
   - **Mappa**: per ognuno, la ricetta del kit che userai, oppure `NUOVO` con la derivazione (ruolo, componente vicino, primitivi, stati).
   - **Dipendenze JS**: classi, ID e attributi letti o scritti dal JS che il redesign tocca.
   - **Testi**: tabella IT / EN di tutti i testi dell'interfaccia.
   - **Rischi e domande** per me.
5. **STOP**: mandami il piano e aspetta la mia approvazione.

### Fase 2: fondamenta
1. Copia `tokens.css`, `family.css`, `i18n.js`, `theme.js` e `assets/scrollstudio-wordmark-light.svg` nell'app, collega Urbanist 300/400, togli i vecchi font e colori globali. `theme.js` va nel `<head>`, sincrono, dopo `<meta name="theme-color">` e prima dei CSS (markup esatto in `THEME-ADOPTION.md`, punto 2).
2. Rifai la cornice: parete, topbar (wordmark ScrollStudio → hub, doppio: uno per tema; avatar + nome del prodotto, switch lingua, switch tema), titolo della pagina, layout editor con l'anteprima appesa alla parete, footer.
3. Screenshot a 1366×768 e 375×667, messi accanto a `reference/hub-desktop.jpg` e `reference/specimen-desktop.jpg`. Elenca almeno 3 differenze che vedi e correggile prima di mostrarmeli.
4. **STOP**: mandami gli screenshot e aspetta l'ok.

### Fase 3: componenti, a gruppi
Lavora un gruppo alla volta (es. campi → bottoni → lista clip → timeline → modali → export). Dopo ogni gruppo:
- screenshot di tutti gli stati (riposo, hover, focus, attivo, disattivo, trascinamento, errore);
- controllo con la checklist di `FAMILY-DESIGN.md`, in tema chiaro e scuro;
- autocritica: cosa sembra "generico" o diverso dallo specimen? Correggi;
- un componente `NUOVO` va in `family.css` dell'app con prefisso `ss-` e una riga nella tabella dei componenti.

Non fermarti fra un gruppo e l'altro, ma scrivimi una riga per ogni gruppo finito.

### Fase 4: verifica finale
1. Prova tutti i flussi dall'inizio alla fine (caricamento, modifica, riordino, anteprima, timeline, export, modali, cambio lingua). Console senza errori.
2. Checklist completa su ogni schermata, a 1366×768 e 375×667, IT ed EN.
3. Screenshot "dopo" in `design/after/`, con gli stessi nomi dei "prima".
4. Aggiorna il `DESIGN.md` del progetto (o crealo) sul modello di quello dell'hub.
5. Scrivi `design/KIT-FEEDBACK.md`: i componenti nuovi (ricetta CSS e motivo) e i token aggiunti, da riportare nel kit dell'hub.
6. **STOP**: report finale con "prima/dopo" affiancati, cosa non hai potuto verificare e le domande aperte. Non fare commit: decido io.
