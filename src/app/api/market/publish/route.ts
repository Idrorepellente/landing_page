import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { cifraPacchetto, masterKeyReady, idNuovo } from '@/lib/marketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pubblicazione di una versione.
 *
 * I file arrivano qui in chiaro (canale HTTPS, autore autenticato), vengono
 * cifrati SUL SERVER e archiviati. Da questo momento il codice non esiste piu'
 * in chiaro nel database: "Artifact".files viene esplicitamente svuotata,
 * perche' finche' resta popolata basta una query sbagliata per regalare i
 * sorgenti di un artefatto a pagamento.
 *
 * Il manifest — nomi, dimensioni, ruolo dei file — viene calcolato qui e
 * salvato a parte: e' cio' che la scheda prodotto puo' mostrare senza rischi.
 */
export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  const artifactId = String(body?.artifactId || '');
  const files = body?.files;
  const version = String(body?.version || '1').slice(0, 40);
  if (!artifactId || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'artifactId e files sono obbligatori' }, { status: 400 });
  }
  if (!masterKeyReady()) {
    return NextResponse.json(
      { error: 'MARKETPLACE_MASTER_KEY assente o non valida (servono 32 byte in base64)' },
      { status: 503 });
  }

  const pool = getPool();
  const a = await pool.query(
    `SELECT a.id, a."authorId", a."isForSale", a."pricePeriod", a.delivery::text AS delivery,
            s."payoutsEnabled"
       FROM "Artifact" a
       LEFT JOIN "SellerAccount" s ON s."userId" = a."authorId"
      WHERE a.id = $1`, [artifactId]);
  const art = a.rows[0];
  if (!art) return NextResponse.json({ error: 'artefatto inesistente' }, { status: 404 });
  if (art.authorId !== auth.uid) {
    return NextResponse.json({ error: 'non sei l\'autore di questo artefatto' }, { status: 403 });
  }
  // Non si pubblica a pagamento senza poter incassare: altrimenti si vende
  // qualcosa il cui ricavo non ha una destinazione.
  if (art.isForSale && !art.payoutsEnabled) {
    return NextResponse.json(
      { error: 'prima collega il conto per gli incassi (marketplace/venditore)' }, { status: 409 });
  }

  const manifest = files.map((f: any) => ({
    name: String(f?.name || ''),
    bytes: Buffer.byteLength(String(f?.code || ''), 'utf8'),
    role: /(^|\/)(strategy|approach)\.py$/.test(String(f?.name || '')) ? 'main' : 'module',
  }));

  try {
    const c = cifraPacchetto(files);
    const blobId = idNuovo();
    const releaseId = idNuovo();

    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');

      await cli.query(
        `INSERT INTO "ArtifactBlob"
           (id,"artifactId",version,ciphertext,nonce,tag,sha256,"sizeBytes","fileCount",manifest)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT ("artifactId",version) DO UPDATE SET
           ciphertext=EXCLUDED.ciphertext, nonce=EXCLUDED.nonce, tag=EXCLUDED.tag,
           sha256=EXCLUDED.sha256, "sizeBytes"=EXCLUDED."sizeBytes",
           "fileCount"=EXCLUDED."fileCount", manifest=EXCLUDED.manifest`,
        [blobId, artifactId, version, c.pacco.ciphertext, c.pacco.nonce, c.pacco.tag,
         c.sha256, c.sizeBytes, files.length, JSON.stringify(manifest)]);

      const vero = await cli.query(
        'SELECT id FROM "ArtifactBlob" WHERE "artifactId"=$1 AND version=$2', [artifactId, version]);
      const bid = vero.rows[0].id;

      await cli.query(
        `INSERT INTO "ArtifactKey" ("blobId","wrappedKey","wrapNonce","wrapTag")
         VALUES ($1,$2,$3,$4)
         ON CONFLICT ("blobId") DO UPDATE SET
           "wrappedKey"=EXCLUDED."wrappedKey", "wrapNonce"=EXCLUDED."wrapNonce",
           "wrapTag"=EXCLUDED."wrapTag"`,
        [bid, c.avvolta.ciphertext, c.avvolta.nonce, c.avvolta.tag]);

      // una sola versione corrente per artefatto
      await cli.query('UPDATE "ArtifactRelease" SET "isCurrent"=FALSE WHERE "artifactId"=$1',
        [artifactId]);
      await cli.query(
        `INSERT INTO "ArtifactRelease" (id,"artifactId","blobId",version,"isCurrent",notes)
         VALUES ($1,$2,$3,$4,TRUE,$5)
         ON CONFLICT ("artifactId",version) DO UPDATE SET
           "blobId"=EXCLUDED."blobId", "isCurrent"=TRUE, notes=EXCLUDED.notes`,
        [releaseId, artifactId, bid, version, String(body?.notes || '').slice(0, 2000) || null]);

      // il codice in chiaro sparisce dalla tabella principale
      await cli.query(
        `UPDATE "Artifact"
            SET files = NULL, code = NULL, version = $2, "publishedAt" = COALESCE("publishedAt", NOW())
          WHERE id = $1`, [artifactId, version]);

      await cli.query('COMMIT');
    } catch (e) {
      await cli.query('ROLLBACK');
      throw e;
    } finally {
      cli.release();
    }

    return NextResponse.json({
      ok: true, version, sha256: c.sha256, fileCount: files.length,
      sizeBytes: c.sizeBytes, delivery: art.delivery,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
