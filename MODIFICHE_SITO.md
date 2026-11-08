# Sito — aggiornamento dell'8 novembre 2026

## Ultime modifiche (v4.21, 8 novembre)
- **Piattaforma › Runner e simulatore**, allineata alle protezioni aggiunte nell'app dopo la revisione degli ordini reali:
  - "Runner multi-strategia": la conferma degli ordini reali vale per un solo conto;
  - "Kill-switch a tre livelli": un conto oltre il limite chiude subito le posizioni e resta chiuso anche dopo un riavvio o con un altro runner, finché non lo riapri; un errore che si ripete ferma il runner;
  - "Registro di ogni runner": gli ordini reali di un titolo aspettano se i suoi prezzi non arrivano all'ultima seduta chiusa (calendario di borsa, festività comprese), al posto di "oltre un giorno di borsa".
- File: `src/content/capital.html`, `public/landing/landing.js`.

## Modifiche precedenti (v4.20, 8 novembre)
- **Ordini reali nell'app**: i runner su Interactive Brokers e MetaTrader 5 ora inviano davvero gli ordini, se li accendi tu (simulazione predefinita, conferma esplicita per ogni runner, registro di ogni ordine). I testi che dicevano "l'invio reale è in arrivo" sono aggiornati:
  - home, passo 04 "Esegui": titolo "Live sul tuo broker, *protetto*." e testo con simulazione, ordini reali accesi runner per runner, kill-switch e registro;
  - Piattaforma › Runner e simulatore: runner che mandano gli ordini, kill-switch del conto che resta chiuso anche dopo un riavvio, nuova voce "Registro di ogni runner" (ordini, esecuzioni, rifiuti, kill-switch; con dati indietro di oltre un giorno di borsa gli ordini reali aspettano);
  - Mappa: "Live e simulatore" e "Automazione" (i runner rifanno il ciclo al ritmo della barra più corta: ogni sei ore per una strategia giornaliera, non "ogni 60 secondi");
  - FAQ "Che broker supportate?".
- **Roadmap › In arrivo nell'app**: la scheda "Ordini reali sul broker" esce (la funzione è nell'app); al suo posto "Prezzi aggiornati da soli": oggi i runner decidono sui dati scaricati dall'app e, se sono indietro, trattengono gli ordini reali; il passo successivo li aggiorna prima di ogni ciclo. La scheda "Multi-conto e cruscotto live" dice che il registro di ordini, esecuzioni ed eventi del kill-switch c'è già.
- File: `src/content/capital.html`, `src/content/capital.css`, `public/landing/landing.js`.

## Modifiche precedenti (v4.19, 8 novembre)
- **Da PC come da telefono, anche con "Effetti di animazione" spenti** (Windows › Accessibilità › Effetti visivi; i browser lo leggono come "riduci movimento"). Prima, con quell'impostazione, il sito mostrava una versione ferma:
  - le tre frasi di "Perché Lyra" comparivano tutte insieme con il contatore fermo su "1 / 3": ora scorrono una alla volta con lo scroll, solo con dissolvenze (niente zoom, sfocature o icone che girano);
  - i quattro passi di "Dal backtest al capitale" non avanzavano con lo scroll: ora avanzano come sul telefono, senza transizioni.
- **Passi 01–05 su schermi larghi** (da circa 1680 px in su): il monitor non copre più il testo; resta nella sua colonna.
- **Icona e anteprima su Google**: aggiunta l'icona PNG 192×192 (`src/app/icon1.png`, multiplo di 48 px come chiede Google) accanto a ICO e SVG; titolo e descrizione della pagina aggiornati ("Lyra Capital — il desk quant che gira sul tuo computer"), indirizzo canonico, `robots.txt` e `sitemap.xml` (`src/app/robots.ts`, `src/app/sitemap.ts`). In `src/app/layout.tsx` tolto il campo `icons`, che Next ignora quando le icone sono file in `src/app`. Google aggiorna icona e testo del risultato solo quando ripassa sulla pagina: dopo la pubblicazione, in Google Search Console usa "Controllo URL" su https://www.lyra-capital.it/ e poi "Richiedi indicizzazione"; puoi anche inviare la sitemap da "Sitemap".

## Modifiche precedenti (v4.17–4.18, 8 novembre)
- **Testi allineati all'app**: ogni funzione descritta dal sito è stata confrontata con il codice dell'app. Quello che l'app non fa ancora non è più presentato come esistente: ora è segnato "in arrivo" oppure è stato tolto. Fra le correzioni principali: copilota con un modello locale (Ollama) al posto delle chiavi OpenAI/Anthropic; runner per Interactive Brokers e MetaTrader 5 che calcolano e registrano gli ordini, con l'invio reale in arrivo; Alpaca, Binance, multi-conto, scanner, trigger, capacità, report di due diligence e universo point-in-time segnati come in arrivo; "Robustness Critic" (AI) sostituito dal verdetto di robustezza statistico che l'app calcola davvero; sette overlay di rischio al posto dei "sei gate di regime"; stress su 2018, 2020 e 2022 (non 2008); 12 strategie e approcci in libreria (non 29); commissione del marketplace al 10%, come nell'app; fonti dati reali (Yahoo, Polygon, Dukascopy). I piani a pagamento, con la prova di due mesi, sono indicati come in apertura dopo la beta. L'elenco completo è nel documento di progetto "coerenza-sito-app".
- **Roadmap**: nuova sezione "01 · In arrivo nell'app" in cima, con il supporto alle opzioni in evidenza (grafico dei payoff a scadenza) e otto funzioni in arrivo; le release diventano la sezione 02 e il percorso dell'azienda la 03. Tolte dalla roadmap le voci già presenti nell'app (marketplace, linguaggio naturale, guardrail live) e "opzioni" dalle idee fuori piano.
- **Legale**: cookie policy con i soli cookie e local storage usati davvero (lyra-tema, qs-theme, g_state), niente banner; informativa privacy con il modulo della beta, l'impronta del dispositivo per le licenze del marketplace e il cloud descritto per quello che fa.
- **Team**: nomi dei fondatori nelle schede e nei testi alternativi delle foto.

