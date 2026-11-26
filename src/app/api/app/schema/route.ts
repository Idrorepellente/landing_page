import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Allineamento dello schema per il marketplace.
 *
 * L'app costruisce queste istruzioni combinando pezzi di testo (nomi di colonna
 * in un ciclo, valori dell'enum, ...), quindi non sono query fisse e non
 * possono stare nell'elenco di quelle consentite: il canale dati le
 * rifiuterebbe, lasciando il database senza le colonne e le tabelle che il
 * marketplace usa — un artefatto pubblicato non veniva salvato.
 *
 * Le migrazioni vivono percio' qui, dove il sito ha la propria connessione.
 * Sono tutte idempotenti (IF NOT EXISTS), quindi la chiamata si puo' ripetere
 * senza effetti collaterali.
 */

const NEW_KINDS = ['METRIC', 'REGIME', 'PROJECT'];

// Copiate dall'elenco autorevole in dashboard/web_db.py (ensure_schema).
// I nomi devono combaciare ESATTAMENTE con quelli usati dalle query: una
// colonna "forSale" invece di "isForSale" farebbe fallire l'elenco del
// marketplace senza che nulla lo segnali.
const COLUMNS: [string, string][] = [
  ['"priceCents"', 'INTEGER NOT NULL DEFAULT 0'],
  ['currency', "TEXT NOT NULL DEFAULT 'EUR'"],
  ['"isForSale"', 'BOOLEAN NOT NULL DEFAULT FALSE'],
  ['summary', 'TEXT'],
  ['"coverEmoji"', 'TEXT'],
  ['metrics', 'JSONB'],
  ['bundle', 'JSONB'],
  ['"publishedAt"', 'TIMESTAMPTZ'],
  ['downloads', 'INTEGER NOT NULL DEFAULT 0'],
  ['version', 'TEXT'],
  ['subtitle', 'TEXT'],
  ['"pricePeriod"', "TEXT NOT NULL DEFAULT 'once'"],
  ['details', 'JSONB'],
  ['files', 'JSONB'],
  ['rating', 'NUMERIC'],
  ['"isPublic"', 'BOOLEAN NOT NULL DEFAULT TRUE'],
];

async function enumName(pool: any): Promise<string | null> {
  const r = await pool.query(
    `SELECT t.typname AS name
       FROM pg_type t
       JOIN pg_attribute a ON a.atttypid = t.oid
       JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'Artifact' AND a.attname = 'kind' LIMIT 1`);
  return r.rows[0]?.name || null;
}

export async function POST(req: NextRequest) {
  // Serve un token valido: non e' un endpoint pubblico, ma non richiede
  // privilegi particolari — chi usa l'app deve poter pubblicare.
  if (!tokenFromRequest(req)) {
    return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  }

  const pool = getPool();
  const done: string[] = [];
  const failed: string[] = [];

  const run = async (label: string, sql: string) => {
    try {
      await pool.query(sql);
      done.push(label);
    } catch (e: any) {
      failed.push(`${label}: ${String(e?.message || e)}`);
    }
  };

  try {
    // 1) valori dell'enum: vanno aggiunti in transazioni separate, non si
    //    possono creare e usare nello stesso blocco
    const en = await enumName(pool);
    if (en) {
      for (const k of NEW_KINDS) {
        await run(`kind:${k}`, `ALTER TYPE "${en}" ADD VALUE IF NOT EXISTS '${k}'`);
      }
    }

    // 2) colonne mancanti su Artifact
    for (const [name, type] of COLUMNS) {
      await run(`col:${name}`, `ALTER TABLE "Artifact" ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }

    // 3) tabelle di supporto
    await run('tbl:Purchase', `
      CREATE TABLE IF NOT EXISTS "Purchase" (
        id TEXT PRIMARY KEY,
        "artifactId" TEXT NOT NULL,
        "buyerId" TEXT NOT NULL,
        "sellerId" TEXT,
        "amountCents" INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'EUR',
        status TEXT NOT NULL DEFAULT 'pending',
        provider TEXT,
        "providerRef" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "paidAt" TIMESTAMPTZ)`);

    await run('tbl:ArtifactComment', `
      CREATE TABLE IF NOT EXISTS "ArtifactComment" (
        id TEXT PRIMARY KEY,
        "artifactId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        body TEXT NOT NULL,
        rating INTEGER,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

    await run('idx:Purchase_buyer',
      'CREATE INDEX IF NOT EXISTS "Purchase_buyer_idx" ON "Purchase" ("buyerId")');
    await run('idx:Comment_artifact',
      'CREATE INDEX IF NOT EXISTS "ArtifactComment_artifact_idx" ON "ArtifactComment" ("artifactId")');

    return NextResponse.json({ ok: failed.length === 0, applied: done.length, done, failed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), done, failed },
                             { status: 500 });
  }
}

/**
 * Diagnostica: aprendo questo indirizzo nel browser si distingue subito il
 * "non ancora distribuito" dal "presente ma in errore".
 *   404  -> il deploy del sito non contiene questo file
 *   JSON -> l'endpoint c'e' (e dice se lo schema risulta gia' allineato)
 */
export async function GET() {
  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Artifact'`);
    const have = new Set(r.rows.map((x: any) => String(x.column_name)));

    // Colonne obbligatorie senza valore predefinito: sono quelle che fanno
    // fallire un inserimento con "violates not-null constraint". Prisma ne
    // riempie alcune a livello applicativo (updatedAt), quindi nel database
    // non hanno un DEFAULT e vanno valorizzate esplicitamente.
    const nn = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_name IN ('Artifact','Feedback','Message','Purchase','ArtifactComment')
          AND is_nullable = 'NO' AND column_default IS NULL
        ORDER BY table_name, column_name`);
    const obbligatorie: Record<string, string[]> = {};
    for (const row of nn.rows) {
      const t = String(row.table_name);
      (obbligatorie[t] ||= []).push(String(row.column_name));
    }
    const missing = COLUMNS
      .map(([n]) => n.replace(/"/g, ''))
      .filter((n) => !have.has(n));
    return NextResponse.json({
      ok: true,
      endpoint: 'attivo',
      schemaAllineato: missing.length === 0,
      colonneMancanti: missing,
      colonneObbligatorieSenzaDefault: obbligatorie,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, endpoint: 'attivo',
                              error: String(e?.message || e) }, { status: 500 });
  }
}
