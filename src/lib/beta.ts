/**
 * lib/beta.ts — accesso riservato durante la fase beta.
 *
 * Sta qui e non nel file della rotta perché in Next.js un `route.ts` può
 * esportare soltanto i verbi HTTP: qualunque altra export fa fallire la
 * compilazione. Le funzioni condivise vanno in una libreria, che è anche il
 * posto giusto — le usano il pannello di amministrazione e tutte le porte
 * d'ingresso, e nessuna di quelle è "la rotta della beta".
 *
 * COSA DECIDE, da questa versione
 * -------------------------------
 * Con la beta attiva **gli unici indirizzi che possono entrare o registrarsi**
 * sono quelli ammessi. Qualunque altro tentativo — accesso con password,
 * accesso con Google, iscrizione — viene rifiutato. Prima il controllo valeva
 * solo sulle due porte d'accesso: l'iscrizione restava aperta, e chiunque
 * poteva crearsi un account che poi non riusciva a usare. Un account che
 * nasce e non serve a niente è peggio di un rifiuto: resta nel database, e
 * nessuno sa più perché c'è.
 *
 * TRE FONTI DI AMMISSIONE, in quest'ordine
 * ----------------------------------------
 *   1. AMMINISTRATORI. Non si possono chiudere fuori, mai. Se l'unica lista
 *      fosse una tabella, basterebbe accendere la beta senza esserci dentro
 *      per restare chiusi fuori dal proprio pannello — e per riaprirlo
 *      servirebbe una query a mano sul database.
 *   2. `beta_signups` — chi si è iscritto dal form della landing («Entra
 *      nella beta»). È la fonte principale: la promessa fatta su quel form è
 *      proprio che iscrivendosi si entra.
 *   3. `BetaAccess` — gli inviti aggiunti a mano dal pannello. Servono per chi
 *      non è passato dal form: un collaudatore, un partner, qualcuno invitato
 *      a voce.
 *
 * Sono in UNIONE, non in alternativa. Tenere solo la seconda avrebbe reso
 * decorativa la lista del pannello; tenere solo la terza avrebbe costretto a
 * ricopiare a mano ogni iscrizione.
 *
 * DA NOVEMBRE 2026: NIENTE ISCRIZIONI DURANTE LA BETA
 * ---------------------------------------------------
 * Con la beta attiva NESSUNO crea un account da sé, nemmeno un indirizzo
 * ammesso: gli account li crea il sistema, uno per ogni richiesta dal form del
 * sito (fino al limite) e quelli aggiunti dal pannello (vedi
 * lib/betaAccount.ts). Le porte d'iscrizione — modulo dell'app, codice di
 * conferma, Google per un indirizzo nuovo, il vecchio «primo accesso» dal
 * recupero password — rispondono con BETA_ISCRIZIONI_CHIUSE.
 */
import { getPool } from '@/lib/pg';
import { isAdminCompleto } from '@/lib/appToken';

/** Da dove viene l'ammissione di un indirizzo. */
export type Fonte = 'admin' | 'signup' | 'invito' | null;

