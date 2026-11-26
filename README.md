# Lyra — Sito (Next.js)

Landing e pagine di prodotto di **Lyra**, pronte per il deploy su **Vercel**.

## Stack
- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- Nessun CSS framework: il design usa stili inline + un foglio di stile per pagina
- Comportamenti (sfondo neurale, nav, reveal on-scroll, count-up, tab, caroselli,
  arco del differenziatore, mappa del motore, modale beta) in un unico modulo
  vanilla condiviso: `src/lib/behaviors.js`

## Struttura
```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx              # <html>, font, metadata globali
│   │   ├── globals.css             # reset + base
│   │   ├── page.tsx                # / (landing)
│   │   ├── soluzione/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── roadmap/page.tsx
│   │   ├── team/page.tsx
│   │   ├── ecosistema/page.tsx
│   │   ├── motore-mappa/page.tsx
│   │   └── obiettivo-fondo/page.tsx
│   ├── components/
│   │   ├── StaticPage.tsx          # inietta CSS + markup della pagina
│   │   └── Behaviors.tsx           # monta i comportamenti lato client
│   ├── content/                    # markup + CSS di ogni pagina (generati)
│   │   ├── landing.ts
│   │   └── ...
│   └── lib/
│       └── behaviors.js            # libreria comportamenti condivisa
├── next.config.mjs
├── package.json
└── tsconfig.json
```

## Sviluppo
Servono **Node.js 18.17+** e npm.
```bash
npm install
npm run dev        # http://localhost:3000
```

## Build di produzione
```bash
npm run build
npm start
```

## Deploy su Vercel
1. Push del repository su GitHub.
2. Su Vercel: **New Project → Import** dal repo.
3. Root Directory: `.` (la radice del repo).
4. Framework preset: **Next.js** (rilevato in automatico) → **Deploy**.

## Note
- Le immagini (avatar/anteprime) arrivano da servizi remoti: serve connessione.
  Verranno sostituite con le immagini reali della piattaforma.
- `src/content/*` è **generato** dai design component: non modificarlo a mano.
- Il tema scuro e il cambio lingua (che richiedeva un host AI) del prototipo non
  sono inclusi in questa build pubblica.
