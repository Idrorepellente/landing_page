/**
 * content/documenti.ts — la pagina Documentazione (#docs), dall'elenco dei file.
 *
 * I file stanno in public/docs e l'elenco in src/content/documenti.json: li
 * scrive il repository della documentazione con `make sito APP=… SITO=…`
 * (strumenti/documenti-sito.py). Sono la User guide, le quattro guide degli
 * artefatti in PDF e gli originali dei Markdown che l'agente legge, con la
 * cartella in cui stanno. Qui, a build-time, l'elenco diventa il markup dei
 * quattro segnaposto della pagina in capital.html:
 *
 *     <!--@DOC-MANUALE-->     i bottoni della User guide
 *     <!--@DOC-GUIDE-->       le schede delle guide degli artefatti
 *     <!--@DOC-AGENTE-->      una riga per Markdown dell'agente
 *     <!--@DOC-PACCHETTO-->   lo zip con tutti i Markdown
 *
 * Un file dell'elenco che non c'è in public/ ferma la build, come un
 * segnaposto che manca nella pagina: meglio una build ferma che un bottone
 * che porta a una pagina che non esiste.
 */
import fs from 'fs';
import path from 'path';

interface FileElenco { file: string; byte: number }
interface Manuale extends FileElenco { titolo: string; pagine: number | null }
interface Guida extends FileElenco {
  titolo: string; etichetta: string; descrizione: string; pagine: number | null; fonti: string[];
}
interface GuidaAgente extends FileElenco { chiave: string; percorso: string; uso: string; righe: number }
export interface Elenco {
  guidaUtente: Manuale; guide: Guida[]; agente: GuidaAgente[]; pacchettoAgente: FileElenco;
}

class ErroreDocumenti extends Error {
  constructor(msg: string) {
    super('Pagina Documentazione (src/content/documenti.json, capital.html): ' + msg
          + '. Rigenera i file con `make sito APP=… SITO=…` nel repository della documentazione.');
  }
}

const SEGNAPOSTO = {
  manuale: '<!--@DOC-MANUALE-->', guide: '<!--@DOC-GUIDE-->',
  agente: '<!--@DOC-AGENTE-->', pacchetto: '<!--@DOC-PACCHETTO-->',
} as const;

// Le icone dei bottoni, nello stile delle altre del sito (tratto 2, estremi tondi).
const FRECCIA_GIU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v13m-6-6 6 6 6-6M5 20h14"/></svg>';
const APRI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>';

/** L'elenco scritto dal repository della documentazione. */
export function leggiElenco(radice = process.cwd()): Elenco {
  const file = path.join(radice, 'src', 'content', 'documenti.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Elenco;
  } catch (e) {
    throw new ErroreDocumenti(`non si legge (${(e as Error).message})`);
  }
}

