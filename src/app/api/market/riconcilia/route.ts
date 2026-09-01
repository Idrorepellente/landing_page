/**
 * Recupero di un acquisto pagato ma senza licenza.
 *
 * Il webhook puo' mancare il bersaglio: consegna persa, evento scartato come
 * duplicato dopo un tentativo andato male, oppure un difetto corretto DOPO
 * che il pagamento era gia' avvenuto. In tutti quei casi il denaro e' stato
 * incassato e l'utente non ha nulla — la situazione peggiore.
 *
 * Qui si ricontrolla PRESSO STRIPE, che e' l'unica fonte attendibile: se il
 * pagamento risulta incassato, la licenza si apre. Non ci si fida di quello
 * che dice il client, mai.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const auth = tokenFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }
    const artifactId = String(b?.artifactId || '');
    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId mancante' }, { status: 400 });
    }

    const pool = getPool();

    // Solo acquisti DI CHI CHIEDE: un identificativo altrui non deve poter
    // aprire una licenza a nome proprio.
    const r = await pool.query(
      `SELECT id, status::text AS status, "providerRef", "artifactId", "buyerId"
         FROM "Purchase"
        WHERE "artifactId" = $1 AND "buyerId" = $2
        ORDER BY "createdAt" DESC LIMIT 1`, [artifactId, auth.uid]);
    const acq = r.rows[0];
    if (!acq) {
      return NextResponse.json({ ok: false, error: 'nessun acquisto trovato' },
                               { status: 404 });
    }

    const lic = await pool.query(
      `SELECT id FROM "License" WHERE "artifactId"=$1 AND "userId"=$2
         AND status='active'`, [artifactId, auth.uid]);
    if (lic.rows[0]) {
      return NextResponse.json({ ok: true, gia: true });
    }

    // ---- si chiede a Stripe -------------------------------------------
    const rif = String(acq.providerRef || '');
    let incassato = false;
    if (rif.startsWith('cs_')) {
      const sess = await stripeCall('/checkout/sessions/' + rif);
      incassato = sess?.payment_status === 'paid';
    } else if (rif.startsWith('pi_')) {
      const pi = await stripeCall('/payment_intents/' + rif);
      incassato = pi?.status === 'succeeded';
    }
    if (!incassato) {
      return NextResponse.json({
        ok: false,
        error: 'Stripe non conferma il pagamento di questo acquisto.',
        detail: 'Se hai pagato pochi secondi fa, riprova fra poco. '
              + 'Riferimento: ' + (rif || acq.id),
      }, { status: 409 });
    }

    // ---- si apre la licenza -------------------------------------------
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      await cli.query(
        `UPDATE "Purchase" SET status='paid', "paidAt"=COALESCE("paidAt", NOW())
          WHERE id=$1`, [acq.id]);
      const nuovaLic = await cli.query(
        `INSERT INTO "License" (id, "artifactId", "userId", status, "expiresAt",
                                "purchaseId", "releaseId")
         SELECT gen_random_uuid()::text, $1, $2, 'active'::license_status, NULL, $3,
                (SELECT id FROM "ArtifactRelease"
                  WHERE "artifactId"=$1 AND "isCurrent"
                  ORDER BY "createdAt" DESC LIMIT 1)
         ON CONFLICT ("artifactId","userId") DO UPDATE
           SET status='active'::license_status, "updatedAt"=NOW()
         RETURNING id`, [artifactId, auth.uid, acq.id]);
      await cli.query('UPDATE "Purchase" SET "licenseId"=$2 WHERE id=$1',
                      [acq.id, nuovaLic.rows[0]?.id || null]);
      await cli.query('COMMIT');
    } catch (e) {
      await cli.query('ROLLBACK');
      throw e;
    } finally {
      cli.release();
    }

    return NextResponse.json({ ok: true, recuperato: true });
  } catch (e: any) {
    const testo = String(e?.message || e);
    return NextResponse.json({
      error: 'Recupero non riuscito.', detail: testo, raw: testo,
    }, { status: 500 });
  }
}
