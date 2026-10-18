/**
 * lib/abbonamenti.ts — i quattro livelli, e chi può caricare sul marketplace.
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
 * I QUATTRO LIVELLI
 *
 *     tier 0   non abbonato (predefinito)   sfoglia, scarica, compra
 *     tier 1   Author                       + carica sul marketplace
 *     tier 2   Studio                       + carica sul marketplace
 *     tier 3   Desk                         + carica sul marketplace
 *
 * Oggi i tre livelli a pagamento danno la stessa cosa e differiscono per
 * prezzo: è una scelta dichiarata, non un lavoro a metà. Cosa aggiungere ai
 * due superiori si decide prima di uscire dalla beta, e sarà una UPDATE sulla
 * colonna `features`, non una modifica a questo file.
 *
 * Gli AMMINISTRATORI non sono un livello: passano sopra a tutto, lucchetto
 * compreso. Metterli in un livello li avrebbe fatti scadere.
 */
import { getPool } from '@/lib/pg';
import { isAdminCompleto } from '@/lib/appToken';
import { marketplaceBloccato } from '@/lib/impostazioni';

export type Periodo = 'monthly' | 'annual';
export const PERIODI: Periodo[] = ['monthly', 'annual'];

export type Piano = {
  tier: number;
  code: string;
  name: string;
  tagline: string;
  monthlyCents: number;
  annualCents: number;
  currency: string;
  features: Record<string, any>;
  active: boolean;
  /** I prezzi segnaposto, da cambiare prima di aprire: lo dice il pannello. */
  placeholder: boolean;
  /** Il contenitore del nome su Stripe. Il prezzo resta qui nel database. */
  stripeProductId: string;
};

export type StatoAbbonamento = {
  tier: number;
  stato: string;                 // none | subscribed | past_due | cancelled | unknown
  attivo: boolean;               // abbonamento valido ADESSO
  fino: string | null;           // fine del periodo pagato
  periodo: Periodo | null;
  disdettaDal: string | null;    // disdetto, ma attivo fino a `fino`
  features: Record<string, any>;
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
  const features = (r.features && typeof r.features === 'object') ? r.features : {};
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
    placeholder: !!features.placeholder_price,
    stripeProductId: String(r.stripeProductId || ''),
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
    description: (p.tagline || 'Marketplace publishing').slice(0, 300),
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
  if (!Number.isInteger(t) || t < 1 || t > 3) return null;
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
    periodo: null, disdettaDal: null, features: {},
  };
  if (!userId) return vuoto;
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
    const tier = attivo ? Math.max(0, Math.min(3, Number(riga.tier || 0))) : 0;
    const p = tier ? await piano(tier, db) : null;
    return {
      tier,
      stato,
      attivo,
      fino: fino ? fino.toISOString() : null,
      periodo: periodoValido(riga.periodo),
      disdettaDal: riga.disdetta ? new Date(riga.disdetta).toISOString() : null,
      features: p?.features || {},
    };
  } catch {
    // Colonne assenti (migrazione non eseguita). Non si finge un abbonamento
    // e non si finge nemmeno che tutto vada bene: si dice che non si è potuto
    // verificare, e chi chiama lo riporta.
    return { ...vuoto, stato: 'unknown', schemaMancante: true };
  }
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
 *   2. l'ABBONAMENTO. A marketplace aperto, caricare richiede uno dei tre
 *      livelli. Non è il denaro: è che chi pubblica mette il proprio nome
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
          + 'Publishing — free or paid — needs one of the three plans, so '
          + 'that every artifact on the storefront has someone answering '
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
