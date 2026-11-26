import { loadRaw } from './_loader';
import { riempiPrezzi } from './prezzi';
import { riempiDocumenti } from './documenti';
/**
 * Landing "Lyra Capital": markup e CSS completi, letti a build-time. Lo script
 * sta in public/landing/landing.js.
 *
 * I prezzi dei piani nel markup sono segnaposto, riempiti qui dal catalogo
 * (src/lib/catalogo.ts) che il sito scrive anche nel database e che l'app
 * mostra in My subscription: vedi content/prezzi.ts.
 *
 * Anche i file della pagina Documentazione (#docs) sono segnaposto, riempiti
 * dall'elenco che scrive il repository della documentazione: vedi
 * content/documenti.ts.
 */
export const html = riempiDocumenti(riempiPrezzi(loadRaw('capital.html')));
export const css = loadRaw('capital.css');
