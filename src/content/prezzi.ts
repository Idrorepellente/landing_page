/**
 * content/prezzi.ts — i numeri dei piani nella pagina Prezzi, dal catalogo.
 *
 * In capital.html i prezzi non sono scritti: ci sono dei segnaposto, che qui
 * si riempiono a build-time da lib/catalogo.ts, lo stesso catalogo che il sito
 * scrive nel database e che l'app mostra in My subscription. Così la pagina e
 * l'app non possono dire prezzi diversi.
 *
 *     {{prezzo:<piano>:mese}}            49        prezzo mensile
 *     {{prezzo:<piano>:anno}}            1.490     prezzo annuale (totale)
 *     {{annuale:mesi-pagati}}            10        mensilità pagate con l'annuale
 *     {{annuale:mesi-gratis}}            2         12 meno le mensilità pagate
 *     {{prova:mesi}}                     2         mesi di prova
 *     {{rapporto:<a>:<b>}}               3         prezzo mensile di a / quello di b
 *     {{quota:<a>:<b>}}                  3         quota sul generato di a / quella di b
 *
 * Con `:parole` un numero si scrive in lettere («dieci», «due», «tre»).
 *
 * Le frasi intorno ai numeri sono testo: «2 mesi gratis» resta vero solo se
 * l'annuale costa le stesse mensilità su ogni piano, «tre volte il Pro» solo
 * se il rapporto è quasi intero, «Marketplace −10%» solo se lo sconto del Pro
 * è ancora 10. Questi fatti si controllano qui: se il catalogo li smentisce
 * la build si ferma e dice quale frase della pagina cambiare. Meglio una build
 * ferma che una pagina che promette una cosa e un checkout che ne fa pagare
 * un'altra.
 */
import { CATALOGO, pianoDelCatalogo, type PianoCatalogo } from '@/lib/catalogo';

const PAROLE: Record<number, string> = {
  2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette',
  8: 'otto', 9: 'nove', 10: 'dieci', 11: 'undici', 12: 'dodici',
};

class ErroreCatalogo extends Error {
  constructor(msg: string) {
    super('Pagina Prezzi e catalogo non sono d\'accordo (src/lib/catalogo.ts, '
          + 'src/content/capital.html): ' + msg);
  }
}

