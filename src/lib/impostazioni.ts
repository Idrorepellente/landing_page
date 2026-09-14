/**
 * lib/impostazioni.ts — interruttori dell'applicazione, letti dal database.
 *
 * Stanno nel database e non in una variabile d'ambiente perche' si devono
 * poter spegnere e riaccendere in un momento, dal pannello, senza un
 * rilascio. Un interruttore che richiede un deploy non viene usato quando
 * serve davvero.
 */
import { getPool } from '@/lib/pg';

/**
 * Gli artefatti a pagamento sono ammessi?
 *
 * SPENTO durante la beta. Con l'interruttore spento il sito non tratta
 * denaro: nessun prezzo, nessun checkout, nessuna commissione. E' cio' che
 * permette di restare sul piano gratuito di Vercel, che vieta l'uso
 * commerciale.
 *
 * In caso di errore risponde FALSE. Se il database non risponde non si sa
 * se la vendita sia permessa, e l'unica risposta prudente e' "no": un
 * pagamento accettato per sbaglio va poi rimborsato, uno rifiutato per
 * sbaglio si ritenta.
 */
export async function venditeAttive(pool?: any): Promise<boolean> {
  const db = pool || getPool();
  try {
    const r = await db.query(
      `SELECT valore FROM "AppSetting" WHERE chiave = 'paid_artifacts_enabled' LIMIT 1`);
    return String(r.rows[0]?.valore || '').toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/** Messaggio unico, cosi' dice la stessa cosa da ogni punto. */
export const VENDITE_SPENTE = {
  error: 'paid artifacts are not enabled',
  detail: 'The platform is in beta: artifacts can be published and shared '
        + 'for free, but not sold. Selling will be enabled at the 1.0 release.',
};
