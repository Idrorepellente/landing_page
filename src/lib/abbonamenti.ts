/**
 * lib/abbonamenti.ts — i piani, e chi può caricare sul marketplace.
 *
 * UN SOLO POSTO DOVE SI DECIDE. La domanda «questa persona può pubblicare?»
 * arriva da tre strade diverse: il canale dati dell'app (`/api/app/db`, dove
 * passano le INSERT sull'Artifact), la pubblicazione di una versione
 * (`/api/market/publish`) e l'app stessa, che la chiede per sapere cosa
 * mostrare. Se la risposta la calcolasse ognuno per conto proprio, prima o
 * poi una delle tre direbbe sì mentre le altre dicono no — e quella sarebbe
 * la porta aperta.
 *
 * IL CONTROLLO STA QUI E NON NELL'APP perché l'applicazione gira sul computer
 * di chi la usa: il suo «sei abbonato?» lo può togliere. Il server è l'unico
 * punto che non si può modificare dall'esterno.
 *
 * I CINQUE LIVELLI — gli stessi della pagina Prezzi del sito
 *
 *     tier 0   Gratuito (predefinito)   l'app intera; marketplace: sfoglia,
 *                                       scarica, compra
 *     tier 1   Pro                      privacy totale, vende sul marketplace
 *     tier 2   Professional             + storico grezzo, 30% del generato
 *     tier 3   Quant                    + real-time, add-on dati a parte
 *     tier 4   Desk                     5 postazioni, sui server dello studio;
 *                                       si vende a contratto, non dal checkout
 *
 * I livelli sono in ORDINE DI PIANO: l'app li confronta per dire «passa a» o
 * «scendi a». Nomi, prezzi e voci stanno nella tabella "SubscriptionPlan"
 * (le scrive marketplace_abbonamenti.sql): qui non c'è un prezzo né una frase
 * del catalogo.
 *
 * Gli AMMINISTRATORI non sono un livello: passano sopra a tutto, lucchetto
 * compreso. Metterli in un livello li avrebbe fatti scadere.
 */
import { getPool } from '@/lib/pg';
import { isAdminCompleto } from '@/lib/appToken';
import { marketplaceBloccato } from '@/lib/impostazioni';

export type Periodo = 'monthly' | 'annual';
export const PERIODI: Periodo[] = ['monthly', 'annual'];

/** Il livello più alto (Desk). Tutti i controlli di intervallo passano da qui. */
export const TIER_MAX = 4;

/**
 * Le chiavi di `features` che dicono COME presentare il piano, non cosa dà.
 * Escono da `features` e diventano campi del piano: un'app già installata non
 * le conosce e, trovandole dentro `features`, le scriverebbe fra le
 * funzionalità («Highlights: …», «Trial months: 2»).
 */
const CHIAVI_SCHEDA = ['highlights', 'badge', 'trial_months', 'annual_only',
                       'sales_only', 'price_from', 'placeholder_price'];

export type Piano = {
  tier: number;
  code: string;
  name: string;
  tagline: string;
  monthlyCents: number;
  annualCents: number;
  currency: string;
  /** I fatti del piano (privacy, sconto, sandbox, quota…), per la tabella. */
  features: Record<string, any>;
  active: boolean;
  /** I prezzi segnaposto, da cambiare prima di aprire: lo dice il pannello. */
  placeholder: boolean;
  /** Il contenitore del nome su Stripe. Il prezzo resta qui nel database. */
  stripeProductId: string;
  /** Le voci della scheda, nell'ordine del sito. */
  highlights: string[];
  /** L'etichetta della scheda («5 seats»), o vuota. */
  badge: string;
  /** Mesi di prova offerti con il piano; 0 = nessuna prova. */
  trialMonths: number;
  /** Si paga solo l'anno (Desk). */
  annualOnly: boolean;
  /** Non si compra dal checkout: demo e contratto (Desk). */
  salesOnly: boolean;
  /** Il prezzo è «da»: gli add-on dati sono a parte (Quant). */
  priceFrom: boolean;
};

