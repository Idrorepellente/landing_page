# QuantSys — modifiche richieste (sito + app)

Questo documento riassume le cinque modifiche implementate, come sono state fatte e come si configurano.

## Principio architetturale

Il **sito resta l'unico writer del proprio database**. L'app comunica con il sito via **HTTP
server-to-server con segreto condiviso** — lo stesso schema già usato per l'upload dei runner
(`/api/runners/upload`, `QUANTSYS_UPLOAD_SECRET`). Questo evita di duplicare la logica
Prisma/slug/upsert nell'app, non introduce drift di schema ed è deployabile ovunque (app e sito
possono girare su host diversi). Dove l'endpoint non è configurato, tutto degrada in modo
sicuro al comportamento precedente.

---

## 1) Sezione profilo sul sito (runner + dettagli account)

- **Pagina** `web/src/app/profile/page.tsx` + link **"Profilo"** nella nav (visibile da loggati).
- **API** `web/src/app/api/profile/route.ts`:
  - `GET` → dettagli account (username, email, nome visualizzato, bio, "membro dal"),
    statistiche (n. runner, in esecuzione, artefatti pubblici/privati per tipo, post nel forum),
    elenco dei **runner caricati** e degli **artefatti** dell'utente.
  - `PATCH` → aggiorna **nome visualizzato** e **bio** (campi già presenti nello schema, nessuna
    migrazione necessaria).
