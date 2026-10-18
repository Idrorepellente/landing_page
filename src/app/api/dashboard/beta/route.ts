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
import {
  betaAttiva, ammessoInBeta, tabellaBetaEsiste, conteggiBeta,
} from '@/lib/beta';

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
    // Gli ultimi iscritti dal form del sito. Si mostrano perché valgono come
    // ammissione: senza, il pannello farebbe credere che l'unica lista sia
    // quella degli inviti, e chiudere fuori qualcuno togliendolo da qui
    // sembrerebbe funzionare mentre non funziona.
    let iscritti: Array<{ email: string; profile: string | null; created_at: any }> = [];
    try {
      const r = await pool.query(
        'SELECT email, profile, created_at FROM beta_signups '
        + 'ORDER BY created_at DESC LIMIT 500');
      iscritti = r.rows.map((x: any) => ({
        email: String(x.email), profile: x.profile ?? null, created_at: x.created_at,
      }));
    } catch {
      // la tabella la crea /api/beta alla prima iscrizione
    }

    const conteggi = await conteggiBeta(pool);

    return NextResponse.json({
      ok: true,
      attiva: await betaAttiva(pool),
      emails,
      iscritti,
      conteggi,
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
      // I due controlli guardavano la sola tabella "BetaAccess", e da quando
      // il cancello è l'UNIONE di tre fonti quella domanda non è più quella
      // giusta: accendere la beta con zero inviti ma cinquanta iscritti dal
      // sito è perfettamente sensato, e veniva rifiutato con un messaggio
      // ormai falso («nessuno potrebbe più entrare»).
      //
      // Ora si controlla la cosa vera, con la stessa funzione che decide
      // l'accesso: c'è qualcuno di ammesso, e fra questi ci sei tu?
      if (acceso) {
        const conteggi = await conteggiBeta(pool);
        if (!conteggi.iscrizioni && !conteggi.inviti) {
          return NextResponse.json({
            error: 'Nessun indirizzo è ammesso: aggiungine almeno uno prima '
                 + 'di attivare la beta.',
            detail: 'Valgono sia le iscrizioni raccolte dal form del sito sia '
                  + 'gli inviti aggiunti qui. Con la beta attiva e nessuno '
                  + 'ammesso, nessuno potrebbe più entrare.',
          }, { status: 409 });
        }
        // Gli amministratori passano il cancello per il solo fatto di essere
        // amministratori, quindi di norma questo controllo non scatta. Resta
        // per il caso in cui chi preme non sia riconosciuto come tale — e
        // allora chiudersi fuori sarebbe reale.
        if (chiede && !(await ammessoInBeta(pool, chiede))) {
          return NextResponse.json({
            error: 'Il tuo indirizzo non risulta ammesso: aggiungilo prima di '
                 + 'attivare la beta.',
            detail: 'Altrimenti resteresti chiuso fuori dall\'applicazione '
                  + 'senza modo di riaprirla.',
          }, { status: 409 });
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
      const r = await pool.query('DELETE FROM "BetaAccess" WHERE email = $1',
                                 [email]);
      // Togliere se stessi mentre la beta è attiva era vietato. Il controllo
      // si fa ora DOPO la cancellazione, e sulla domanda vera: resti ammesso
      // per qualche altra via? Un amministratore sì, sempre — e vietargli di
      // togliere il proprio invito era un divieto senza causa.
      if (chiede && email === chiede && await betaAttiva(pool)
          && !(await ammessoInBeta(pool, chiede))) {
        // si rimette com'era: meglio annullare che lasciare chiuso fuori
        await pool.query(
          `INSERT INTO "BetaAccess"(email, "addedBy", nota) VALUES ($1,$2,$3)
           ON CONFLICT (email) DO NOTHING`,
          [email, chiede, 'ripristinato: toglierlo ti chiudeva fuori']);
        return NextResponse.json({
          error: 'Non puoi togliere te stesso mentre la beta è attiva.',
          detail: 'Resteresti chiuso fuori, perché questo indirizzo non è '
                + 'ammesso per nessun\'altra via. Niente è stato cambiato: '
                + 'spegni prima la beta, oppure togli un altro indirizzo.',
        }, { status: 409 });
      }
      if (!r.rowCount) {
        // Non era fra gli INVITI. Può comunque essere ammesso dal form del
        // sito, e dirlo evita di credere di averlo escluso.
        const anche = await ammessoInBeta(pool, email);
        return NextResponse.json({
          error: 'non era nella lista degli inviti',
          detail: anche
            ? 'Questo indirizzo resta però ammesso: è fra le iscrizioni '
              + 'raccolte dal form del sito, oppure è un amministratore. '
              + 'Togliere l\'invito non lo esclude.'
            : undefined,
        }, { status: 404 });
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