export type StatoAbbonamento = {
  tier: number;
  stato: string;                 // none | subscribed | past_due | cancelled | unknown
  attivo: boolean;               // abbonamento valido ADESSO
  fino: string | null;           // fine del periodo pagato
  periodo: Periodo | null;
  disdettaDal: string | null;    // disdetto, ma attivo fino a `fino`
  features: Record<string, any>;
  /** Fine della prova in corso, se c'è una prova in corso. */
  provaFino: string | null;
  /** Lo schema non è installato: non si sa, e non sapere vale come «no». */
  schemaMancante?: boolean;
};

/** Periodo valido, o null. Non si indovina: un periodo sbagliato è un prezzo
 *  sbagliato, e un prezzo sbagliato è un addebito sbagliato. */
export function periodoValido(x: any): Periodo | null {
  const s = String(x || '').trim().toLowerCase();
  if (s === 'monthly' || s === 'month' || s === 'mensile') return 'monthly';
  if (s === 'annual' || s === 'year' || s === 'yearly' || s === 'annuale') return 'annual';
  return null;
}

export function prezzoCents(p: Piano, periodo: Periodo): number {
  return periodo === 'annual' ? p.annualCents : p.monthlyCents;
}

/** L'intervallo di ricorrenza come lo vuole Stripe. */
export function intervalloStripe(periodo: Periodo): 'month' | 'year' {
  return periodo === 'annual' ? 'year' : 'month';
}

function riga2piano(r: any): Piano {
  const tutte = (r.features && typeof r.features === 'object' && !Array.isArray(r.features))
    ? r.features : {};
  const features: Record<string, any> = {};
  for (const [k, v] of Object.entries(tutte)) {
    if (!CHIAVI_SCHEDA.includes(k)) features[k] = v;
  }
  const mesi = Math.round(Number(tutte.trial_months || 0));
  return {
    tier: Number(r.tier),
    code: String(r.code || ''),
    name: String(r.name || ''),
    tagline: String(r.tagline || ''),
    monthlyCents: Number(r.monthlyCents || 0),
    annualCents: Number(r.annualCents || 0),
    currency: String(r.currency || 'EUR').toUpperCase(),
    features,
    active: r.active !== false,
    placeholder: !!tutte.placeholder_price,
    stripeProductId: String(r.stripeProductId || ''),
    highlights: Array.isArray(tutte.highlights)
      ? tutte.highlights.filter((x: any) => typeof x === 'string' && x.trim()).map(String)
      : [],
    badge: typeof tutte.badge === 'string' ? tutte.badge : '',
    // Una prova fuori misura è un errore di battitura nella tabella, non un
    // regalo da fare: oltre un anno non si concede.
    trialMonths: Number.isFinite(mesi) && mesi > 0 ? Math.min(mesi, 12) : 0,
    annualOnly: !!tutte.annual_only,
    salesOnly: !!tutte.sales_only,
    priceFrom: !!tutte.price_from,
  };
}

/**
 * Il prodotto Stripe del piano, creandolo la prima volta.
 *
 * Contiene SOLO il nome: il prezzo resta nelle colonne del database, ed e'
 * questa la ragione per cui qui non si crea anche un Price. Un prodotto serve
 * comunque, perche' per cambiare il livello di un abbonamento in corso
 * applicando il conguaglio del periodo gia' pagato l'API pretende un prodotto
 * esistente a cui agganciare il prezzo nuovo. Senza, un passaggio di livello
 * vorrebbe dire disdire e riabbonarsi, buttando i giorni gia' pagati.
 *
 * L'id si salva: ricrearlo a ogni chiamata riempirebbe il catalogo Stripe di
 * duplicati, e le fatture dei clienti mostrerebbero ogni volta un prodotto
 * diverso per la stessa cosa.
 */