/** Euro all'italiana: 1490 -> «1.490», 4950 centesimi -> «49,50». */
export function euro(cents: number): string {
  const intero = Math.floor(cents / 100);
  const resto = cents % 100;
  const migliaia = String(intero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return resto ? `${migliaia},${String(resto).padStart(2, '0')}` : migliaia;
}

function parole(n: number, cosa: string): string {
  const p = PAROLE[n];
  if (!p) throw new ErroreCatalogo(`${cosa} vale ${n}: la pagina lo scrive in lettere e al plurale, `
                                   + 'quindi la frase va riscritta a mano.');
  return p;
}

function intero(x: number, cosa: string, tolleranza = 1e-9): number {
  const r = Math.round(x);
  if (Math.abs(x - r) > tolleranza) {
    throw new ErroreCatalogo(`${cosa} è ${x.toFixed(2)}, non un numero intero: la frase che lo usa va riscritta.`);
  }
  return r;
}

/** Le mensilità che si pagano con l'annuale: uguali su ogni piano mensile. */
function mesiPagati(): number {
  const mensili = CATALOGO.filter((p) => p.monthlyCents > 0);
  const valori = new Set(mensili.map((p) => intero(p.annualCents / p.monthlyCents,
    `L'annuale di ${p.name} diviso il mensile`)));
  if (valori.size !== 1) {
    throw new ErroreCatalogo('l\'annuale non vale le stesse mensilità su ogni piano '
                             + `(${[...valori].join(', ')}): la pagina dice «su ogni piano a pagamento».`);
  }
  const n = [...valori][0];
  if (n < 1 || n >= 12) throw new ErroreCatalogo(`con l'annuale si pagano ${n} mesi su 12.`);
  return n;
}

/** I mesi di prova: uguali su ogni piano che si compra dal checkout. */
function mesiProva(): number {
  const conProva = CATALOGO.filter((p) => !p.features.sales_only);
  const valori = new Set(conProva.map((p) => Number(p.features.trial_months || 0)));
  if (valori.size !== 1 || ![...valori][0]) {
    throw new ErroreCatalogo('i mesi di prova non sono gli stessi su Pro, Professional e Quant: '
                             + 'la pagina dice «due mesi di prova su ognuno».');
  }
  if (CATALOGO.some((p) => p.features.sales_only && p.features.trial_months)) {
    throw new ErroreCatalogo('Desk ha una prova nel catalogo, ma si vende a contratto dopo una demo.');
  }
  return [...valori][0];
}

/**
 * I fatti dei piani che la pagina scrive in chiaro, nelle schede, nei
 * dettagli e nella tabella di confronto: se il catalogo li cambia, il testo
 * della pagina va cambiato con lui.
 */
function controllaFatti(): void {
  const atteso: [string, string, unknown, string][] = [
    ['pro', 'discount', 10, '«Marketplace −10%, puoi vendere»'],
    ['professional', 'discount', 20, '«Marketplace −20%»'],
    ['quant', 'discount', 20, '«Marketplace −20%»'],
    ['desk', 'discount', 20, '«−20%» nella tabella'],
    ['pro', 'share', 10, '«10% del generato»'],
    ['professional', 'share', 30, '«30% del generato»'],
    ['quant', 'share', 30, '«30% del generato»'],
    ['desk', 'share', 30, '«30% del generato»'],
    ['professional', 'vendor_discount', 10, '«−10% sui vendor di dati»'],
    ['desk', 'seats', 5, '«5 postazioni»'],
    ['professional', 'recommended', true, 'la scheda scura «Consigliato»'],
    ['quant', 'price_from', true, '«da 200 €/mese + dati»'],
    ['desk', 'annual_only', true, '«8.000 €/anno», solo annuale'],
    ['desk', 'sales_only', true, '«Richiedi demo» al posto della prova'],
    ['pro', 'sandbox', 'from 2030', '«Sandbox dati dal 2030»'],
    ['professional', 'raw_history', 'from 2030', '«Storico grezzo dal 2030»'],
    ['quant', 'realtime', 'from 2032', '«Real-time dal 2032»'],
  ];
  for (const [code, chiave, valore, frase] of atteso) {
    const v = pianoDelCatalogo(code).features[chiave];
    if (v !== valore) {
      throw new ErroreCatalogo(`${code}.${chiave} è ${JSON.stringify(v)}, la pagina dice ${frase}.`);
    }
  }
  const consigliati = CATALOGO.filter((p) => p.features.recommended).map((p) => p.code);
  if (consigliati.length !== 1) {
    throw new ErroreCatalogo(`piani consigliati: ${consigliati.join(', ') || 'nessuno'}; la pagina ne mostra uno.`);
  }
  for (const p of CATALOGO) {
    if (p.currency !== 'EUR') throw new ErroreCatalogo(`${p.name} è in ${p.currency}, la pagina scrive €.`);
  }
  if (pianoDelCatalogo('desk').monthlyCents !== 0) {
    throw new ErroreCatalogo('Desk ha un prezzo mensile, la pagina lo vende solo all\'anno.');
  }
}

function prezzo(p: PianoCatalogo, periodo: string): string {
  if (periodo === 'mese') {
    if (!p.monthlyCents) throw new ErroreCatalogo(`${p.name} non ha un prezzo mensile.`);
    return euro(p.monthlyCents);
  }
  if (periodo === 'anno') return euro(p.annualCents);
  throw new ErroreCatalogo(`periodo sconosciuto «${periodo}».`);
}

/** Riempie i segnaposto dei prezzi di un pezzo di pagina. */
export function riempiPrezzi(html: string): string {
  controllaFatti();
  const pagati = mesiPagati();
  const prova = mesiProva();
  const fuori = html.replace(/\{\{([a-z-]+(?::[a-z-]+)*)\}\}/g, (_tutto, chiave: string) => {
    const pezzi = chiave.split(':');
    const inLettere = pezzi[pezzi.length - 1] === 'parole';
    if (inLettere) pezzi.pop();
    let n: number | null = null;
    let testo: string;
    switch (pezzi[0]) {
      case 'prezzo':
        if (inLettere || pezzi.length !== 3) throw new ErroreCatalogo(`segnaposto «${chiave}».`);
        return prezzo(pianoDelCatalogo(pezzi[1]), pezzi[2]);
      case 'annuale':
        if (pezzi[1] === 'mesi-pagati') n = pagati;
        else if (pezzi[1] === 'mesi-gratis') n = 12 - pagati;
        else throw new ErroreCatalogo(`segnaposto «${chiave}».`);
        break;
      case 'prova':
        if (pezzi[1] !== 'mesi') throw new ErroreCatalogo(`segnaposto «${chiave}».`);
        n = prova;
        break;
      case 'rapporto': {
        const a = pianoDelCatalogo(pezzi[1]);
        const b = pianoDelCatalogo(pezzi[2]);
        // «tre volte il Pro»: vero se il rapporto è entro un decimo da un intero
        n = intero(a.monthlyCents / b.monthlyCents,
                   `Il prezzo di ${a.name} diviso quello di ${b.name}`, 0.1);
        break;
      }
      case 'quota': {
        const a = pianoDelCatalogo(pezzi[1]);
        const b = pianoDelCatalogo(pezzi[2]);
        n = intero(Number(a.features.share) / Number(b.features.share),
                   `La quota di ${a.name} divisa quella di ${b.name}`);
        break;
      }
      default:
        throw new ErroreCatalogo(`segnaposto sconosciuto «${chiave}».`);
    }
    testo = inLettere ? parole(n, chiave) : String(n);
    return testo;
  });
  return fuori;
}