/** Vero se la beta è attiva. Un errore vale come "spenta". */
export async function betaAttiva(pool?: any): Promise<boolean> {
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT valore FROM "AppSetting" WHERE chiave = 'beta_enabled' LIMIT 1`);
    return String(r.rows[0]?.valore || '').toLowerCase() === 'true';
  } catch {
    // Tabella assente o database irraggiungibile: NON si chiude fuori
    // nessuno. Un controllo che non si può eseguire non deve trasformarsi
    // in un blocco totale — il rischio è minore del danno.
    return false;
  }
}

/**
 * Da quale delle tre fonti è ammesso questo indirizzo, oppure null.
 *
 * Si restituisce la FONTE e non un sì/no perché serve a due cose che un
 * booleano non copre: scrivere nel pannello da dove viene ciascun ammesso, e
 * capire, quando qualcuno è chiuso fuori per sbaglio, quale lista guardare.
 */
export async function fonteAmmissione(pool: any, email: string): Promise<Fonte> {
  const db = pool || getPool();
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;

  // Gli amministratori per primi: è il controllo che non dipende da nessuna
  // tabella, quindi funziona anche quando lo schema della beta non c'è.
  try {
    if (await isAdminCompleto(e, db)) return 'admin';
  } catch { /* si prosegue con le liste */ }

  // L'iscrizione dal sito. La tabella la crea /api/beta alla prima
  // iscrizione: se non esiste ancora, non ci sono iscritti.
  try {
    const r = await db.query(
      'SELECT 1 AS x FROM beta_signups WHERE lower(email) = $1 LIMIT 1', [e]);
    if (r.rows[0]) return 'signup';
  } catch { /* tabella assente */ }

  // Gli inviti dal pannello.
  try {
    const r = await db.query(
      'SELECT 1 AS x FROM "BetaAccess" WHERE lower(email) = $1 LIMIT 1', [e]);
    if (r.rows[0]) return 'invito';
  } catch { /* tabella assente */ }

  return null;
}

/** Vero se l'indirizzo può entrare. Chiamare solo con la beta attiva. */
export async function ammessoInBeta(pool: any, email: string): Promise<boolean> {
  return (await fonteAmmissione(pool, email)) !== null;
}

/**
 * Vero se ALMENO UNA delle due liste esiste come tabella.
 *
 * Serve a distinguere «nessun ammesso» da «schema non installato», che a
 * schermo si somigliano e portano a due rimedi opposti: nel primo caso si
 * aggiunge qualcuno, nel secondo si esegue un file SQL.
 */
export async function tabellaBetaEsiste(pool?: any): Promise<boolean> {
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT to_regclass('public."BetaAccess"') AS invii,
              to_regclass('public.beta_signups') AS iscrizioni`);
    return !!(r.rows[0]?.invii || r.rows[0]?.iscrizioni);
  } catch {
    return false;
  }
}

/** Quanti indirizzi sono ammessi, per fonte. Per il pannello. */
export async function conteggiBeta(pool?: any): Promise<{ iscrizioni: number; inviti: number }> {
  const db = pool || getPool();
  let iscrizioni = 0;
  let inviti = 0;
  try {
    const r = await db.query('SELECT COUNT(*)::int AS n FROM beta_signups');
    iscrizioni = Number(r.rows[0]?.n || 0);
  } catch { /* tabella assente */ }
  try {
    const r = await db.query('SELECT COUNT(*)::int AS n FROM "BetaAccess"');
    inviti = Number(r.rows[0]?.n || 0);
  } catch { /* tabella assente */ }
  return { iscrizioni, inviti };
}

// ===========================================================================
//  I DUE RIFIUTI
// ===========================================================================
//  Sono due e vanno distinti, perché portano a due azioni diverse e un
//  rifiuto che non porta a nessuna azione è un vicolo cieco.
// ===========================================================================

/** Indirizzo NON ammesso: va chiesto l'accesso alla beta. */
export const BETA_NON_AMMESSO = {
  error: 'This address is not admitted to the beta.',
  detail: 'Lyra is in closed beta: only the addresses that requested it can '
        + 'sign in. Request access on lyra-capital.it (Entra nella beta), or '
        + 'ask whoever runs the beta to add you.',
  code: 'beta_non_ammesso',
};

/**
 * Durante la beta nessuno crea un account da sé: lo crea il sistema.
 * Il motivo si dice, e si dice dove andare: altrimenti si riprova
 * all'infinito credendo a un guasto.
 */
export const BETA_ISCRIZIONI_CHIUSE = {
  error: 'Sign-up is closed during the beta.',
  detail: 'Lyra is in closed beta: accounts are created for the people who '
        + 'request access on lyra-capital.it, and the sign-in details arrive '
        + 'by email when the beta opens. If you already have an account, '
        + 'sign in with it.',
  code: 'beta_iscrizioni_chiuse',
};

/** La richiesta c'e', ma e' arrivata quando i posti erano finiti. */
export const BETA_IN_LISTA = {
  error: 'Your beta request is on the waiting list.',
  detail: 'All beta places were taken when your request arrived: we keep it, '
        + 'and if a place frees up the sign-in details arrive by email.',
  code: 'beta_in_lista',
};

/** Indirizzo ammesso, account non ancora creato o non ancora inviato. */
export const BETA_SENZA_ACCOUNT = {
  error: 'This address has no account yet.',
  detail: 'Accounts are created by the beta team: the sign-in details '
        + '(email and first password) arrive by email when the beta starts.',
  code: 'beta_senza_account',
};

