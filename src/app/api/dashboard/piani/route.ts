/**
 * I prezzi dei tre abbonamenti, dal pannello di amministrazione.
 *
 * Stanno nel database e si cambiano da qui perche' sono SEGNAPOSTO: i numeri
 * veri si decidono in uscita dalla beta, e un prezzo scritto nel codice
 * vorrebbe dire un rilascio per cambiarlo. Un prezzo che richiede un rilascio
 * non si cambia quando serve.
 *
 * Cambiare un prezzo QUI non ritocca gli abbonamenti in corso: Stripe
 * continua a fatturare la cifra pattuita con ciascun cliente, e il nuovo
 * prezzo vale per chi si abbona (o cambia livello) da quel momento. E' il
 * comportamento giusto — ritoccare l'addebito di chi ha gia' accettato una
 * cifra sarebbe un'altra cosa — ma va saputo, perche' non si vede da qui.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { piani, PERIODI } from '@/lib/abbonamenti';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pool = getPool();
  const lista = await piani(pool);

  // Quanti abbonati per livello: serve a sapere cosa si sta toccando prima di
  // cambiare un prezzo.
  const conteggi: Record<string, number> = {};
  try {
    const r = await pool.query(
      `SELECT "subscriptionTier"::int AS tier, COUNT(*)::int AS n
         FROM "User"
        WHERE "subscriptionStatus" = 'subscribed'
          AND ("subscriptionUntil" IS NULL OR "subscriptionUntil" > NOW())
        GROUP BY 1`);
    for (const x of r.rows) conteggi[String(x.tier)] = Number(x.n || 0);
  } catch { /* schema non installato */ }

  return NextResponse.json({
    ok: true,
    piani: lista,
    abbonatiPerLivello: conteggi,
    schemaMancante: lista.length === 0 || undefined,
    periodi: PERIODI,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    const tier = Number(b?.tier);
    if (!Number.isInteger(tier) || tier < 1 || tier > 3) {
      return NextResponse.json({ error: 'tier must be 1, 2 or 3' }, { status: 400 });
    }

    const mensile = b?.monthlyCents;
    const annuale = b?.annualCents;
    const nome = b?.name === undefined ? undefined : String(b.name).trim().slice(0, 60);
    const slogan = b?.tagline === undefined ? undefined : String(b.tagline).trim().slice(0, 200);

    // I prezzi si accettano solo come interi non negativi, in CENTESIMI. Un
    // "9.90" interpretato come 9 centesimi e' un addebito sbagliato, e il
    // posto per accorgersene e' qui, non la fattura del cliente.
    for (const [etichetta, v] of [['monthlyCents', mensile], ['annualCents', annuale]] as const) {
      if (v === undefined || v === null) continue;
      if (!Number.isInteger(v) || v < 0 || v > 100_000_00) {
        return NextResponse.json({
          error: `${etichetta} must be a whole number of cents between 0 and 10000000`,
          detail: 'Received: ' + JSON.stringify(v) + '. 9 euro is 900, not 9.',
        }, { status: 400 });
      }
    }
    if (mensile === undefined && annuale === undefined
        && nome === undefined && slogan === undefined) {
      return NextResponse.json({ error: 'nothing to change' }, { status: 400 });
    }

    const chi = String(b?.richiedente || 'admin').trim().toLowerCase();
    const pool = getPool();

    // Toccare un prezzo toglie il marchio «segnaposto»: non e' cosmetico, e'
    // il segnale che il pannello usa per avvisare che i numeri non sono veri.
    const r = await pool.query(
      `UPDATE "SubscriptionPlan"
          SET "monthlyCents" = COALESCE($2, "monthlyCents"),
              "annualCents"  = COALESCE($3, "annualCents"),
              name           = COALESCE($4, name),
              tagline        = COALESCE($5, tagline),
              features       = CASE WHEN $2 IS NULL AND $3 IS NULL
                                    THEN features
                                    ELSE features - 'placeholder_price' END,
              "updatedAt"    = NOW(),
              "updatedBy"    = $6
        WHERE tier = $1
        RETURNING tier, code, name, tagline, "monthlyCents", "annualCents",
                  currency, features, active, "stripeProductId"`,
      [tier,
       mensile === undefined ? null : mensile,
       annuale === undefined ? null : annuale,
       nome || null, slogan === undefined ? null : slogan, chi]);

    if (!r.rows[0]) {
      return NextResponse.json({
        error: 'plan not found',
        detail: 'Run marketplace_abbonamenti.sql on the site Postgres.',
      }, { status: 404 });
    }
    return NextResponse.json({ ok: true, piano: r.rows[0] });
  } catch (e: any) {
    const t = String(e?.message || e);
    if (/relation .*SubscriptionPlan.* does not exist/i.test(t)) {
      return NextResponse.json({
        error: 'The SubscriptionPlan table does not exist yet.',
        detail: 'Run marketplace_abbonamenti.sql on the site Postgres.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: t }, { status: 500 });
  }
}
