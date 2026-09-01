import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { verificaFirmaWebhook } from '@/lib/stripe';
import { idNuovo } from '@/lib/marketplace';
import { inviaRicevuta } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Punto di verita' del pagamento.
 *
 * L'accesso all'artefatto si concede SOLO qui, quando Stripe conferma di aver
 * incassato. Il ritorno del browser dopo il pagamento non prova nulla: e' un
 * URL, e chiunque puo' aprirlo.
 *
 * Due difese contro il doppio accredito:
 *   - la firma dell'evento viene verificata (chi non ha il segreto non passa)
 *   - ogni evento gia' elaborato viene registrato: Stripe ritenta quando la
 *     risposta tarda, e senza questo controllo la stessa vendita verrebbe
 *     contabilizzata due volte
 *
 * Da configurare su Stripe: endpoint  <sito>/api/market/webhook
 * eventi: checkout.session.completed, checkout.session.expired,
 *         charge.refunded, charge.dispute.created, account.updated
 */
export async function POST(req: NextRequest) {
  const corpo = await req.text();
  const v = verificaFirmaWebhook(corpo, req.headers.get('stripe-signature'));
  if (!v.ok) {
    // 400: Stripe ritentera'. Nessun dettaglio a chi sta sondando.
    return NextResponse.json({ error: 'firma non valida' }, { status: 400 });
  }

  const ev = v.evento;
  const pool = getPool();

  // gia' visto? si esce senza rifare nulla
  const nuovo = await pool.query(
    `INSERT INTO "WebhookEvent" (id, provider, type, payload)
     VALUES ($1,'stripe',$2,$3) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [String(ev.id), String(ev.type || ''), JSON.stringify({ type: ev.type })]);
  if (!nuovo.rows[0]) return NextResponse.json({ ok: true, duplicato: true });

  try {
    switch (ev.type) {
      case 'checkout.session.completed': {
        const motivo = await pagamentoRiuscito(pool, ev.data.object);
        if (motivo) {
          // Non e' un errore da ritentare, ma non e' nemmeno un successo:
          // si risponde 200 (Stripe non deve riprovare) dicendo cosa e'
          // successo, cosi' resta scritto accanto alla consegna.
          return NextResponse.json({ ok: true, nulla: motivo });
        }
        break;
      }
      case 'checkout.session.expired':
        await pagamentoAbbandonato(pool, ev.data.object);
        break;
      case 'charge.refunded':
        await rimborso(pool, ev.data.object);
        break;
      case 'charge.dispute.created':
        await contestazione(pool, ev.data.object);
        break;
      case 'account.updated':
        await contoAggiornato(pool, ev.data.object);
        break;
      default:
        break;   // evento non gestito: registrato e basta
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // L'evento resta registrato ma il lavoro e' fallito: si toglie il segno,
    // cosi' il ritentativo di Stripe puo' rifarlo.
    await pool.query('DELETE FROM "WebhookEvent" WHERE id = $1', [String(ev.id)]);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

async function pagamentoRiuscito(pool: any, sess: any) {
  // I ritorni SILENZIOSI erano il problema: l'evento veniva accettato con
  // 200 OK e non succedeva nulla, senza lasciare traccia del perche'. Ora
  // ogni uscita dice il motivo, e il motivo si legge nel corpo della risposta
  // che Stripe conserva accanto alla consegna.
  if (sess.payment_status !== 'paid') return 'pagamento non risulta incassato';
  const meta = sess.metadata || {};
  const purchaseId = String(sess.client_reference_id || meta.purchaseId || '');
  if (!purchaseId) return 'evento senza purchaseId';

  const p = await pool.query('SELECT * FROM "Purchase" WHERE id = $1', [purchaseId]);
  const acq = p.rows[0];
  if (!acq) return 'acquisto ' + purchaseId + ' non trovato nel database';
  if (acq.status === 'paid') return 'acquisto gia\' segnato come pagato';

  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');

    await cli.query(
      `UPDATE "Purchase" SET status='paid', "paidAt"=NOW(), "providerRef"=$2 WHERE id=$1`,
      [purchaseId, String(sess.payment_intent || sess.id)]);

    // La licenza si aggancia alla versione corrente e ci resta: acquisto una
    // tantum vuol dire "questa versione, per sempre". Gli aggiornamenti sono
    // il motivo per cui esiste l'abbonamento.
    const licId = idNuovo();
    const lic = await cli.query(
      `INSERT INTO "License" (id, "artifactId", "userId", status, "expiresAt",
                              "purchaseId", "releaseId")
       SELECT $1,$2,$3,'active'::license_status, NULL, $4,
              (SELECT id FROM "ArtifactRelease"
                WHERE "artifactId"=$2 AND "isCurrent" ORDER BY "createdAt" DESC LIMIT 1)
       ON CONFLICT ("artifactId","userId") DO UPDATE
         SET status='active'::license_status, "purchaseId"=EXCLUDED."purchaseId",
             "updatedAt"=NOW()
       RETURNING id`,
      [licId, acq.artifactId, acq.buyerId, purchaseId]);

    await cli.query('UPDATE "Purchase" SET "licenseId"=$2 WHERE id=$1',
      [purchaseId, lic.rows[0]?.id || licId]);

    // libro mastro: incasso, quota piattaforma, netto al venditore
    const vals = String(acq.currency || 'EUR');
    await cli.query(
      `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
       VALUES ($1,$2,'charge',$3,$4,$5,'incasso'),
              ($1,NULL,'fee',$6,$4,$5,'commissione piattaforma'),
              ($1,$2,'payout',$7,$4,$5,'netto al venditore')`,
      [purchaseId, acq.sellerId, acq.amountCents, vals,
       String(sess.payment_intent || ''), acq.feeCents, acq.netCents]);

    await cli.query('UPDATE "Artifact" SET downloads = COALESCE(downloads,0)+1 WHERE id=$1',
      [acq.artifactId]);

    await cli.query('COMMIT');
  } catch (e) {
    await cli.query('ROLLBACK');
    throw e;
  } finally {
    cli.release();
  }

  // ── ricevuta all'acquirente ──
  // FUORI dalla transazione e senza propagare errori: se la posta e' giu', il
  // pagamento resta valido. Sollevare qui farebbe ritentare Stripe e si
  // rischierebbe di rielaborare un acquisto gia' registrato.
  try {
    const d = await pool.query(
      `SELECT a.name AS artefatto, a.delivery::text AS consegna, u.email
         FROM "Purchase" p
         JOIN "Artifact" a ON a.id = p."artifactId"
         LEFT JOIN "User" u ON u.id = p."buyerId"
        WHERE p.id = $1`, [purchaseId]);
    const r = d.rows[0];
    // l'indirizzo del cliente su Stripe e' l'ultima risorsa se manca in anagrafica
    const email = r?.email || sess.customer_details?.email || sess.customer_email || '';
    if (email) {
      await inviaRicevuta({
        email,
        artefatto: r?.artefatto || 'Artefatto',
        importoCents: Number(acq.amountCents || 0),
        valuta: String(acq.currency || 'EUR'),
        consegna: String(r?.consegna || 'local'),
        purchaseId,
        data: new Date(),
      });
    }
  } catch (e) {
    console.error('[webhook] ricevuta non inviata:', e);
  }
}

async function pagamentoAbbandonato(pool: any, sess: any) {
  const id = String(sess.client_reference_id || sess.metadata?.purchaseId || '');
  if (!id) return;
  await pool.query(
    `UPDATE "Purchase" SET status='expired' WHERE id=$1 AND status='pending'`, [id]);
}

/** Rimborso: la licenza si spegne, altrimenti si terrebbe merce non pagata. */
async function rimborso(pool: any, charge: any) {
  const pi = String(charge.payment_intent || '');
  if (!pi) return;
  const p = await pool.query('SELECT * FROM "Purchase" WHERE "providerRef" = $1', [pi]);
  const acq = p.rows[0];
  if (!acq) return;

  const totale = Number(charge.amount_refunded || 0) >= Number(acq.amountCents || 0);
  await pool.query(
    `UPDATE "Purchase" SET status=$2, "refundedAt"=NOW() WHERE id=$1`,
    [acq.id, totale ? 'refunded' : 'partial_refund']);
  if (totale) {
    await pool.query(
      `UPDATE "License" SET status='refunded'::license_status, "updatedAt"=NOW()
        WHERE "artifactId"=$1 AND "userId"=$2`, [acq.artifactId, acq.buyerId]);
  }
  await pool.query(
    `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
     VALUES ($1,$2,'refund',$3,$4,$5,'rimborso')`,
    [acq.id, acq.sellerId, -Number(charge.amount_refunded || 0),
     String(acq.currency || 'EUR'), pi]);
}

/** Contestazione della carta: si sospende subito, si decidera' all'esito. */
async function contestazione(pool: any, disputa: any) {
  const pi = String(disputa.payment_intent || '');
  if (!pi) return;
  const p = await pool.query('SELECT * FROM "Purchase" WHERE "providerRef" = $1', [pi]);
  const acq = p.rows[0];
  if (!acq) return;
  await pool.query(
    `UPDATE "License" SET status='revoked'::license_status, "updatedAt"=NOW()
      WHERE "artifactId"=$1 AND "userId"=$2`, [acq.artifactId, acq.buyerId]);
  await pool.query(
    `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
     VALUES ($1,$2,'chargeback',$3,$4,$5,'contestazione')`,
    [acq.id, acq.sellerId, -Number(disputa.amount || 0), String(acq.currency || 'EUR'), pi]);
}

async function contoAggiornato(pool: any, acct: any) {
  const payouts = !!acct.payouts_enabled;
  const charges = !!acct.charges_enabled;
  const stato = payouts && charges ? 'verified'
    : (acct?.requirements?.disabled_reason ? 'restricted' : 'onboarding');
  await pool.query(
    `UPDATE "SellerAccount"
        SET status=$2::payout_status, "payoutsEnabled"=$3, "chargesEnabled"=$4,
            requirements=$5, "updatedAt"=NOW()
      WHERE "providerRef"=$1`,
    [String(acct.id), stato, payouts, charges,
     JSON.stringify({ currently_due: acct?.requirements?.currently_due || [],
                      disabled_reason: acct?.requirements?.disabled_reason || null })]);
}
