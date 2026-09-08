/**
 * lib/beta.ts — accesso riservato durante la fase beta.
 *
 * Sta qui e non nel file della rotta perché in Next.js un `route.ts` può
 * esportare soltanto i verbi HTTP: qualunque altra export fa fallire la
 * compilazione. Le funzioni condivise vanno in una libreria, che è anche il
 * posto giusto — le usano il pannello di amministrazione e le due porte
 * d'ingresso, e nessuna di quelle è "la rotta della beta".
 */
import { getPool } from '@/lib/pg';

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

/** Vero se l'indirizzo può entrare. Chiamare solo con la beta attiva. */
export async function ammessoInBeta(pool: any, email: string): Promise<boolean> {
  const db = pool || getPool();
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  try {
    const r = await db.query(
      'SELECT 1 AS x FROM "BetaAccess" WHERE lower(email) = $1 LIMIT 1', [e]);
    return !!r.rows[0];
  } catch {
    return false;
  }
}

/** Vero se la tabella esiste: serve a distinguere "nessun invitato" da
 *  "schema non installato", che a schermo si somigliano. */
export async function tabellaBetaEsiste(pool?: any): Promise<boolean> {
  const db = pool || getPool();
  try {
    const r = await db.query(`SELECT to_regclass('public."BetaAccess"') AS t`);
    return !!r.rows[0]?.t;
  } catch {
    return false;
  }
}
