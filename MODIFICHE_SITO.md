# Sito — aggiornamento del 7 novembre 2026

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
