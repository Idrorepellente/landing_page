import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Riepilogo incassi del venditore, letto dal libro mastro. */
/**
 * Protezione generale: qualunque caduta produce un messaggio, non un 500 muto.
 *
 * Le query fuori dal `try` facevano cadere la richiesta prima che Next.js
 * potesse comporre una risposta, e all'utente arrivava un nudo «HTTP 500».
 */
export async function GET(req: NextRequest) {
  try {
    return await gestisciGET(req);
  } catch (e: any) {
    const testo = String(e?.message || e);
    if (/column|relation|does not exist|violates|constraint/i.test(testo)) {
      return NextResponse.json({
        error: 'Il database del sito non e\' allineato.',
        detail: testo + '. Esegui gli schemi SQL sul Postgres.',
        raw: testo,
      }, { status: 500 });
    }
    return NextResponse.json({ error: testo, raw: testo }, { status: 500 });
  }
}

async function gestisciGET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  const pool = getPool();
  const tot = await pool.query(
    `SELECT currency,
            SUM(CASE WHEN kind='payout' THEN "amountCents" ELSE 0 END) AS netto,
            SUM(CASE WHEN kind='refund' THEN "amountCents" ELSE 0 END) AS rimborsi,
            COUNT(*) FILTER (WHERE kind='payout') AS vendite
       FROM "LedgerEntry" WHERE "userId" = $1 GROUP BY currency`, [auth.uid]);

  const ultimi = await pool.query(
    `SELECT p.id, p."amountCents", p."feeCents", p."netCents", p.currency, p.status,
            p."paidAt", a.name AS "artifactName"
       FROM "Purchase" p JOIN "Artifact" a ON a.id = p."artifactId"
      WHERE p."sellerId" = $1 AND p.status = 'paid'
      ORDER BY p."paidAt" DESC LIMIT 50`, [auth.uid]);

  return NextResponse.json({ ok: true, totals: tot.rows, recent: ultimi.rows });
}
