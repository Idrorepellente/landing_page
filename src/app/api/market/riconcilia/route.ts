/**
 * Riconciliazione di un pagamento rimasto a meta'.
 *
 * Il webhook e' l'unico a creare la licenza. Se non arriva — o arriva e non
 * completa — chi ha pagato resta senza accesso e non ha modo di uscirne: il
 * pulsante ripropone l'acquisto, e pagare di nuovo non risolve.
 *
 * Qui si chiede a STRIPE come e' andata davvero. Se il pagamento risulta
 * incassato, si completa il lavoro che il webhook non ha fatto. La fonte
 * della verita' resta Stripe: non ci si fida di quello che dice il browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall } from '@/lib/stripe';
import { pagamentoRiuscito } from '../webhook/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = tokenFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
    }
    let body: any = {};
    try { body = await req.json(); } catch { /* vuoto */ }
    const artifactId = String(body?.artifactId || '');
    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId mancante' }, { status: 400 });
    }

    const pool = getPool();

    // Solo i PROPRI pagamenti: `buyerId` viene dal token, non dalla richiesta.
    const p = await pool.query(
      `SELECT id, status::text AS status, "providerRef"
         FROM "Purchase"
        WHERE "artifactId" = $1 AND "buyerId" = $2
        ORDER BY "createdAt" DESC LIMIT 5`, [artifactId, auth.uid]);
    if (!p.rows.length) {
      return NextResponse.json({
        ok: false, error: 'nessun pagamento trovato per questo artefatto',
      }, { status: 404 });
    }

    const esiti: any[] = [];
    for (const acq of p.rows) {
      const ref = String(acq.providerRef || '');
      if (!ref.startsWith('cs_')) {
        esiti.push({ id: acq.id, esito: 'nessuna sessione Stripe collegata' });
        continue;
      }
      // Si chiede a Stripe, non al database: se il webhook ha sbagliato, il
      // database e' proprio la fonte da non credere.
      let sess: any = null;
      try {
        sess = await stripeCall('/checkout/sessions/' + encodeURIComponent(ref),
                                undefined, { method: 'GET' });
      } catch (e: any) {
        esiti.push({ id: acq.id, esito: 'Stripe non raggiungibile: '
                                        + String(e?.message || e) });
        continue;
      }
      if (sess?.payment_status !== 'paid') {
        esiti.push({ id: acq.id,
                     esito: 'non risulta incassato (' + sess?.payment_status + ')' });
        continue;
      }
      const motivo = await pagamentoRiuscito(pool, sess);
      esiti.push({ id: acq.id, esito: motivo || 'completato' });
    }

    // Ha funzionato?
    const lic = await pool.query(
      `SELECT 1 FROM "License" WHERE "artifactId" = $1 AND "userId" = $2
         AND status = 'active'::license_status LIMIT 1`, [artifactId, auth.uid]);

    return NextResponse.json({
      ok: !!lic.rows[0], licenza: !!lic.rows[0], esiti,
      error: lic.rows[0] ? undefined
        : 'il pagamento non ha potuto essere completato: ' +
          esiti.map((e) => e.esito).join('; '),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
