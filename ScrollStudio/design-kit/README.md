# ScrollStudio design kit

Kit per ridisegnare le app figlie (TopFratmRanks, Bouncical, i prossimi tool) nello stile dell'hub. Questa cartella è l'unica fonte: si copia nei progetti, si migliora solo qui.

| File | Cosa |
|---|---|
| `FAMILY-DESIGN.md` | regole, componenti, procedura per i componenti nuovi, temi, divieti, checklist |
| `tokens.css` · `family.css` · `i18n.js` · `theme.js` | codice pronto da copiare nell'app |
| `CHANGELOG.md` | versioni del kit (la versione è anche in testa a `tokens.css` e `family.css`) |
| `specimen.html` | tutti i componenti in una schermata editor, con lo switch del tema (aprila con il server dell'hub: `/design-kit/specimen.html`) |
| `reference/` | screenshot dell'hub e dello specimen, desktop e telefono (tema chiaro) |
| `assets/` | wordmark (chiaro e scuro), logo e poster usati dallo specimen |
| `PROMPT.md` | il primo messaggio da dare all'agente nel progetto figlio (redesign) |
| `THEME-ADOPTION.md` · `PROMPT-THEME-APP.md` | guida e prompt per portare il tema scuro in un'app già ridisegnata con il kit 1.0 |

## Procedura per ogni progetto figlio

Un progetto alla volta, una chat per progetto. Inizia da **TopFratmRanks**: ha più componenti (timeline, lista clip, modali, export). Quello che nasce lì serve poi per Bouncical.

### 1. Prepara il progetto
Tutto committato, poi un branch dedicato (da dentro la cartella del progetto):

```bash
git switch -c redesign/scrollstudio
```

### 2. Copia il kit nel progetto
Copia anche il `DESIGN.md` dell'hub come `HUB-DESIGN.md` (esempio per TopFratmRanks):

```bash
mkdir -p "D:/PROGETTI/TopFratmRanks/design" && cp -r "D:/PROGETTI/ScrollStudio/ScrollStudio/design-kit" "D:/PROGETTI/TopFratmRanks/design/scrollstudio-kit" && cp "D:/PROGETTI/ScrollStudio/ScrollStudio/DESIGN.md" "D:/PROGETTI/TopFratmRanks/design/scrollstudio-kit/HUB-DESIGN.md"
```

Bouncical non è in `D:/PROGETTI`: prima clonalo dal suo repo GitHub.

### 3. Apri la chat
- Nuova sessione con la cartella del progetto come directory di lavoro.
- Modello **Opus 5.5**, effort **alto** (o massimo).
- Incolla `PROMPT.md` sostituendo `{PROGETTO}`.

### 4. I tre STOP sono il tuo controllo qualità
L'agente si ferma tre volte. È lì che si evitano errori e "AI slop":

1. **Piano** (`design/REDESIGN-PLAN.md`). Controlla che l'inventario abbia *tutto*: ogni bottone, modale, stato vuoto, errore. Controlla le traduzioni IT/EN. Leggi con attenzione le righe `NUOVO`: se una derivazione non ti convince, correggila adesso, costa poco. Rispondi alle domande.
2. **Fondamenta** (screenshot della cornice). Mettili accanto all'hub: se non sembrano la stessa casa, fermati qui e di' cosa non torna, in modo concreto ("la topbar è più alta", "il titolo è troppo scuro"). Non andare avanti finché la cornice non è giusta: tutto il resto ci si appoggia.
3. **Report finale** (prima/dopo). Prova tu l'app su desktop e telefono: export, timeline, modali, cambio lingua.

Se a metà qualcosa ti sembra generico, scrivilo con un riferimento: "rifallo come `.ss-clip` dello specimen".

### 5. Chiudi il giro
- Se va bene: commit sul branch, merge, pubblica.
- Porta `design/KIT-FEEDBACK.md` in una chat su ScrollStudio e chiedi di aggiungere al kit i componenti nuovi (ricetta in `family.css`, riga in `FAMILY-DESIGN.md`, aggiornamento dello specimen). Solo dopo passa al progetto successivo: così Bouncical parte da un kit che sa già fare quello che è nato in TopFratmRanks.

## Perché così

- **Codice, non descrizioni.** L'agente copia ricette CSS già verificate invece di interpretare aggettivi come "minimal" o "elegante". È la difesa principale contro l'AI slop.
- **Immagini di riferimento.** Il confronto con gli screenshot coglie le differenze che le regole scritte non dicono.
- **Procedura per i componenti nuovi.** Timeline e controlli mai visti si derivano da ruolo e componenti vicini, con i soli primitivi del kit.
- **Fermate obbligatorie.** Gli errori costano poco nel piano e tanto alla fine.
- **Un progetto, una chat, un branch.** Contesto pulito, diff leggibile, rollback facile.
