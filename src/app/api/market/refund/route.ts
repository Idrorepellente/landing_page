import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest, isAdmin, isAdminCompleto } from '@/lib/appToken';
import { stripeCall, configurato, ErroreStripe } from '@/lib/stripe';
import { inviaEmail } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Rimborso di un acquisto contestato.
 *
 * ── Perche' non basta "rimborsare" ────────────────────────────────────────
 *
 * Il pagamento e' stato incassato con `transfer_data.destination`: Stripe ha
 * gia' spostato il netto sul conto collegato del venditore e trattenuto la
 * commissione per la piattaforma. Al momento del rimborso quei soldi NON sono
 * piu' sul conto della piattaforma.
 *
 * Un `refund` e basta preleverebbe l'intero importo dal saldo della
 * piattaforma: il compratore verrebbe risarcito con denaro nostro, il
 * venditore terrebbe il suo netto, e la commissione resterebbe incassata su
 * una vendita annullata. Esattamente il contrario di quello che deve
 * succedere quando si riconosce una scorrettezza del venditore.
 *
 * Servono percio' TRE operazioni, in quest'ordine:
 *
 *   1. reverse_transfer     riporta indietro il netto dal conto del venditore
 *   2. refund_application_fee restituisce la commissione trattenuta
 *   3. refund               rende i soldi al compratore
 *
 * Stripe le esegue insieme se il rimborso viene creato con i due flag.
 * Il risultato, su un acquisto da 100 con commissione al 10%:
 *
 *   compratore   torna a 0      rimborsato per intero
 *   venditore    torna a 0      non tiene il proprio netto (90)
 *   piattaforma  -10            rinuncia alla commissione incassata
 *
 * Senza `reverse_transfer` sarebbe la piattaforma a pagare 90 di tasca
 * propria mentre il venditore tiene tutto: il contrario di quello che deve
 * succedere quando la scorrettezza e' del venditore.
 *
 * La piattaforma resta comunque a -10, perche' restituisce la commissione su
 * una vendita annullata. E' voluto: e' il costo di aver ospitato una vendita
 * scorretta, e resta molto inferiore a quello di trattenere una commissione
 * su un artefatto che non funziona.
 *
 * Va detto che le TARIFFE di Stripe sulla transazione originale (circa 1,4% +
 * 0,25 EUR in Europa) NON vengono restituite: quelle restano perse, e sono un
 * costo reale che nessuna configurazione elimina.
 *
 * ── Se il venditore ha gia' prelevato ─────────────────────────────────────
 *
 * `reverse_transfer` puo' portare il conto del venditore in negativo. Stripe
 * lo consente e recupera la somma dai suoi incassi successivi. Se non ne avra'
 * piu', il saldo resta negativo: e' un rischio reale, non eliminabile, ed e'
 * la ragione per cui la finestra di contestazione va tenuta corta.
 */

type Corpo = {
  claimId?: string;
  purchaseId?: string;
  amountCents?: number;      // parziale; assente = totale
  reason?: string;
  revokeLicense?: boolean;   // predefinito: si'
};