export async function prodottoStripe(p: Piano, pool?: any): Promise<string> {
  if (p.stripeProductId) return p.stripeProductId;
  const db = pool || getPool();
  const { stripeCall } = await import('@/lib/stripe');
  const prod = await stripeCall('/products', {
    name: `Lyra ${p.name}`,
    description: (p.tagline || `Lyra ${p.name} plan`).slice(0, 300),
    metadata: { tier: String(p.tier), code: p.code },
  }, { idempotencyKey: 'prod:lyra:' + p.code });
  const id = String(prod.id || '');
  if (id) {
    await db.query(
      `UPDATE "SubscriptionPlan" SET "stripeProductId" = $2, "updatedAt" = NOW()
        WHERE tier = $1`, [p.tier, id]).catch(() => {});
    p.stripeProductId = id;
  }
  return id;
}

/**
 * Il catalogo. Vuoto se la tabella non c'è: chi chiama mostra «non ancora
 * configurato» invece di inventarsi dei prezzi.
 */
export async function piani(pool?: any): Promise<Piano[]> {
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT tier, code, name, tagline, "monthlyCents", "annualCents",
              currency, features, active, "stripeProductId"
         FROM "SubscriptionPlan"
        WHERE active = TRUE
        ORDER BY tier`);
    return r.rows.map(riga2piano);
  } catch {
    return [];
  }
}

export async function piano(tier: number, pool?: any): Promise<Piano | null> {
  const t = Number(tier);
  if (!Number.isInteger(t) || t < 1 || t > TIER_MAX) return null;
  const tutti = await piani(pool);
  return tutti.find((p) => p.tier === t) || null;
}

/**
 * Stato dell'abbonamento di una persona.
 *
 * `attivo` guarda la DATA, non solo lo stato: «subscribed» con una scadenza
 * passata non è attivo. Senza questo controllo chi ha disdetto resterebbe
 * abbonato finché qualcuno non gira la colonna a mano.
 *
 * `past_due` (pagamento rifiutato) NON è attivo. Stripe ritenta per giorni e
 * nel frattempo l'abbonamento non vale: trattarlo come valido significherebbe
 * dare il servizio a chi non lo sta pagando, e toglierlo poi è peggio che non
 * darlo subito.
 */
export async function statoAbbonamento(userId: string, pool?: any): Promise<StatoAbbonamento> {
  const db = pool || getPool();
  const vuoto: StatoAbbonamento = {
    tier: 0, stato: 'none', attivo: false, fino: null,
    periodo: null, disdettaDal: null, features: {}, provaFino: null,
  };
  if (!userId) return vuoto;
  let base: StatoAbbonamento;
  try {
    const r = await db.query(
      `SELECT "subscriptionStatus"::text   AS stato,
              "subscriptionTier"           AS tier,
              "subscriptionUntil"          AS fino,
              "subscriptionPeriod"         AS periodo,
              "subscriptionCancelAt"       AS disdetta
         FROM "User" WHERE id = $1 LIMIT 1`, [userId]);
    const riga = r.rows[0];
    if (!riga) return vuoto;

    const stato = String(riga.stato || 'none').toLowerCase();
    const fino = riga.fino ? new Date(riga.fino) : null;
    const scaduto = !!fino && fino.getTime() <= Date.now();
    const attivo = stato === 'subscribed' && !scaduto;
    // Il livello conta solo se l'abbonamento vale: un livello 3 scaduto è un
    // livello 0, altrimenti le funzionalità sopravvivrebbero al pagamento.
    const tier = attivo ? Math.max(0, Math.min(TIER_MAX, Number(riga.tier || 0))) : 0;
    const p = tier ? await piano(tier, db) : null;
    base = {
      tier,
      stato,
      attivo,
      fino: fino ? fino.toISOString() : null,
      periodo: periodoValido(riga.periodo),
      disdettaDal: riga.disdetta ? new Date(riga.disdetta).toISOString() : null,
      features: p?.features || {},
      provaFino: null,
    };
  } catch {
    // Colonne assenti (migrazione non eseguita). Non si finge un abbonamento
    // e non si finge nemmeno che tutto vada bene: si dice che non si è potuto
    // verificare, e chi chiama lo riporta.
    return { ...vuoto, stato: 'unknown', schemaMancante: true };
  }

  // La prova si legge A PARTE. Le sue colonne sono le ultime arrivate: se il
  // file SQL che le aggiunge non è ancora passato, l'abbonamento si legge lo
  // stesso e manca solo la data della prova, invece di risultare «non
  // verificabile» per tutti.
  if (base.attivo) {
    try {
      const t = await db.query(
        'SELECT "subscriptionTrialEnd" AS pf FROM "User" WHERE id = $1', [userId]);
      const pf = t.rows[0]?.pf ? new Date(t.rows[0].pf) : null;
      if (pf && pf.getTime() > Date.now()) base.provaFino = pf.toISOString();
    } catch { /* colonna assente */ }
  }
  return base;
}

/**
 * La prova di due mesi è ancora disponibile per questo account?
 *
 * UNA PER ACCOUNT, e solo per chi non ha mai avuto un abbonamento su Stripe:
 * chi ha già pagato un piano conosce il prodotto, e chi ha già fatto una
 * prova l'ha avuta. `trialUsedAt` non si svuota mai, quindi disdire durante
 * la prova e riabbonarsi riparte pagando.
 *
 * Nel dubbio NO: se le colonne non ci sono (file SQL non eseguito) non si sa
 * se la prova è già stata usata, e regalare due mesi per un errore di
 * configurazione è un danno che non si ripara.
 */
export async function provaDisponibile(userId: string, pool?: any): Promise<boolean> {
  if (!userId) return false;
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT "trialUsedAt" AS usata, "stripeSubscriptionId" AS sub
         FROM "User" WHERE id = $1 LIMIT 1`, [userId]);
    const riga = r.rows[0];
    if (!riga) return false;
    return !riga.usata && !riga.sub;
  } catch {
    return false;
  }
}

