/**
 * lib/impostazioni.ts — interruttori dell'applicazione, letti dal database.
 *
 * Stanno nel database e non in una variabile d'ambiente perche' si devono
 * poter spegnere e riaccendere in un momento, dal pannello, senza un
 * rilascio. Un interruttore che richiede un deploy non viene usato quando
 * serve davvero.
 */
import { getPool } from '@/lib/pg';

/** La chiave nel database. Il nome vecchio resta nella tabella ma non si
 *  legge piu' da nessuna parte: la migrazione lo ha tradotto in questo. */
const CHIAVE_LUCCHETTO = 'marketplace_locked';

/**
 * Il marketplace e' chiuso?
 *
 * E' L'UNICO INTERRUTTORE del marketplace, e ha due posizioni:
 *
 *   true    nessuno carica (ne' gratis ne' a pagamento), nessuno compra
 *   false   caricare richiede un abbonamento; prezzi e acquisti attivi
 *
 * PERCHE' LA POLARITA' E' INVERTITA rispetto a `paid_artifacts_enabled`, che
 * stava qui prima. Quello spento significava «si pubblica, ma gratis»: non
 * bastava. Durante la beta non si deve poter caricare NIENTE, perche' cio'
 * che entra in vetrina ci resta e il filtro che decide cosa merita starci —
 * l'abbonamento — non era ancora in piedi. La vecchia posizione «si carica
 * ma gratis» non esiste piu': era proprio quella da chiudere.
 *
 * In caso di errore risponde CHIUSO. Se il database non risponde non si sa se
 * il marketplace sia aperto, e l'unica risposta prudente e' «no»: un
 * pagamento accettato per sbaglio va rimborsato e un artefatto pubblicato per
 * sbaglio resta in vetrina, mentre un'operazione rifiutata per sbaglio si
 * ritenta.
 */
export async function marketplaceBloccato(pool?: any): Promise<boolean> {
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT valore FROM "AppSetting" WHERE chiave = $1 LIMIT 1`,
      [CHIAVE_LUCCHETTO]);
    const v = r.rows[0]?.valore;
    // Riga assente = migrazione non eseguita = beta: chiuso.
    if (v === undefined || v === null) return true;
    return String(v).toLowerCase() !== 'false';
  } catch {
    return true;
  }
}

/** Scrive il lucchetto. Ritorna lo stato effettivo dopo la scrittura. */
export async function impostaLucchetto(chiuso: boolean, chi: string,
                                       pool?: any): Promise<boolean> {
  const db = pool || getPool();
  await db.query(
    `INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
     VALUES ($1, $2, $3)
     ON CONFLICT (chiave) DO UPDATE SET
       valore = EXCLUDED.valore,
       "updatedAt" = NOW(),
       "updatedBy" = EXCLUDED."updatedBy"`,
    [CHIAVE_LUCCHETTO, chiuso ? 'true' : 'false', chi]);
  return chiuso;
}

/**
 * Gli artefatti a pagamento sono ammessi?
 *
 * DERIVATA, non piu' un interruttore a se'. Con il marketplace aperto i
 * prezzi sono ammessi e gli acquisti funzionano; con il marketplace chiuso
 * non si compra nulla. Resta come funzione perche' i punti che la chiamavano
 * — il checkout, la rotta che l'app interroga — chiedono esattamente questo,
 * e due nomi per la stessa domanda sarebbero due occasioni di rispondere
 * diversamente.
 */
export async function venditeAttive(pool?: any): Promise<boolean> {
  return !(await marketplaceBloccato(pool));
}

/** Messaggio unico per chi prova a CARICARE a marketplace chiuso. */
export const MARKETPLACE_CHIUSO = {
  error: 'the marketplace is closed',
  detail: 'The platform is in beta: nothing can be uploaded to the '
        + 'marketplace yet, free or paid. Browsing and downloading what is '
        + 'already there stay open.',
};

/** Messaggio unico per chi prova a COMPRARE a marketplace chiuso. */
export const VENDITE_SPENTE = {
  error: 'the marketplace is closed',
  detail: 'The platform is in beta: the artifacts on the storefront cannot '
        + 'be bought or installed yet. Nothing is charged and nothing '
        + 'changes hands until the marketplace opens.',
};
