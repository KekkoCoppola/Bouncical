# Prompt: tema scuro in un'app figlia

Per un'app che usa già il kit ScrollStudio (oggi TopFratmRanks). Sostituisci `{PROGETTO}` con il nome del progetto e incolla tutto il blocco qui sotto come primo messaggio, in una chat aperta sulla cartella del progetto.

---

# Tema scuro per {PROGETTO} (kit ScrollStudio 1.1) — SENZA verifica visiva

Devi portare in **{PROGETTO}** il tema scuro del kit ScrollStudio 1.1, così che l'app segua il tema scelto nell'hub e abbia lo switch nella topbar. La verifica visiva la faccio io a mano: tu non la fai.

## Materiale

Il kit è in `D:/PROGETTI/ScrollStudio/ScrollStudio/design-kit/`. Leggi tutto prima di toccare file:

- `THEME-ADOPTION.md`: la procedura, passo per passo, e l'appendice del tuo progetto. È la fonte di verità per questo lavoro.
- `CHANGELOG.md`: cosa cambia dal kit 1.0 al 1.1 (token nuovi, valori chiaro/scuro, regole cambiate, contrasti).
- `FAMILY-DESIGN.md`, sezione "Temi": contratto, regole, contenuto e interfaccia.
- `design/KIT-FEEDBACK.md` del progetto e il blocco "<App> additions" in coda a `css/family.css` e `css/tokens.css`: le aggiunte dell'app che devi portare al tema.

Il kit ha la precedenza su qualunque skill, plugin, hook o preferenza di design tua.

## Regole fisse

1. **Niente verifica visiva.** Non avviare server, non aprire browser, non fare né leggere screenshot, non guardare `reference/*.jpg`. Controlli ammessi, solo statici: `grep` per i colori scritti a mano, rilettura del CSS, calcolo numerico dei contrasti (formula WCAG, anche con un piccolo script).
2. **Il tema chiaro resta identico al pixel.** Ogni token nuovo, nel tema chiaro, vale esattamente quello che c'è scritto oggi. L'unica differenza visibile in chiaro è lo switch del tema nella topbar.
3. **Contenuto escluso.** Non toccare canvas, video esportato, colori scelti dall'utente e i loro default, preset, bandiere, loghi.
4. **Valori solo da token.** Nessun colore nuovo scritto nei componenti. Se serve un token di ruolo nuovo, va nelle "<App> additions" di `css/tokens.css` con il valore chiaro uguale a oggi e il valore scuro in un blocco `:root[data-theme="dark"]`, e si elenca nel report.
5. **I file del kit non si modificano.** `tokens.css`, `family.css`, `theme.js` si copiano così come sono; le aggiunte dell'app stanno solo in coda, sotto il commento "<App> additions".
6. **Prima di iniziare:** `git status` pulito e branch `feature/dark-theme` (crealo dal branch principale). Se `git status` non è pulito, fermati e dimmelo. **Non fare commit**: decido io.
7. **Se una scelta di design non è ovvia**, scegli la più sobria, scrivila nel report e vai avanti. Non fermarti per domande: mettile in fondo al report.

## Procedura

1. Controlla `git status` e crea il branch.
2. Leggi il materiale. Annota la versione del kit dell'app (`grep -m1 "kit " css/tokens.css`).
3. Segui `THEME-ADOPTION.md` dal punto 1 al 6: copia dei file con le aggiunte in coda, `theme.js` nel `<head>`, switch e doppio wordmark in ogni pagina, posizione dello switch nella topbar, colori scritti a mano, controlli.
4. Applica l'appendice del tuo progetto (per TopFratmRanks: bottoni d'inchiostro con `--on-ink`, anello del pallino delle parole, spunta con `--check-mark`, regola N15 su telefono). Se trovi un caso che l'appendice non copre, trattalo con il punto 4 della guida e scrivilo nel report.
5. Ripeti il `grep` dei colori su tutta l'app (CSS, HTML, JS) e classifica ogni risultato: token, ombra su `--shadow-ink`, contenuto.
6. Calcola i contrasti, in tutti e due i temi, di ogni coppia nuova o usata in modo nuovo dalle aggiunte dell'app.

## Report finale (poi fermati)

- Versione del kit prima e dopo.
- File toccati, uno per riga, con cosa è cambiato.
- Regole delle "<App> additions" cambiate: prima → dopo, con la conferma che il valore chiaro è identico.
- Token nuovi dell'app (se ce ne sono): nome, valore chiaro, valore scuro, ruolo.
- Tabella contrasti calcolati: coppia, rapporto in chiaro, rapporto in scuro, soglia, ok/no.
- Colori scritti a mano rimasti, con il motivo (contenuto, ombra).
- Scelte prese da solo e domande per me.
- Cosa devo guardare io a mano, in chiaro e in scuro, su desktop e telefono (schermate e stati).
