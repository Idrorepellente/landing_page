# LYRA — file da sostituire/aggiungere nella repo

Estrai questo archivio nella **radice della repo** (la cartella che contiene `src/`,
`package.json`, ecc.): i file finiranno automaticamente al posto giusto.
Percorsi relativi alla radice del progetto.

## Nuovi file (da aggiungere)
- `src/components/LyraLanding.tsx` — monta la nuova landing LYRA come home: inietta
  HTML+CSS, avvia i comportamenti (canvas, nav, reveal, tab, contatori, tema) e collega
  l'header alle funzioni del sito (menu "App", "Accedi", CTA → registrazione).
- `src/components/Chrome.tsx` — sulla home nasconde la barra e lo sfondo globali (la
  landing porta i suoi); sulle altre pagine mostra la barra LYRA e il layout a colonna.
- `src/lib/landingBehaviors.js` — i comportamenti JS della landing (adattati: `root`
  risolto a runtime; il tema viene applicato anche a `<html>` per restare in sincrono
  col resto del sito).
- `src/lib/lyraLandingContent.ts` — l'HTML e la CSS della landing (rebrand LYRA) come
  stringhe. **File grande, generato automaticamente: non modificarlo a mano.**

## File modificati (da sostituire)
- `src/app/page.tsx` — la home ora renderizza `<LyraLanding />` (non più la vecchia
  landing con fetch dal DB). La home è statica e non tocca il database.
- `src/app/layout.tsx` — usa `<Chrome>` al posto di Nav/NeuralBackground globali;
  titolo/metadati aggiornati a **LYRA**.
- `src/components/Nav.tsx` — logo rinominato da **QuantSys** a **LYRA** (barra usata
  sulle pagine interne).

## Note
- Nessuna dipendenza nuova: non serve toccare `package.json`.
- Le pagine login/marketplace/forum/runner/messaggi/feedback/profilo restano invariate.
- Deploy invariato (npm install / Vercel come prima); la home non richiede il database.
