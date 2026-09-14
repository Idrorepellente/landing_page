/**
 * Interruttore delle vendite: gli artefatti a pagamento sono ammessi?
 *
 * SPENTO durante la beta. Con le vendite spente il sito non tratta denaro,
 * il che ha due conseguenze concrete: si resta dentro i termini del piano
 * gratuito di Vercel, che vieta l'uso commerciale, e non nasce l'obbligo
 * fiscale legato a un'attivita' di intermediazione.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { venditeAttive } from '@/lib/impostazioni';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pool = getPool();
  let inVendita = 0;
  try {
    const r = await pool.query(
      'SELECT COUNT(*)::int AS n FROM "Artifact" WHERE "isForSale" = TRUE');
    inVendita = Number(r.rows[0]?.n || 0);
  } catch { /* tabella assente */ }
  return NextResponse.json({
    ok: true,
    attive: await venditeAttive(pool),
    // Serve a dire all'amministratore cosa succede spegnendo: gli artefatti
    // gia' a pagamento restano nel catalogo ma nessuno puo' comprarli.
    inVendita,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }
    const acceso = !!b?.attive;
    const chi = String(b?.richiedente || 'admin').trim().toLowerCase();
    const pool = getPool();

    // ── NON SI ACCENDONO LE VENDITE SENZA UN CONTO CHE INCASSI ────────
    // Accenderle mentre nessun autore ha collegato un conto significa
    // mostrare prezzi che non si possono pagare: il compratore arriva al
    // checkout e trova un errore. Meglio dirlo qui.
    if (acceso) {
      let conti = 0;
      try {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n FROM "SellerAccount"
            WHERE status = 'active' OR "payoutsEnabled" = TRUE`);
        conti = Number(r.rows[0]?.n || 0);
      } catch { /* schema vecchio: non si blocca */ }
      if (!conti) {
        return NextResponse.json({
          error: 'no author can receive payouts yet',
          detail: 'Turning sales on now would show prices nobody can be paid '
                + 'for. Link a payout account first, from Profile.',
        }, { status: 409 });
      }
    }

    await pool.query(
      `INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
       VALUES ('paid_artifacts_enabled', $1, $2)
       ON CONFLICT (chiave) DO UPDATE SET
         valore = EXCLUDED.valore,
         "updatedAt" = NOW(),
         "updatedBy" = EXCLUDED."updatedBy"`,
      [acceso ? 'true' : 'false', chi]);
    return NextResponse.json({ ok: true, attive: acceso });
  } catch (e: any) {
    const t = String(e?.message || e);
    if (/relation .*AppSetting.* does not exist/i.test(t)) {
      return NextResponse.json({
        error: 'The AppSetting table does not exist yet.',
        detail: 'Run marketplace_beta.sql on the site Postgres.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: t }, { status: 500 });
  }
}
