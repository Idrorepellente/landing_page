/**
 * lib/catalogo.ts — I PIANI A PAGAMENTO, IN UN POSTO SOLO.
 *
 * Nomi, prezzi e voci dei quattro piani (Pro, Professional, Quant, Desk; il
 * Gratuito non è una riga) si decidono QUI e da nessun'altra parte. Da questo
 * file partono:
 *
 *   - la pagina Prezzi del sito: in src/content/capital.html i prezzi sono
 *     segnaposto ({{prezzo:pro:mese}}…) che src/content/capital.ts riempie a
 *     build-time, e lo stesso file controlla che le frasi che dipendono dai
 *     prezzi («10 mesi su 12», «2 mesi gratis», «tre volte il Pro») restino
 *     vere: se un prezzo nuovo le smentisce, la build si ferma e dice quale
 *     frase cambiare;
 *   - il database ("SubscriptionPlan"): il sito lo allinea da solo alla prima
 *     richiesta dopo ogni rilascio (lib/allineaCatalogo.ts). L'app (pagina My
 *     subscription), il checkout, il webhook e il pannello leggono da lì.
 *
 * PERCHÉ. Prima i prezzi stavano in due posti: nel markup della pagina e
 * nella tabella, che scriveva a mano marketplace_abbonamenti.sql e che si
 * ritoccava dal pannello. Bastava non eseguire il file SQL (o ritoccare un
 * prezzo dal pannello) perché l'app mostrasse piani e prezzi diversi da quelli
 * del sito. Ora per cambiare un prezzo si cambia qui e si pubblica il sito:
 * pagina, database, app e checkout cambiano insieme.
 *
 * Le parole sono in inglese perché le legge l'app, che è in inglese; la pagina
 * del sito ha le sue frasi in italiano e prende da qui i numeri.
 *
 * COSA C'È IN `features`. Due specie di chiavi.
 *
 * I FATTI del piano, che l'app mette nella tabella di confronto:
 *
 *     can_publish       vende sul marketplace                       true
 *     privacy           privacy totale su codice e metriche         true
 *     discount          sconto sugli acquisti nel marketplace, %    10 | 20
 *     sandbox           sandbox sui dati istituzionali (testo)      'from 2030'
 *     raw_history       storico grezzo in locale (testo)            'from 2030'
 *     vendor_discount   sconto sui vendor di dati, %                10
 *     realtime          real-time con licenza di borsa (testo)      'from 2032'
 *     data_addons       add-on dati a parte (testo)                 'per market'
 *     share             quota sul generato delle strategie allocate 10 | 30
 *     seats             postazioni                                  5
 *     own_servers, compliance_export, white_label, sla              true
 *     recommended       il piano consigliato                        true
 *
 * Le chiavi di PRESENTAZIONE, che lib/abbonamenti.ts toglie da `features` e
 * passa all'app come campi del piano (un'app vecchia non le conosce e, se le
 * ricevesse dentro `features`, le scriverebbe come funzionalità):
 *
 *     highlights        le voci della scheda, nell'ordine del sito
 *     badge             l'etichetta della scheda
 *     trial_months      mesi di prova (assente = nessuna prova)
 *     annual_only       si paga solo l'anno (Desk)
 *     sales_only        non si compra dal checkout: demo e contratto (Desk)
 *     price_from        il prezzo è «da»: gli add-on dati sono a parte (Quant)
 */
import { createHash } from 'crypto';

export type PianoCatalogo = {
  tier: number;
  code: string;
  name: string;
  tagline: string;
  /** Prezzi in CENTESIMI. L'annuale è il totale dell'anno, non un mensile. */
  monthlyCents: number;
  annualCents: number;
  currency: string;
  features: Record<string, unknown>;
};

export const CATALOGO: readonly PianoCatalogo[] = [
  {
    tier: 1, code: 'pro', name: 'Pro',
    tagline: 'Full privacy. Sandbox from 2030.',
    monthlyCents: 4900, annualCents: 49000, currency: 'EUR',
    features: {
      can_publish: true, privacy: true, discount: 10,
      sandbox: 'from 2030', share: 10,
      trial_months: 2,
      highlights: ['Everything in Free', 'Full privacy',
                   'Marketplace −10%, you can sell',
                   'Data sandbox from 2030', '10% of earnings'],
    },
  },
  {
    tier: 2, code: 'professional', name: 'Professional',
    tagline: 'Raw history on your machine. And 30% of earnings.',
    monthlyCents: 14900, annualCents: 149000, currency: 'EUR',
    features: {
      can_publish: true, privacy: true, discount: 20,
      sandbox: 'more markets, from 2030',
      raw_history: 'from 2030', vendor_discount: 10,
      share: 30, recommended: true,
      trial_months: 2,
      highlights: ['Everything in Pro', 'Raw history from 2030',
                   '−10% on data vendors', 'Marketplace −20%',
                   'Sandbox on more markets', '30% of earnings'],
    },
  },
  {
    tier: 3, code: 'quant', name: 'Quant',
    tagline: 'Everything in Professional. Plus real-time.',
    monthlyCents: 20000, annualCents: 200000, currency: 'EUR',
    features: {
      can_publish: true, privacy: true, discount: 20,
      sandbox: 'extended, from 2030',
      raw_history: 'from 2030', vendor_discount: 10,
      realtime: 'from 2032', data_addons: 'per market',
      share: 30,
      trial_months: 2, price_from: true,
      badge: 'Real-time from 2032',
      highlights: ['Everything in Professional', 'Real-time from 2032',
                   'Per-market packages', 'Extended sandbox',
                   'Marketplace −20%', '30% of earnings'],
    },
  },
  {
    tier: 4, code: 'desk', name: 'Desk',
    tagline: 'For advisers and boutiques. On your servers.',
    monthlyCents: 0, annualCents: 800000, currency: 'EUR',
    features: {
      can_publish: true, privacy: true, discount: 20,
      sandbox: 'extended, from 2030',
      raw_history: 'from 2030', vendor_discount: 10,
      realtime: 'from 2032', data_addons: 'per market',
      share: 30, seats: 5, own_servers: true,
      compliance_export: true, white_label: true, sla: true,
      annual_only: true, sales_only: true,
      badge: '5 seats',
      highlights: ['Everything in Quant', '5 seats', 'On your servers',
                   'Compliance export', 'White-label and SLA',
                   '30% of earnings'],
    },
  },
];

/** Il piano di un codice ('pro', 'professional', 'quant', 'desk'). */
export function pianoDelCatalogo(code: string): PianoCatalogo {
  const p = CATALOGO.find((x) => x.code === code);
  if (!p) throw new Error(`catalogo: nessun piano «${code}»`);
  return p;
}

/** JSON con le chiavi in ordine: due oggetti uguali danno lo stesso testo. */
export function jsonCanonico(x: unknown): string {
  if (Array.isArray(x)) return '[' + x.map(jsonCanonico).join(',') + ']';
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return '{' + Object.keys(o).sort()
      .filter((k) => o[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + jsonCanonico(o[k])).join(',') + '}';
  }
  return JSON.stringify(x);
}

/**
 * L'impronta del catalogo: cambia quando cambia qualunque cosa qui sopra.
 * Il sito la scrive nel database accanto ai piani ("AppSetting",
 * `subscription_catalog`), così il pannello sa quale catalogo c'è.
 */
export const IMPRONTA_CATALOGO: string =
  createHash('sha256').update(jsonCanonico(CATALOGO)).digest('hex').slice(0, 16);