/** Interi all'italiana: 3065 -> «3.065». */
export function intero(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Il peso di un file all'italiana: 931207 -> «0,9 MB», 82964 -> «81 kB». */
export function peso(byte: number): string {
  if (byte >= 1e6) return (byte / 1048576).toFixed(1).replace('.', ',') + ' MB';
  return intero(Math.max(1, Math.round(byte / 1024))) + ' kB';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Un percorso che può andare a capo dopo «/» e «_», e solo lì se basta. */
function percorso(s: string): string {
  return esc(s).replace(/([/_])/g, '$1<wbr>');
}

function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function controlla(e: Elenco, esiste: (file: string) => boolean): void {
  const tutti: FileElenco[] = [e.guidaUtente, ...e.guide, ...e.agente, e.pacchettoAgente];
  if (!e.guide?.length || !e.agente?.length) throw new ErroreDocumenti('elenco senza guide o senza Markdown');
  for (const f of tutti) {
    if (!f || typeof f.file !== 'string' || !f.file.startsWith('/docs/')) {
      throw new ErroreDocumenti(`un file fuori da /docs/: ${JSON.stringify(f?.file)}`);
    }
    if (!(f.byte > 0)) throw new ErroreDocumenti(`${f.file} senza dimensione`);
    if (!esiste(f.file)) throw new ErroreDocumenti(`${f.file} non c'è in public/`);
  }
}

/** «PDF in inglese · 82 pagine · 0,9 MB»: le pagine solo se l'elenco le sa. */
function datiPdf(f: Manuale | Guida): string {
  return ['PDF in inglese', f.pagine ? `${intero(f.pagine)} pagine` : '', peso(f.byte)]
    .filter(Boolean).join(' · ');
}

function manuale(m: Manuale): string {
  return `<div class="doc-az">
      <a class="btn" href="${esc(m.file)}" download><span class="doc-ic">${FRECCIA_GIU}</span><span>Scarica la User guide</span></a>
      <a class="btn-link" href="${esc(m.file)}" target="_blank" rel="noopener">Aprila nel browser${APRI}</a>
    </div>
    <p class="doc-meta">${datiPdf(m)}</p>`;
}

function guide(gg: Guida[]): string {
  const schede = gg.map((g, i) => {
    const ritardo = i ? ` style="animation-delay:${(i * 0.09).toFixed(2)}s"` : '';
    return `<article class="scheda doc-scheda rv"${ritardo}>
        <span class="tag">${esc(g.etichetta)}</span>
        <h3><a href="${esc(g.file)}" target="_blank" rel="noopener">${esc(g.titolo)}</a></h3>
        <p>${esc(g.descrizione)}</p>
        <p class="doc-meta">${datiPdf(g)}</p>
        <a class="btn-link" href="${esc(g.file)}" download>Scarica${FRECCIA_GIU}</a>
      </article>`;
  });
  return `<div class="quattro doc-guide">\n      ${schede.join('\n      ')}\n    </div>`;
}

function agente(aa: GuidaAgente[]): string {
  const righe = aa.map((a) => {
    const taglio = a.percorso.lastIndexOf('/') + 1;
    const cartella = a.percorso.slice(0, taglio), nome = a.percorso.slice(taglio);
    return `<li>
        <span class="k doc-percorso"><span class="doc-cartella">${percorso(cartella)}</span>${percorso(nome)}</span>
        <div class="v"><p>${esc(maiuscola(a.uso))}.</p><p class="doc-meta">Markdown · ${intero(a.righe)} righe · ${peso(a.byte)}</p><a class="btn-link" href="${esc(a.file)}" download="${esc(nome)}">Scarica${FRECCIA_GIU}</a></div>
      </li>`;
  });
  return `<ul class="righe doc-file">\n      ${righe.join('\n      ')}\n    </ul>`;
}

function pacchetto(p: FileElenco, quanti: number): string {
  return `<div class="doc-az">
      <a class="btn btn-vetro" href="${esc(p.file)}" download><span class="doc-ic">${FRECCIA_GIU}</span><span>Scarica tutti e ${quanti} (zip)</span></a>
    </div>
    <p class="doc-meta">Zip · ${peso(p.byte)} · con le cartelle</p>`;
}

/** La pagina Documentazione di capital.html, con i file dell'elenco. */
export function riempiDocumenti(
  html: string,
  elenco: Elenco = leggiElenco(),
  esiste: (file: string) => boolean = (f) => fs.existsSync(path.join(process.cwd(), 'public', f)),
): string {
  controlla(elenco, esiste);
  const pezzi: Record<keyof typeof SEGNAPOSTO, string> = {
    manuale: manuale(elenco.guidaUtente),
    guide: guide(elenco.guide),
    agente: agente(elenco.agente),
    pacchetto: pacchetto(elenco.pacchettoAgente, elenco.agente.length),
  };
  let out = html;
  for (const chiave of Object.keys(SEGNAPOSTO) as (keyof typeof SEGNAPOSTO)[]) {
    const segno = SEGNAPOSTO[chiave];
    const volte = out.split(segno).length - 1;
    if (volte !== 1) throw new ErroreDocumenti(`il segnaposto ${segno} compare ${volte} volte invece di una`);
    out = out.replace(segno, pezzi[chiave]);
  }
  return out;
}
