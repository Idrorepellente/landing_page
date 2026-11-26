/**
 * prove/prova-documenti.mjs — la pagina Documentazione (#docs):
 * src/content/documenti.ts, l'elenco src/content/documenti.json e i file in
 * public/docs che il repository della documentazione scrive con `make sito`.
 *
 *     node prove/prova-documenti.mjs
 *
 * Il modulo TypeScript si compila con il tsc del progetto in una cartella
 * temporanea, come in prova-catalogo.mjs.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'lyra-prova-documenti-'));
const require = createRequire(import.meta.url);

let ok = 0;
const fallite = [];
function verifica(cond, testo, dettaglio = '') {
  if (cond) { ok++; console.log('  OK   ' + testo); }
  else { fallite.push(testo); console.log('  FAIL ' + testo + (dettaglio ? '  ' + dettaglio : '')); }
}
function errore(fn) {
  try { fn(); return ''; } catch (e) { return String(e.message || e); }
}

// ---------------------------------------------------------------- compilazione
const conf = {
  compilerOptions: {
    target: 'ES2020', module: 'commonjs', moduleResolution: 'node', strict: true,
    esModuleInterop: true, skipLibCheck: true, outDir: OUT, rootDir: path.join(RADICE, 'src'),
    types: ['node'], typeRoots: [path.join(RADICE, 'node_modules', '@types')],
  },
  files: [path.join(RADICE, 'src', 'content', 'documenti.ts')],
};
fs.writeFileSync(path.join(OUT, 'tsconfig.json'), JSON.stringify(conf));
execFileSync(process.execPath,
             [require.resolve('typescript/bin/tsc', { paths: [RADICE] }), '-p', path.join(OUT, 'tsconfig.json')],
             { stdio: 'inherit' });
const doc = require(path.join(OUT, 'content', 'documenti.js'));

// ---------------------------------------------------------------- numeri
verifica(doc.intero(3065) === '3.065' && doc.intero(93) === '93', 'interi all\'italiana');
verifica(doc.peso(933303) === '911 kB' && doc.peso(21924165) === '20,9 MB' && doc.peso(300) === '1 kB',
         'pesi all\'italiana', [doc.peso(933303), doc.peso(21924165), doc.peso(300)].join(' / '));

// ---------------------------------------------------------------- la pagina vera
const elenco = doc.leggiElenco(RADICE);
const capitale = fs.readFileSync(path.join(RADICE, 'src', 'content', 'capital.html'), 'utf8');
const esiste = (f) => fs.existsSync(path.join(RADICE, 'public', f));
const pagina = doc.riempiDocumenti(capitale, elenco, esiste);
verifica(!pagina.includes('<!--@DOC-'), 'nessun segnaposto resta nella pagina');
const tutti = [elenco.guidaUtente, ...elenco.guide, ...elenco.agente, elenco.pacchettoAgente];
verifica(tutti.every((f) => esiste(f.file)), `i ${tutti.length} file dell'elenco sono in public/`);
verifica(tutti.every((f) => fs.statSync(path.join(RADICE, 'public', f.file)).size === f.byte),
         'con la dimensione che l\'elenco dice');
verifica(tutti.every((f) => pagina.includes(`href="${f.file}"`)), 'ogni file ha il suo link nella pagina');
verifica(elenco.agente.every((a) => pagina.includes(`href="${a.file}" download="${path.basename(a.percorso)}"`)),
         'i Markdown si scaricano con il loro nome');
verifica(elenco.guide.length === 4 && elenco.agente.length >= 8, 'quattro guide e almeno otto Markdown');
verifica(capitale.includes('<a href="#docs"><span class="l-it">Documentazione</span></a>')
         && !capitale.includes('docs/lyra-user-guide.pdf" target'),
         'il piè di pagina porta alla pagina, non più al PDF');
verifica(/class="menu-voci"[\s\S]*?href="#docs"[\s\S]*?<\/nav>/.test(capitale), 'la pagina e\' nel menu');

// ---------------------------------------------------------------- errori che fermano la build
const manca = elenco.agente[0].file;
verifica(errore(() => doc.riempiDocumenti(capitale, elenco, (f) => f !== manca)).includes(manca),
         'un file che manca in public/ ferma la build e dice quale');
verifica(/compare 2 volte/.test(errore(() => doc.riempiDocumenti(capitale + '<!--@DOC-GUIDE-->', elenco, esiste))),
         'un segnaposto doppio ferma la build');
verifica(/compare 0 volte/.test(errore(() => doc.riempiDocumenti(capitale.replace('<!--@DOC-AGENTE-->', ''), elenco, esiste))),
         'un segnaposto che manca ferma la build');
const fuori = { ...elenco, pacchettoAgente: { file: '/altro/x.zip', byte: 1 } };
verifica(/fuori da \/docs\//.test(errore(() => doc.riempiDocumenti(capitale, fuori, () => true))),
         'un file fuori da /docs/ ferma la build');
const conHtml = { ...elenco, guide: [{ ...elenco.guide[0], titolo: 'A <b>&</b> "B"' }, ...elenco.guide.slice(1)] };
verifica(doc.riempiDocumenti(capitale, conHtml, () => true).includes('A &lt;b&gt;&amp;&lt;/b&gt; &quot;B&quot;'),
         'i testi dell\'elenco entrano nella pagina come testo, non come HTML');

fs.rmSync(OUT, { recursive: true, force: true });
console.log(`\n${ok} controlli superati, ${fallite.length} falliti`);
process.exit(fallite.length ? 1 : 0);
