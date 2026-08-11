import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { verificaLicenza, chiavePerDestinatario, b64, idNuovo, impronta } from '@/lib/marketplace';

/** Token grezzo: serve a derivare il segreto con cui si riavvolge la chiave. */
function tokenGrezzo(req: NextRequest): string {
  const a = req.headers.get('authorization') || '';
  if (a.toLowerCase().startsWith('bearer ')) return a.slice(7).trim();
  return (req.headers.get('x-app-token') || '').trim();
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DURATA_PERMESSO_MIN = 240;   // 4 ore: una connessione che cade non deve
                                   // lasciare scoperta una posizione aperta

/**
 * Consegna il pacchetto dell'artefatto a chi ne ha diritto.
 *
 * Per gli artefatti LOCALI risponde con i file in chiaro: l'utente li avra'
 * comunque sul disco, cifrarli non aggiungerebbe nulla.
 *
 * Per gli STREAMABLE risponde con il pacchetto cifrato e la chiave riavvolta
 * per questo singolo permesso: la stessa risposta intercettata non serve su
 * un'altra macchina.
 */
export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const artifactId = String(body?.artifactId || '');
  if (!artifactId) return NextResponse.json({ error: 'artifactId mancante' }, { status: 400 });
  const device = body?.device ? impronta(String(body.device)) : null;

  const esito = await verificaLicenza(auth.uid, artifactId, device);
  if (!esito.ok) {
    const pool0 = getPool();
    await pool0.query(
      `INSERT INTO "RunGrant" ("licenseId","artifactId","userId","deviceHash","expiresAt",outcome)
       SELECT id,$2,$3,$4,NOW(),$5 FROM "License"
        WHERE "artifactId"=$2 AND "userId"=$3`,
      [null, artifactId, auth.uid, device, 'denied:' + esito.codice]).catch(() => {});
    return NextResponse.json({ error: esito.motivo, code: esito.codice }, { status: 403 });
  }

  const pool = getPool();
  const r = await pool.query(
    `SELECT b.id, b.ciphertext, b.nonce, b.tag, b.sha256, b.manifest, b."fileCount",
            rel.version
       FROM "ArtifactRelease" rel
       JOIN "ArtifactBlob" b ON b.id = rel."blobId"
      WHERE rel.id = $1`, [esito.releaseId]);
  const blob = r.rows[0];
  if (!blob) return NextResponse.json({ error: 'nessuna versione pubblicata' }, { status: 404 });

  const k = await pool.query(
    `SELECT "wrappedKey","wrapNonce","wrapTag" FROM "ArtifactKey" WHERE "blobId" = $1`, [blob.id]);
  if (!k.rows[0]) return NextResponse.json({ error: 'chiave non disponibile' }, { status: 500 });

  const grantId = idNuovo();
  const scade = new Date(Date.now() + DURATA_PERMESSO_MIN * 60_000);

  if (esito.licenseId) {
    await pool.query(
      `INSERT INTO "RunGrant" (id,"licenseId","artifactId","userId","deviceHash","expiresAt",outcome)
       VALUES (DEFAULT,$1,$2,$3,$4,$5,'granted')`,
      [esito.licenseId, artifactId, auth.uid, device, scade]).catch(() => {});
  }

  try {
    const perMe = chiavePerDestinatario(
      { ciphertext: k.rows[0].wrappedKey, nonce: k.rows[0].wrapNonce, tag: k.rows[0].wrapTag },
      tokenGrezzo(req), grantId);

    return NextResponse.json({
      ok: true,
      delivery: esito.delivery,
      grantId,
      expiresAt: scade.toISOString(),
      version: blob.version,
      sha256: blob.sha256,
      fileCount: blob.fileCount,
      manifest: blob.manifest,
      package: {
        ciphertext: b64(blob.ciphertext),
        nonce: b64(blob.nonce),
        tag: b64(blob.tag),
      },
      key: {
        ciphertext: b64(perMe.ciphertext),
        nonce: b64(perMe.nonce),
        tag: b64(perMe.tag),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

/** Stato della licenza, senza consegnare nulla. Serve all'interfaccia. */
export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  const artifactId = new URL(req.url).searchParams.get('artifactId') || '';
  if (!artifactId) return NextResponse.json({ error: 'artifactId mancante' }, { status: 400 });

  const esito = await verificaLicenza(auth.uid, artifactId, null);
  return NextResponse.json(esito.ok
    ? { ok: true, delivery: esito.delivery }
    : { ok: false, code: esito.codice, reason: esito.motivo });
}
