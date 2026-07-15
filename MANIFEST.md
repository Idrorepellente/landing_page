# LYRA — fix "pagina bloccata al primo avvio" + navigazione

Estrai nella **radice della repo**. Contiene l'intero set LYRA coerente.

## IMPORTANTE — un file va ELIMINATO
Cancella dalla repo il vecchio file:
    src/components/LyraLanding.tsx
È stato sostituito da `src/components/LandingClient.tsx`. (Se lo lasci non rompe nulla
perché non è più importato, ma è meglio rimuoverlo.)

## Cosa cambia (il fix del blocco)
Prima l'enorme HTML della landing (~370KB) veniva incluso nel **bundle JavaScript**:
al primo caricamento a freddo la pagina restava ferma (contatori a 0, animazioni bloccate)
finché il bundle non era scaricato e idratato. Ora:
- `src/app/page.tsx` rende **HTML e CSS della landing lato server** (pagina completa da
  subito, bundle client piccolo);
- `src/components/LandingClient.tsx` (nuovo) è un piccolo componente client che avvia i
  comportamenti (canvas, contatori, tab, tema) e collega la navigazione.

## Navigazione (come richiesto)
- Header: **Come funziona, Piattaforma, Community & Fondo, Fiducia, Marketplace, Forum,
  Feedback**; se sei loggato appare l'**avatar del profilo** (niente "Registrati"),
  altrimenti **Accedi** + registrazione.
- **Runner** e **Messaggi** stanno nel **profilo** (`src/app/profile/page.tsx`).

Nessuna dipendenza nuova.
