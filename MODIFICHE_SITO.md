# Sito — aggiornamento del 7 novembre 2026

## Ultime modifiche (v4.15, 8 novembre)
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