## Modifiche precedenti (v4.15–4.16, 8 novembre)
- **Niente schermata di caricamento** ("Se regge, va."): tolta. La pagina resta invisibile, con lo sfondo del tema, finché stile, script e caratteri non sono pronti, e poi compare già finita: niente più frame senza stile o con la pagina sbagliata (`src/app/page.tsx`, `public/landing/landing.js`).
- **Sezione "Passo 01–05" (funzioni sul monitor)**: lo sfondo non si alterna più tra scuro e chiaro a ogni passo; resta blu notte con il tema scuro e avorio con il tema chiaro.
- **Striscia nera sotto i passi (smartphone)**: quando la barra del browser si nasconde, sotto la scena fissa non resta più lo spazio scuro: il colore del passo copre anche quella parte.
- **Team**: le tre schede dei fondatori hanno le foto vere (`public/landing/img/founder-1..3.webp`) al posto delle sfere low-poly.
- **Footer**: il copyright "© 2026 Lyra Capital" sta sotto i link (Termini … GitHub, Discord).

## Modifiche precedenti (v4.14)
- **Solo italiano**: tolto il selettore IT/EN e i testi inglesi. La pagina dichiara `lang="it"`: chi usa un altro browser la traduce con la traduzione automatica.
- **Iscrizione alla beta**: "Prova la demo", "Scarica gratis" e "Prova 2 mesi" aprono il modulo "Entra nella beta" (email + profilo), nello stile della landing. Scrive su `/api/beta`, la stessa lista che apre l'accesso durante la beta; il pannello Admin la vede come prima. Quando metterai i link veri in `LYRA_CONFIG` (`demo`, `download`), quei pulsanti torneranno link.
- **GitHub**: la voce del footer e la scheda GitHub della pagina Community portano a https://github.com/Lyra-Capital (`LYRA_CONFIG.github`).
- **Pagine interne con nomi inglesi**: `#platform`, `#engine`, `#map`, `#protocol`, `#capital`, `#for-managers`, `#data`, `#pricing`, `#roadmap`, `#community`, `#team`, `#faq`, `#terms`, `#privacy`, `#cookie`, `#disclaimer`, `#risks`. I vecchi nomi italiani (`#prezzi`, `#termini`, `#rischi`…) portano ancora alla pagina giusta e l'indirizzo viene corretto da solo.

Come installarlo: estrai lo zip nella cartella principale del sito (quella con `package.json`), accetta di sovrascrivere, poi `npm run build` e pubblica come al solito. Non servono librerie nuove.

## Landing nuova "Lyra Capital" sulla home
- La home (`/`) è ora la landing definitiva, la stessa dell'anteprima su Claude (v4.13): loader, hero con la vetrina, frase animata, funzioni sul monitor, "Dal backtest al capitale" con i passi, piani, FAQ, footer; le pagine interne (#piattaforma, #motore, #mappa, #protocollo, #capitale, #per-gestori, #dati, #prezzi, #roadmap, #community, #team, #faq e le cinque pagine legali); italiano/inglese; tema chiaro/scuro; il "coming soon" sulle card DARWIN e sull'immagine di Capitale.
- File: `src/content/capital.html` e `capital.css` (markup e stile, letti a build-time e resi dal server, quindi il testo è tutto nell'HTML e indicizzabile), `src/content/capital.ts`, `src/app/page.tsx`, `public/landing/landing.js` (loader, animazioni, lingua, tema, pagine interne) e `public/landing/img/` (le schermate dell'app e l'immagine 3D di Capitale).
- Le vecchie pagine pubbliche (`/pricing`, `/roadmap`, `/team`, `/terms`, `/privacy`, `/cookie`, `/disclaimer`, `/risks`, `/solution`, `/ecosystem`, `/engine-map`, `/fund-goal` e i loro indirizzi italiani) ora rimandano con un 301 alla pagina interna corrispondente della home (`next.config.mjs`). I file di quelle pagine restano nel progetto ma non si raggiungono più: si possono cancellare quando si vuole (`src/app/pricing` ecc. e i relativi `src/content/*`).
- Restano com'erano le pagine applicative: `/sign-in`, `/marketplace`, `/subscription` e le API.
- I link "da completare" della landing (GitHub, demo, docs, Discord, Kickstarter, sponsor, email, DARWIN) si compilano in cima a `public/landing/landing.js`, in `LYRA_CONFIG`: finché un valore è vuoto si vede il segnaposto, e per i DARWIN il "coming soon".
- Caratteri: Inter, Caveat e Kaushan Script arrivano da Google Fonts (link in `src/app/page.tsx`).

## Marchio nuovo (2 novembre)
- `public/logo.svg`, `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/favicon.ico`.

## Endpoint delle fatture e acquisto dei piani (1 novembre)
- `src/app/api/app/abbonamento/checkout`, `.../fatture`, `src/app/api/dashboard/vendite`, `src/app/api/market/checkout`, `src/app/marketplace/page.tsx`, `src/app/subscription/thank-you/page.tsx`. Vanno pubblicati insieme alla dashboard v2.
