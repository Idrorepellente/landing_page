import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall, configurato, baseUrl, ErroreStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Conto del venditore (Stripe Connect Express).
 *
 * GET  -> stato: puo' incassare? cosa manca?
 * POST -> crea il conto se non c'e' e restituisce il link al modulo di Stripe.
 *
 * I dati bancari e di identita' NON passano da qui: li raccoglie Stripe sul
 * proprio modulo. Noi conserviamo solo il riferimento al conto e lo stato di
 * verifica, quindi non custodiamo nulla di sensibile e non ne rispondiamo.
 */

async function leggiConto(userId: string) {
  const pool = getPool();
  const r = await pool.query(
    `SELECT "userId", "providerRef", status::text AS status, country,
            "payoutsEnabled", "chargesEnabled", requirements
       FROM "SellerAccount" WHERE "userId" = $1`, [userId]);
  return r.rows[0] || null;
}

/** Riallinea il nostro stato a quello che dice Stripe. */
async function sincronizza(userId: string, acct: any) {
  const pool = getPool();
  const payouts = !!acct?.payouts_enabled;
  const charges = !!acct?.charges_enabled;
  const mancanti = acct?.requirements?.currently_due || [];
  const stato = payouts && charges ? 'verified'
    : (acct?.requirements?.disabled_reason ? 'restricted' : 'onboarding');

  await pool.query(
    `INSERT INTO "SellerAccount"
       ("userId", provider, "providerRef", status, country, "payoutsEnabled",
        "chargesEnabled", requirements, "updatedAt")
     VALUES ($1,'stripe',$2,$3::payout_status,$4,$5,$6,$7,NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       "providerRef" = EXCLUDED."providerRef",
       status = EXCLUDED.status,
       country = EXCLUDED.country,
       "payoutsEnabled" = EXCLUDED."payoutsEnabled",
       "chargesEnabled" = EXCLUDED."chargesEnabled",
       requirements = EXCLUDED.requirements,
       "updatedAt" = NOW()`,
    [userId, acct.id, stato, acct?.country || null, payouts, charges,
     JSON.stringify({ currently_due: mancanti, disabled_reason: acct?.requirements?.disabled_reason || null })]);

  return { stato, payouts, charges, mancanti };
}

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  if (!configurato()) {
    return NextResponse.json({ configured: false, status: 'none', payoutsEnabled: false,
      message: 'incasso non configurato sul sito' });
  }

  const riga = await leggiConto(auth.uid);
  if (!riga?.providerRef) {
    return NextResponse.json({ configured: true, status: 'none', payoutsEnabled: false });
  }

  try {
    const acct = await stripeCall('/accounts/' + riga.providerRef);
    const s = await sincronizza(auth.uid, acct);
    return NextResponse.json({
      configured: true, status: s.stato, payoutsEnabled: s.payouts,
      chargesEnabled: s.charges, missing: s.mancanti, country: acct?.country || null,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, status: riga.status,
      payoutsEnabled: riga.payoutsEnabled, error: String(e?.message || e) });
  }
}

export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  if (!configurato()) {
    return NextResponse.json({ error: 'incasso non configurato sul sito' }, { status: 503 });
  }

  const pool = getPool();
  let body: any = {};
  try { body = await req.json(); } catch { /* corpo facoltativo */ }
  const paese = String(body?.country || 'IT').toUpperCase().slice(0, 2);

  try {
    let riga = await leggiConto(auth.uid);
    let accountId: string = riga?.providerRef || '';

    if (!accountId) {
      const acct = await stripeCall('/accounts', {
        type: 'express',
        country: paese,
        email: auth.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: 'true' } },
        metadata: { userId: auth.uid },
      }, { idempotencyKey: 'acct:' + auth.uid });
      accountId = acct.id;
      await pool.query(
        `INSERT INTO "SellerAccount" ("userId", provider, "providerRef", status, country)
         VALUES ($1,'stripe',$2,'onboarding'::payout_status,$3)
         ON CONFLICT ("userId") DO UPDATE SET "providerRef" = EXCLUDED."providerRef"`,
        [auth.uid, accountId, paese]);
    }

    const base = baseUrl(req);
    const link = await stripeCall('/account_links', {
      account: accountId,
      type: 'account_onboarding',
      // il link scade: se l'utente lo apre tardi torna qui e ne chiede un altro
      refresh_url: `${base}/api/market/seller?refresh=1`,
      return_url: `${base}/marketplace/venditore?ok=1`,
    });

    return NextResponse.json({ ok: true, url: link.url, accountId });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ error: String(e?.message || e) }, { status: st });
  }
}
