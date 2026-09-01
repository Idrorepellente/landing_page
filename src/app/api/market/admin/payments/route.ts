import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest, isAdmin, isAdminCompleto } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Elenco dei pagamenti per la pagina di amministrazione.
 *
 * Riservato agli amministratori (ADMIN_EMAILS): contiene indirizzi degli
 * acquirenti e importi, quindi non e' materiale da esporre a chiunque abbia un
 * token valido.
 *
 * Mostra TUTTI gli stati, non solo quelli riusciti: un pagamento rimasto in
 * sospeso o rifiutato e' proprio cio' che serve vedere, e finora non era
 * visibile da nessuna parte.
 */
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
  if (!await isAdminCompleto(auth.email, getPool())) {
    return NextResponse.json({ error: 'riservato agli amministratori' }, { status: 403 });
  }

  const u = new URL(req.url);
  const stato = (u.searchParams.get('status') || '').trim();
  const limite = Math.min(500, Math.max(1, parseInt(u.searchParams.get('limit') || '100', 10)));

  const pool = getPool();

  const righe = await pool.query(
    `SELECT p.id, p.status, p."amountCents", p."feeCents", p."netCents", p.currency,
            p.provider, p."providerRef", p."createdAt", p."paidAt", p."refundedAt",
            a.name  AS "artifactName", a.kind::text AS "artifactKind",
            ub.email AS "buyerEmail", us.email AS "sellerEmail",
            (l.id IS NOT NULL) AS "hasLicense"
       FROM "Purchase" p
       LEFT JOIN "Artifact" a ON a.id = p."artifactId"
       LEFT JOIN "User" ub ON ub.id = p."buyerId"
       LEFT JOIN "User" us ON us.id = p."sellerId"
       LEFT JOIN "License" l ON l.id = p."licenseId"
      WHERE ($1 = '' OR p.status = $1)
      ORDER BY COALESCE(p."paidAt", p."createdAt") DESC
      LIMIT $2`, [stato, limite]);

  const totali = await pool.query(
    `SELECT status, currency, COUNT(*)::int AS n,
            COALESCE(SUM("amountCents"),0)::int AS lordo,
            COALESCE(SUM("feeCents"),0)::int    AS commissioni,
            COALESCE(SUM("netCents"),0)::int    AS netto
       FROM "Purchase" GROUP BY status, currency ORDER BY status`);

  return NextResponse.json({ ok: true, items: righe.rows, totals: totali.rows });
}
