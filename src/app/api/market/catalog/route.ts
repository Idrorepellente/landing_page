import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vetrina e scheda prodotto.
 *
 * Non espone MAI il codice: la scheda mostra solo il manifest della versione
 * (nomi dei file, dimensioni, ruolo) preso da "ArtifactBlob".manifest, che per
 * costruzione non contiene sorgenti. La colonna "Artifact".files non viene
 * nemmeno selezionata, cosi' non puo' sfuggire per distrazione.
 */
export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  const pool = getPool();

  if (id) {
    const r = await pool.query(
      `SELECT a.id, a.kind::text AS kind, a.name, a.slug, a.subtitle, a.summary,
              a.description, a."priceCents", a.currency, a."pricePeriod",
              a."isForSale", a.delivery::text AS delivery, a.downloads, a.rating,
              a.version, a.metrics, a.details, a."coverEmoji", a."publishedAt",
              a."authorId", u.username AS "authorName",
              b.manifest, b."fileCount", b."sizeBytes", b.sha256,
              (SELECT COUNT(*) FROM "ArtifactComment" c WHERE c."artifactId" = a.id) AS comments,
              EXISTS (SELECT 1 FROM "License" l
                       WHERE l."artifactId" = a.id AND l."userId" = $2
                         AND l.status = 'active') AS owned
         FROM "Artifact" a
         LEFT JOIN "User" u ON u.id = a."authorId"
         LEFT JOIN "ArtifactRelease" rel ON rel."artifactId" = a.id AND rel."isCurrent"
         LEFT JOIN "ArtifactBlob" b ON b.id = rel."blobId"
        WHERE a.id = $1 AND COALESCE(a."isPublic", TRUE)`, [id, auth.uid]);
    if (!r.rows[0]) return NextResponse.json({ error: 'non trovato' }, { status: 404 });
    return NextResponse.json({ ok: true, item: r.rows[0] });
  }

  const kind = u.searchParams.get('kind');
  const q = (u.searchParams.get('q') || '').trim();
  const limite = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') || '50', 10)));

  const r = await pool.query(
    `SELECT a.id, a.kind::text AS kind, a.name, a.slug, a.subtitle, a.summary,
            a."priceCents", a.currency, a."pricePeriod", a."isForSale",
            a.delivery::text AS delivery, a.downloads, a.rating, a."coverEmoji",
            a."publishedAt", u.username AS "authorName",
            EXISTS (SELECT 1 FROM "License" l
                     WHERE l."artifactId" = a.id AND l."userId" = $1
                       AND l.status = 'active') AS owned
       FROM "Artifact" a
       LEFT JOIN "User" u ON u.id = a."authorId"
      WHERE COALESCE(a."isPublic", TRUE)
        AND a."publishedAt" IS NOT NULL
        AND ($2::text IS NULL OR a.kind::text = $2)
        AND ($3::text = '' OR a.name ILIKE '%'||$3||'%' OR COALESCE(a.summary,'') ILIKE '%'||$3||'%')
      ORDER BY a."publishedAt" DESC
      LIMIT $4`, [auth.uid, kind, q, limite]);

  return NextResponse.json({ ok: true, items: r.rows });
}