/**
 * Fine della prova, in secondi, partendo da `inizioSec`.
 *
 * Mesi DI CALENDARIO, come dice il sito («due mesi di prova»), non 60
 * giorni. Si parte dall'istante passato e non da `Date.now()`: il checkout
 * usa il minuto della sua chiave di idempotenza, e due clic nello stesso
 * minuto devono mandare a Stripe la stessa data.
 */
export function fineProvaSec(inizioSec: number, mesi: number): number {
  const d = new Date(inizioSec * 1000);
  const giorno = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + mesi);
  // 31 dicembre + 2 mesi non è il 3 marzo: si torna all'ultimo giorno del
  // mese giusto invece di sconfinare nel successivo.
  if (d.getUTCDate() !== giorno) d.setUTCDate(0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Il livello di un piano a partire dal suo codice o dal suo prodotto Stripe.
 *
 * Serve al webhook. Il numero del livello nei metadati di un abbonamento è
 * quello di quando è nato: Desk era il livello 3 prima che arrivasse Quant, e
 * un abbonamento Desk di allora porta ancora «tier 3». Il codice del piano
 * (scritto nei metadati da ora in poi) e il prodotto Stripe non cambiano con
 * la numerazione, quindi si guardano prima del numero.
 */
export async function tierDelPiano(codice: string, prodotto: string,
                                   pool?: any): Promise<number> {
  const db = pool || getPool();
  try {
    if (codice) {
      const r = await db.query(
        'SELECT tier FROM "SubscriptionPlan" WHERE code = $1 LIMIT 1', [codice]);
      if (r.rows[0]) return Number(r.rows[0].tier);
    }
    if (prodotto) {
      const r = await db.query(
        'SELECT tier FROM "SubscriptionPlan" WHERE "stripeProductId" = $1 LIMIT 1',
        [prodotto]);
      if (r.rows[0]) return Number(r.rows[0].tier);
    }
  } catch { /* tabella assente: chi chiama usa il numero */ }
  return 0;
}

// ===========================================================================
//  I DUE PERMESSI
// ===========================================================================

export type Esito =
  | { ok: true; via: 'admin' | 'abbonamento' }
  | { ok: false; codice: 'locked' | 'no_subscription' | 'schema'; error: string; detail: string };

/**
 * Può caricare sul marketplace?
 *
 * DUE STRATI, in quest'ordine, e l'ordine è il punto di tutta la modifica:
 *
 *   1. il LUCCHETTO. Durante la beta nessuno carica niente — né gratis né a
 *      pagamento. Prima lo strato successivo lasciava pubblicare gratis, e
 *      ciò che entrava in vetrina ci restava senza che nessun filtro fosse
 *      ancora in piedi;
 *   2. l'ABBONAMENTO. A marketplace aperto, caricare richiede un piano a
 *      pagamento (dal Pro in su). Non è il denaro: è che chi pubblica mette il proprio nome
 *      accanto a una strategia che altri faranno girare sui propri soldi, e
 *      un filtro all'ingresso vale più di qualunque moderazione a valle.
 *
 * Gli amministratori passano sopra entrambi.
 */
export async function puoPubblicare(userId: string, email: string | undefined,
                                    pool?: any): Promise<Esito> {
  const db = pool || getPool();
  if (await isAdminCompleto(email, db)) return { ok: true, via: 'admin' };

  if (await marketplaceBloccato(db)) {
    return {
      ok: false, codice: 'locked',
      error: 'the marketplace is closed',
      detail: 'The platform is in beta: nothing can be uploaded to the '
            + 'marketplace yet, free or paid. What goes on the storefront '
            + 'stays there, and the filter that decides what belongs is not '
            + 'in place yet. Browsing and downloading what is already there '
            + 'stay open.',
    };
  }

  const st = await statoAbbonamento(userId, db);
  if (st.attivo) return { ok: true, via: 'abbonamento' };
  if (st.schemaMancante) {
    return {
      ok: false, codice: 'schema',
      error: 'subscriptions are not installed on the site database',
      detail: 'Run marketplace_abbonamenti.sql on the site Postgres. Until '
            + 'then nobody can publish, because there is no way to tell who '
            + 'is entitled to.',
    };
  }
  return {
    ok: false, codice: 'no_subscription',
    error: 'publishing requires a subscription',
    detail: 'Browsing, downloading and buying stay open to everyone. '
          + 'Publishing — free or paid — needs a paid plan (Pro or higher), '
          + 'so that every artifact on the storefront has someone answering '
          + 'for it.',
  };
}

/**
 * Può comprare o scaricare dal marketplace?
 *
 * Lo stesso lucchetto, senza il secondo strato: comprare non richiede un
 * abbonamento, né adesso né dopo. Durante la beta però non si compra nulla,
 * anche se in vetrina ci sono già dei prodotti.
 *
 * Gli amministratori passano: devono poter scaricare qualunque artefatto,
 * gratuito o a pagamento, per verificare una contestazione o controllare cosa
 * c'è davvero dentro una pubblicazione.
 */
export async function puoAcquistare(email: string | undefined,
                                    pool?: any): Promise<Esito> {
  const db = pool || getPool();
  if (await isAdminCompleto(email, db)) return { ok: true, via: 'admin' };
  if (await marketplaceBloccato(db)) {
    return {
      ok: false, codice: 'locked',
      error: 'the marketplace is closed',
      detail: 'The platform is in beta: the artifacts on the storefront '
            + 'cannot be bought or installed yet. Nothing is charged and '
            + 'nothing changes hands until the marketplace opens.',
    };
  }
  return { ok: true, via: 'abbonamento' };
}
