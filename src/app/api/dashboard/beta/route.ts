/**
 * Accesso riservato durante la beta: elenco degli ammessi e interruttore.
 *
 * Perché sta sul sito e non nell'applicazione: l'accesso si decide qui,
 * dove le credenziali vengono verificate. Un controllo fatto nell'app
 * sarebbe aggirabile da chiunque ne modifichi una copia.
 *
 * Solo gli amministratori possono leggere e modificare: l'elenco contiene
 * indirizzi email di persone reali.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { betaAttiva, ammessoInBeta, tabellaBetaEsiste } from '@/lib/beta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const pool = getPool();
    let emails: string[] = [];
    try {
      const r = await pool.query(
        'SELECT email, "addedBy", "addedAt" FROM "BetaAccess" '
        + 'ORDER BY "addedAt" DESC LIMIT 500');
      emails = r.rows.map((x: any) => String(x.email));
    } catch {
      // la tabella può non esistere ancora
    }
    return NextResponse.json({
      ok: true,
      attiva: await betaAttiva(pool),
      emails,
      // Serve al pannello per dire cosa manca invece di mostrare un elenco
      // vuoto che sembra "nessuno invitato".
      schema: emails.length > 0 || (await tabellaBetaEsiste(pool)),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    const azione = String(b?.azione || '').trim();
    const chiede = String(b?.richiedente || '').trim().toLowerCase();
    const pool = getPool();

    if (azione === 'interruttore') {
      const acceso = !!b?.attiva;

      // ── NON CI SI CHIUDE FUORI DA SOLI ────────────────────────────────
      // Accendere la beta con l'elenco vuoto, o senza il proprio indirizzo,
      // significa non poter più entrare per riaprire: l'unico rimedio
      // sarebbe il database a mano. Si blocca prima che accada.
      if (acceso) {
        const r = await pool.query('SELECT COUNT(*)::int AS n FROM "BetaAccess"');
        if (!Number(r.rows[0]?.n || 0)) {
          return NextResponse.json({
            error: 'La lista è vuota: aggiungi almeno un indirizzo prima di '
                 + 'attivare la beta.',
            detail: 'Con la beta attiva e nessun indirizzo ammesso, nessuno '
                  + 'potrebbe più entrare — nemmeno tu.',
          }, { status: 409 });
        }
        if (chiede) {
          const mio = await pool.query(
            'SELECT 1 AS x FROM "BetaAccess" WHERE lower(email) = $1 LIMIT 1',
            [chiede]);
          if (!mio.rows[0]) {
            return NextResponse.json({
              error: 'Il tuo indirizzo non è nella lista: aggiungilo prima di '
                   + 'attivare la beta.',
              detail: 'Altrimenti resteresti chiuso fuori dall\'applicazione '
                    + 'senza modo di riaprirla.',
            }, { status: 409 });
          }
        }
      }

      await pool.query(
        `INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
         VALUES ('beta_enabled', $1, $2)
         ON CONFLICT (chiave) DO UPDATE SET
           valore = EXCLUDED.valore,
           "updatedAt" = NOW(),
           "updatedBy" = EXCLUDED."updatedBy"`,
        [acceso ? 'true' : 'false', chiede || 'admin']);
      return NextResponse.json({ ok: true, attiva: acceso });
    }

    const email = String(b?.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 });
    }

    if (azione === 'aggiungi') {
      await pool.query(
        `INSERT INTO "BetaAccess"(email, "addedBy", nota)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET "addedBy" = EXCLUDED."addedBy"`,
        [email, chiede || 'admin', String(b?.nota || '').slice(0, 200) || null]);
      return NextResponse.json({ ok: true, email, azione });
    }

    if (azione === 'rimuovi') {
      // Togliere se stessi mentre la beta è attiva è lo stesso errore di
      // accenderla senza esserci dentro, solo compiuto in un altro ordine.
      if (chiede && email === chiede && await betaAttiva(pool)) {
        return NextResponse.json({
          error: 'Non puoi togliere te stesso mentre la beta è attiva.',
          detail: 'Resteresti chiuso fuori. Spegni prima la beta, oppure '
                + 'togli un altro indirizzo.',
        }, { status: 409 });
      }
      const r = await pool.query('DELETE FROM "BetaAccess" WHERE email = $1',
                                 [email]);
      if (!r.rowCount) {
        return NextResponse.json({ error: 'non era nella lista' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, email, azione });
    }

    return NextResponse.json({
      error: 'azione sconosciuta: aggiungi, rimuovi o interruttore',
    }, { status: 400 });
  } catch (e: any) {
    const testo = String(e?.message || e);
    if (/relation .*(BetaAccess|AppSetting).* does not exist/i.test(testo)) {
      return NextResponse.json({
        error: 'Le tabelle della beta non esistono ancora.',
        detail: 'Esegui marketplace_beta.sql sul Postgres del sito.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: testo }, { status: 500 });
  }
}
