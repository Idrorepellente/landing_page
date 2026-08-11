import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Riepilogo incassi del venditore, letto dal libro mastro. */
export async function GET(req: NextRequest) {
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