- Dalla pagina profilo si può: modificare i propri dati, avviare/fermare/**eliminare** un runner,
  rendere un artefatto **pubblico/privato** ed **eliminarlo**.

## 2) Eliminazione di un runner

- **API** `web/src/app/api/runners/route.ts` → nuovo handler `DELETE` (id da `?id=` o body,
  con controllo di proprietà).
- **UI**: pulsante "Elimina" (con conferma) nella pagina `/runners` e nel profilo.

## 3) Caricare strategie/approcci/overlay/weight mode come pubblici o privati (da app)

- **App**: nuova scheda **"Sito"** nello Studio → *Pubblica un artefatto sul sito*: si sceglie
  tipo + nome (dai componenti installati in locale) e la **visibilità (pubblico/privato)**.
- **App → adapter** `adapters/web_artifacts.py::HttpArtifactPublisher` + use case
  `application/PublishArtifact`: legge il **codice locale** dell'artefatto e lo invia al sito.
  - Mappa dei percorsi locali: strategia → `strategies/<n>/strategy.py`, approccio →
    `approaches/<n>/approach.py`, overlay → `reporting/gates/<n>.py` (gli overlay del runner sono
    i *gate*), weight mode → `reporting/weighting/<n>.py`.
- **Sito**: nuovo endpoint `web/src/app/api/artifacts/upload/route.ts` (server-to-server, segreto
  condiviso) che fa upsert dell'artefatto con il flag `isPublic`.

## 4) All'upload di un runner, niente re-invio di ciò che è già nell'account (no upload)

- **Sito**: nuovo endpoint `web/src/app/api/artifacts/list/route.ts` (server-to-server) che
  ritorna gli artefatti dell'account raggruppati per tipo (nome + `isPublic`).
- **App**: la rotta di upload runner (`/studio/api/runner/upload`) ora esegue un flusso unificato:
  1. legge l'inventario dell'account;
  2. **sincronizza** gli artefatti referenziati con **dedup**: ciò che è **già nell'account NON
     viene rispedito**; i mancanti-ma-locali vengono caricati (di default **privati**, opzione per
     renderli pubblici); ciò che non è né locale né nell'account viene segnalato come mancante;
  3. valida in modalità *account-aware* (vedi punto 5);
  4. carica il runner.
- Use case `application/SyncRunnerArtifacts` (logica di dedup) + adapter
  `HttpAccountArtifactsClient`. Il report di sincronizzazione è mostrato nella UI dopo l'upload.

## 5) Creare un runner "dall'account" (se c'è almeno una strategia o un approccio)

- **App**: nel pannello *Runner live*, nuova sezione **"Crea da artefatti dell'account"** che
  compare quando l'account ha **almeno una strategia o un approccio**. I selettori
  (strategie/approcci/overlay/weight mode) sono popolati con gli artefatti **dell'account**
  (privati o pubblici). L'upload passa dalla stessa rotta unificata: essendo già nell'account,
  **nulla viene ricaricato**.
- **Validazione *account-aware*** (`adapters/web_artifacts.py::AccountAwareRunnerValidator`): un
  artefatto è valido se presente **in locale** *oppure* **già nell'account**. Se l'inventario
  dell'account non è disponibile (endpoint non configurato/irraggiungibile) il comportamento
  coincide con la validazione puramente locale di prima.

---

## Configurazione (Docker)

Nel servizio `dashboard` di `docker-compose.yml` sono stati aggiunti gli endpoint artefatti
(oltre a quello runner già presente); il **segreto è lo stesso** dell'upload runner:

```yaml
  dashboard:
    environment:
      QUANTSYS_RUNNER_UPLOAD_URL:     "http://web:3000/api/runners/upload"
      QUANTSYS_ARTIFACT_UPLOAD_URL:   "http://web:3000/api/artifacts/upload"
      QUANTSYS_ACCOUNT_ARTIFACTS_URL: "http://web:3000/api/artifacts/list"
      QUANTSYS_UPLOAD_SECRET:         "scegli-un-segreto-lungo"   # deve combaciare col sito
```

Sul servizio `web` deve essere presente lo stesso `QUANTSYS_UPLOAD_SECRET` (già nel compose).

**Fuori Docker**: basta impostare `QUANTSYS_WEB_BASE_URL` (es. `https://tuo-sito`) e gli endpoint
vengono derivati automaticamente; in alternativa, se è già impostato `QUANTSYS_RUNNER_UPLOAD_URL`,
gli altri due endpoint vengono derivati dalla stessa base — nessuna configurazione extra.

Nessuna migrazione di database è necessaria (si usano campi già esistenti: `User.displayName`,
`User.bio`, `Artifact.isPublic`).

---

## File toccati

**Sito (`web/`)**
- `src/app/api/runners/route.ts` — `DELETE` runner.
- `src/app/api/artifacts/upload/route.ts` — nuovo (ingest artefatti, pubblico/privato).
- `src/app/api/artifacts/list/route.ts` — nuovo (elenco artefatti account).
- `src/app/api/profile/route.ts` — nuovo (profilo: GET dettagli/stat/runner/artefatti, PATCH).
- `src/app/profile/page.tsx` — nuovo (pagina profilo).
- `src/components/Nav.tsx` — link "Profilo".
- `src/app/runners/page.tsx` — pulsante "Elimina".

**App (dashboard Python)**
- `adapters/web_artifacts.py` — nuovo (publisher, client account, lettore codice locale,
  validatore account-aware, derivazione endpoint).
- `ports/__init__.py` — nuove porte `ArtifactPublisherPort`, `AccountArtifactsPort`,
  `ArtifactCodeSourcePort`.
- `application/__init__.py` — nuovi use case `PublishArtifact`, `ListAccountArtifacts`,
  `SyncRunnerArtifacts`.
- `dashboard/studio.py` — wiring + rotte `/studio/api/artifact/upload`,
  `/studio/api/account/artifacts`; rotta `/studio/api/runner/upload` riscritta (dedup +
  validazione account-aware + upload).
- `dashboard/templates/studio.html` — scheda "Sito" (pubblica artefatto + vista account) e
  sezione "Crea da artefatti dell'account" nel pannello Runner + report di sincronizzazione.
- `docker-compose.yml` — endpoint artefatti nel servizio dashboard.

> Nota: gli archivi consegnati non includono `web/.next` né i `__pycache__` (artefatti di build,
> rigenerati automaticamente da `npm run build` / all'avvio).

---

## Aggiornamento UI (secondo giro)

**Studio (app) — da tab orizzontali a sidebar.** Le sezioni dello Studio sono ora voci di una
**sidebar** verticale a sinistra (contenuto a destra), invece delle tab in alto. Le voci sono:
Strategie, Weight mode, Indicatori, Overlay, Dati esterni, Runner live e **Upload** (già "Sito",
rinominata). Su schermi stretti (≤820px) la sidebar torna a disporsi in orizzontale. La logica di
cambio sezione è invariata (guidata da `data-tab`/`data-panel`); l'id interno del pannello "Sito"
è stato rinominato in `upload`.

**Sito — accesso al profilo dall'icona in alto a sinistra.** Il link testuale "Profilo" è stato
rimosso dalla barra di navigazione; l'accesso al profilo avviene ora cliccando l'**icona del
profilo (avatar con iniziale) posizionata in alto a sinistra**, prima del logo. È mostrata solo da
loggati e evidenzia lo stato attivo quando si è sulla pagina profilo; il nome utente non è più
ripetuto a destra (resta solo "Esci").

File aggiornati in questo giro: `dashboard/templates/studio.html` (app) e
`src/components/Nav.tsx` (sito).

---

## Landing + tema chiaro/scuro + restyle del sito (terzo giro)

Richiesta: usare la landing page fornita come **home** del sito, mantenendo tutte le
funzionalità, uniformare lo stile dell'intero sito alla landing e aggiungere l'opzione
**tema chiaro/scuro**.

**Approccio.** Il sito usava già variabili CSS per tutti i colori (un solo colore era
hardcoded, nella nav). Ho quindi rimappato le **stesse variabili** su una nuova palette
allineata alla landing e introdotto due temi: **chiaro di default** (`:root`) e **scuro**
(`[data-theme="dark"]`). Così ogni pagina dell'app adotta il nuovo stile e il tema
automaticamente, senza modificare le singole pagine.

**Stile (design system della landing).**
- Palette: indaco `#4F46E5` (primario) + teal `#0D9488` (accento); chiaro `#F6F8FB`/`#0F172A`,
  scuro `#0A0E1A`/`#E7ECF5`.
- Font: **Space Grotesk** (titoli/brand), **Mulish** (testo), **IBM Plex Mono** (mono).
- Card con ombre morbide, bottoni pill, logo con segno grafico a gradiente (indaco→teal).
- **Sfondo neurale animato** full-page (portato da `behaviors.js` della landing): particelle
  che seguono il mouse, colore della scia legato al tema, rispetto di `prefers-reduced-motion`.

**Home = landing.** La home (`/`) è ora una landing completa con: hero, **stat band con
count-up** (conteggi reali: strategie condivise e membri, più capacità reali della piattaforma),
sezioni "dai problemi alle soluzioni", "come funziona", "cosa ci rende diversi", "community &
fondo", **ultimi pubblicati** (dati reali dal marketplace — funzionalità mantenuta), CTA finale e
footer. Reveal-on-scroll su tutte le sezioni.

**Tema chiaro/scuro.** Toggle (icona luna/sole) nella barra in alto; il tema è applicato
**prima del paint** (nessun flash) via script inline che legge `localStorage['qs-theme']`
(default chiaro) e persiste la scelta. Lo sfondo neurale si aggiorna al cambio tema.

**Funzionalità invariate.** Marketplace, forum, runner, messaggi, feedback, profilo, login/
registrazione e tutte le API restano identiche: cambia solo lo stile (via variabili) e la home.

File web di questo giro: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`,
`src/components/Nav.tsx`, `src/components/Landing.tsx` (nuovo), `src/components/NeuralBackground.tsx`
(nuovo), `src/components/ThemeToggle.tsx` (nuovo), `tailwind.config.ts`.

> La landing originale (Vite/HTML statico con i18n via `window.claude.complete` e immagini
> remote) è stata **riprodotta come pagina React** integrata nel sito: stessa identità visiva,
> ma manutenibile nel codice Next.js e collegata ad auth, nav e tema. Il selettore lingua
> EN/ES/DE della landing originale non è incluso (dipendeva da un host specifico).

---

## Tema scuro, profilo e ristrutturazione Studio (quarto giro)

### Sito
- **Tema scuro rivisto.** Nuova palette scura più leggibile: sfondi con elevazioni
  distinte (`#0B1120` → card `#151C2E` → controlli `#1E2740`), bordi più visibili,
  accenti più brillanti (indaco `#8B93FF`, teal `#2DD4BF`), gradiente e sfondo neurale
  coerenti. Sfondo neurale alleggerito (meno particelle) per un look più pulito.
- **Icona account a destra + logout nel profilo.** L'avatar è ora in alto a **destra**;
  il pulsante **Esci** è stato tolto dalla barra e spostato **dentro la pagina Profilo**.

### App (dashboard)
- **Icona profilo anche sull'app.** L'header mostra un avatar (in alto a destra) che apre
  la nuova pagina **Profilo**, dove si trova il pulsante **Esci** (come sul sito).
- **Sidebar principale.** Rimossa la voce **Strategie** (l'editor); aggiunte **Runner live**
  e **Upload** come voci autonome, fuori dallo Studio. **Dati esterni** è stato spostato
  nella scheda **Data** (la scheda che gestisce i dati in ingresso).
- **Studio → solo authoring.** La sidebar secondaria ora è: **Strategie, Approccio (nuovo),
  Weight mode, Indicatori, Overlay**.
- **Modalità di scrittura.** In ogni voce (strategia/approccio/weight mode/indicatori/overlay)
  la prima cosa selezionabile è la **modalità**: **IA · Grafico · Codice** (una alla volta,
  per ottimizzare lo spazio).
  - **Strategie** e **Approccio**: la modalità **IA** ha due metodi — **Da descrizione** e
    **Codifica dal backtest manuale**. La modalità **Codice** è l'editor multi-file completo
    (strategie: `strategies/…/strategy.py`; approcci: `approaches/…/approach.py`), integrato.
  - **Indicatori**: la scrittura via **Codice** rimanda alla scheda **Visual Debug** (dove è
    già presente l'editor indicatori) e non è duplicata.
- **Runner live / Upload / Dati esterni** riusano i pannelli esistenti (stessa logica e
  affidabilità), presentati come pagine dedicate senza la sidebar dello Studio.

> Nota tecnica: nel motore attuale gli **approcci** si definiscono via **codice** (non esiste
> un generatore IA/grafico di approcci). Perciò nel pannello Approccio la modalità **Codice**
> è il percorso nativo completo; **IA → Da descrizione** genera un codice di partenza (anteprima)
> da salvare in Codice, e gli altri metodi rimandano agli strumenti equivalenti di Strategie.

---

## Correzioni (quinto giro)

1. **Tema scuro del sito — sfondo che restava bianco.** Lo sfondo neurale animato è un
   canvas che, accumulando il colore di dissolvenza, diventava quasi solido; in chiaro
   ≈ bianco. Con `prefers-reduced-motion` attivo il loop è fermo, quindi al cambio tema
   il canvas non veniva ridisegnato e restava bianco sopra lo sfondo scuro. Ora: il
   contenitore dello sfondo usa sempre `var(--bg)` (colore del tema, immediato) e al
   cambio tema il canvas viene **ripulito** (e ridisegnato se il movimento è ridotto).
2. **"Codifica dal backtest manuale" (Strategie · IA).** Il metodo era presente ma poco
   evidente: ora i due metodi IA hanno l'etichetta **"Metodo:"** e sono resi come schede
   chiaramente cliccabili (sotto **Strategie → IA**, e analogamente sotto Approccio).
3. **Approccio · Grafico.** Rimossa la nota di rimando: ora c'è un **vero editor a nodi**
   (come per le strategie). Genera il codice in anteprima, da incollare in **Codice** per
   salvarlo come approccio (nel motore attuale gli approcci si salvano via codice).
4. **Editor (modalità Codice).** In Studio l'editor non mostra più l'intestazione con il
   selettore **[Strategia | Approccio]**: il tipo è già fissato dal contesto, quindi non è
   più possibile scegliere per errore l'elemento sbagliato.
5. **Editor — colonna-lista rimossa in Studio.** La barra laterale che elencava
   strategie/approcci creati è nascosta quando l'editor è incorporato; al suo posto un
   **selettore compatto** (menu a tendina + "＋ Nuova") per scegliere o creare.
6. **Studio più largo.** Contenuto allargato (area utile ~1560px, meno margini laterali) e
   editor incorporato più alto: più spazio per IA, grafo e codice.