export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  if (!await isAdminCompleto(auth.email, getPool())) {
    // Il rimborso muove denaro reale e toglie l'accesso a un artefatto: non
    // puo' dipendere da chi lo chiede, deve deciderlo chi amministra.
    return NextResponse.json({ error: 'riservato agli amministratori' }, { status: 403 });
  }
  if (!configurato()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  let body: Corpo;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const pool = getPool();

  // ── acquisto da rimborsare ──
  let purchaseId = String(body.purchaseId || '');
  let claim: any = null;

  if (body.claimId) {
    const c = await pool.query(
      'SELECT * FROM "PerformanceClaim" WHERE id = $1', [String(body.claimId)]);
    claim = c.rows[0];
    if (!claim) return NextResponse.json({ error: 'claim does not exist' }, { status: 404 });
    if (claim.status === 'accepted') {
      return NextResponse.json({ error: 'claim already\' rimborsata' }, { status: 409 });
    }
    purchaseId = purchaseId || String(claim.purchaseId || '');
  }
  if (!purchaseId) {
    return NextResponse.json({ error: 'purchaseId or claimId is required' }, { status: 400 });
  }

  const p = await pool.query(
    `SELECT p.*, a.name AS "artifactName", u.email AS "buyerEmail"
       FROM "Purchase" p
       LEFT JOIN "Artifact" a ON a.id = p."artifactId"
       LEFT JOIN "User" u ON u.id = p."buyerId"
      WHERE p.id = $1`, [purchaseId]);
  const acq = p.rows[0];
  if (!acq) return NextResponse.json({ error: 'purchase does not exist' }, { status: 404 });
  if (acq.status === 'refunded') {
    return NextResponse.json({ error: 'gia\' rimborsato' }, { status: 409 });
  }
  if (acq.status !== 'paid') {
    return NextResponse.json(
      { error: `the purchase shows as '${acq.status}': there is nothing to refund` },
      { status: 409 });
  }
  if (!acq.providerRef) {
    return NextResponse.json({ error: 'the payment reference is missing' }, { status: 409 });
  }

  const totale = Number(acq.amountCents || 0);
  const importo = Math.min(Math.max(0, Math.round(Number(body.amountCents ?? totale))), totale);
  if (importo <= 0) {
    return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
  }
  const parziale = importo < totale;

  try {
    // ── il rimborso, con annullamento del trasferimento e della commissione ──
    const rimborso = await stripeCall('/refunds', {
      payment_intent: String(acq.providerRef),
      amount: importo,
      // riporta indietro il netto dal conto del venditore
      reverse_transfer: 'true',
      // e restituisce la commissione trattenuta dalla piattaforma
      refund_application_fee: parziale ? 'false' : 'true',
      reason: 'requested_by_customer',
      metadata: {
        purchaseId,
        claimId: String(body.claimId || ''),
        motivo: String(body.reason || 'performance did not match').slice(0, 200),
        deciso_da: auth.email,
      },
    }, {
      // se la richiesta viene ritentata per un problema di rete, Stripe
      // riconosce la chiave e non rimborsa due volte
      idempotencyKey: `refund:${purchaseId}:${importo}`,
    });

    // Su un rimborso parziale la commissione non si puo' restituire in
    // proporzione con lo stesso flag: la si annulla a parte.
    let feeRestituita = parziale ? 0 : Number(acq.feeCents || 0);
    if (parziale && Number(acq.feeCents || 0) > 0) {
      const quota = Math.round(Number(acq.feeCents) * (importo / totale));
      if (quota > 0) {
        try {
          const pi = await stripeCall('/payment_intents/' + String(acq.providerRef)
            + '?expand[]=latest_charge');
          const feeId = pi?.latest_charge?.application_fee;
          if (feeId) {
            await stripeCall(`/application_fees/${feeId}/refunds`, { amount: quota },
              { idempotencyKey: `fee:${purchaseId}:${quota}` });
            feeRestituita = quota;
          }
        } catch (e) {
          // La commissione non e'  gone back: the buyer is' comunque
          // stato rimborsato, quindi non si annulla tutto — si registra, cosi'
          // la differenza si vede nel mastro invece di sparire.
          console.error('[refund] fee not returned:', e);
        }
      }
    }

    // ── registrazione ──
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');

      await cli.query(
        `UPDATE "Purchase" SET status = $2, "refundedAt" = NOW() WHERE id = $1`,
        [purchaseId, parziale ? 'partial_refund' : 'refunded']);

      // La licenza si spegne: senza, chi e' stato rimborsato continuerebbe a
      // usare l'artefatto. Su un rimborso parziale si puo' scegliere.
      const revoca = body.revokeLicense !== false && !parziale;
      if (revoca) {
        await cli.query(
          `UPDATE "License" SET status = 'refunded'::license_status, "updatedAt" = NOW()
            WHERE "artifactId" = $1 AND "userId" = $2`,
          [acq.artifactId, acq.buyerId]);
      }

      // Mastro: uscita verso il compratore, storno del netto al venditore,
      // storno della commissione alla piattaforma. Tre righe, cosi' i conti
      // tornano leggendo solo il mastro.
      const netto = parziale
        ? Math.round(Number(acq.netCents || 0) * (importo / totale))
        : Number(acq.netCents || 0);
      await cli.query(
        `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
         VALUES ($1,$2,'refund',$3,$4,$5,$6),
                ($1,$2,'payout',$7,$4,$5,'storno netto venditore'),
                ($1,NULL,'fee',$8,$4,$5,'storno commissione piattaforma')`,
        [purchaseId, acq.buyerId, -importo, String(acq.currency || 'EUR'),
         String(rimborso.id || ''),
         String(body.reason || 'rimborso per performance did not match'),
         -netto, -feeRestituita]);

      if (claim) {
        await cli.query(
          `UPDATE "PerformanceClaim"
              SET status = 'accepted'::claim_status, "refundCents" = $2,
                  "adminNote" = $3, "resolvedAt" = NOW()
            WHERE id = $1`,
          [claim.id, importo, String(body.reason || '').slice(0, 2000)]);
      }

      await cli.query('COMMIT');
    } catch (e) {
      await cli.query('ROLLBACK');
      // Il denaro e' gia'  returned to the buyer but the database does not know: it is'
      // il caso peggiore, e va reso evidente invece di restare in un log.
      console.error('[refund] REFUND ISSUED BUT NOT RECORDED', purchaseId, e);
      return NextResponse.json({
        error: 'rimborso eseguito su Stripe ma NON registrato nel database',
        detail: String((e as any)?.message || e),
        refundId: rimborso.id,
        azione: 'segnare a mano l\'acquisto come rimborsato',
      }, { status: 500 });
    } finally {
      cli.release();
    }

    // ── avviso al compratore ──
    if (acq.buyerEmail) {
      const euro = (c: number) => (c / 100).toFixed(2).replace('.', ',');
      await inviaEmail(
        acq.buyerEmail,
        `Rimborso effettuato — ${acq.artifactName || 'artefatto'}`,
        [`We have refunded you ${euro(importo)} ${acq.currency || 'EUR'}`,
         `for your purchase of "${acq.artifactName || 'artifact'}".`,
         '',
         body.reason ? `Motivo: ${body.reason}` : '',
         '',
         'L\'the amount goes back to the payment method used: your bank can\'',
         'impiegare qualche giorno lavorativo a renderlo visibile.',
        ].filter(Boolean).join('\n'));
    }

    return NextResponse.json({
      ok: true,
      refundId: rimborso.id,
      amountCents: importo,
      partial: parziale,
      feeRefunded: feeRestituita,
      sellerReversed: parziale
        ? Math.round(Number(acq.netCents || 0) * (importo / totale))
        : Number(acq.netCents || 0),
    });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ error: String(e?.message || e) }, { status: st });
  }
}
