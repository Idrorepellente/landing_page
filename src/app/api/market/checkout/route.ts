import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall, configurato, baseUrl, ErroreStripe } from '@/lib/stripe';
import { dividiPagamento, idNuovo, masterKeyReady } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Avvia l'acquisto UNA TANTUM di un artefatto.
 *
 * Il denaro si divide alla fonte: `application_fee_amount` resta alla
 * piattaforma, il resto va al conto collegato del venditore. Non transita mai
 * da un conto nostro verso il suo.
 *
 * Qui NON si concede nulla: l'accesso lo apre il webhook, quando Stripe
 * conferma l'incasso. Fidarsi del ritorno del browser vorrebbe dire regalare
 * artefatti a chiunque sappia costruire un URL.
 */
export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const artifactId = String(body?.artifactId || '');
  if (!artifactId) return NextResponse.json({ error: 'artifactId mancante' }, { status: 400 });

  const pool = getPool();
  const a = await pool.query(
    `SELECT a.id, a.name, a.summary, a."priceCents", a.currency, a."pricePeriod",
            a."isForSale", a."authorId", a.delivery::text AS delivery,
            s."providerRef" AS "sellerAcct", s."payoutsEnabled"
       FROM "Artifact" a
       LEFT JOIN "SellerAccount" s ON s."userId" = a."authorId"
      WHERE a.id = $1`, [artifactId]);
  const art = a.rows[0];
  if (!art) return NextResponse.json({ error: 'artefatto inesistente' }, { status: 404 });

  // ── gratuito: licenza subito, nessun pagamento ──
  if (!art.isForSale || Number(art.priceCents || 0) <= 0) {
    const licId = idNuovo();
    await pool.query(
      `INSERT INTO "License" (id, "artifactId", "userId", status, "expiresAt", "releaseId")
       SELECT $1,$2,$3,'active'::license_status, NULL,
              (SELECT id FROM "ArtifactRelease" WHERE "artifactId"=$2 AND "isCurrent" ORDER BY "createdAt" DESC LIMIT 1)
       ON CONFLICT ("artifactId","userId") DO NOTHING`, [licId, artifactId, auth.uid]);
    await pool.query('UPDATE "Artifact" SET downloads = COALESCE(downloads,0) + 1 WHERE id = $1', [artifactId]);
    return NextResponse.json({ ok: true, free: true, granted: true });
  }

  // ── controlli prima di chiedere soldi ──
  if (String(art.pricePeriod || 'once') !== 'once') {
    return NextResponse.json({ error: 'questo artefatto e\' in abbonamento: usa /api/market/subscribe' },
      { status: 400 });
  }
  if (!configurato()) {
    return NextResponse.json({ error: 'incasso non configurato sul sito (STRIPE_SECRET_KEY)' }, { status: 503 });
  }
  if (art.delivery === 'streamed' && !masterKeyReady()) {
    // meglio bloccare adesso che incassare e non poter consegnare
    return NextResponse.json({ error: 'consegna cifrata non configurata (MARKETPLACE_MASTER_KEY)' },
      { status: 503 });
  }
  if (art.authorId === auth.uid) {
    return NextResponse.json({ error: 'non puoi acquistare un tuo artefatto' }, { status: 400 });
  }
  if (!art.sellerAcct || !art.payoutsEnabled) {
    return NextResponse.json({ error: 'il venditore non puo\' ancora ricevere pagamenti' }, { status: 409 });
  }

  const gia = await pool.query(
    `SELECT id FROM "License" WHERE "artifactId"=$1 AND "userId"=$2 AND status='active'`,
    [artifactId, auth.uid]);
  if (gia.rows[0]) return NextResponse.json({ ok: true, alreadyOwned: true });

  const div = await dividiPagamento(Number(art.priceCents));
  const valuta = String(art.currency || 'EUR').toLowerCase();
  const purchaseId = idNuovo();
  const base = baseUrl(req);

  try {
    const sess = await stripeCall('/checkout/sessions', {
      mode: 'payment',
      client_reference_id: purchaseId,
      customer_email: auth.email,
      success_url: `${base}/marketplace/grazie?p=${purchaseId}`,
      cancel_url: `${base}/marketplace?annullato=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: valuta,
          unit_amount: div.totalCents,
          product_data: {
            name: String(art.name || 'Artefatto'),
            description: String(art.summary || '').slice(0, 300) || undefined,
          },
        },
      }],
      payment_intent_data: {
        application_fee_amount: div.feeCents,
        transfer_data: { destination: art.sellerAcct },
        metadata: { purchaseId, artifactId, buyerId: auth.uid, sellerId: art.authorId },
      },
      metadata: { purchaseId, artifactId, buyerId: auth.uid, sellerId: art.authorId },
    }, { idempotencyKey: 'co:' + purchaseId });

    await pool.query(
      `INSERT INTO "Purchase"
         (id, "artifactId", "buyerId", "sellerId", "amountCents", currency, status,
          provider, "providerRef", "feeCents", "netCents", "periodType")
       VALUES ($1,$2,$3,$4,$5,$6,'pending','stripe',$7,$8,$9,'once')`,
      [purchaseId, artifactId, auth.uid, art.authorId, div.totalCents,
       String(art.currency || 'EUR'), sess.id, div.feeCents, div.netCents]);

    return NextResponse.json({
      ok: true, url: sess.url, purchaseId,
      amountCents: div.totalCents, feeCents: div.feeCents, netCents: div.netCents,
    });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ error: String(e?.message || e) }, { status: st });
  }
}
