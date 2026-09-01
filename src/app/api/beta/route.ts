import { NextResponse } from 'next/server';
import { getPool } from '@/lib/pg';

// pg richiede il runtime Node; il conteggio deve essere sempre fresco.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Iscrizioni alla beta raccolte dal form della landing ("Entra nella beta").
 *
 *   GET  /api/beta            -> { ok, count }   numero di iscritti reali
 *   POST /api/beta {email,profile} -> { ok, count }   registra un'iscrizione
 *
 * La tabella viene creata on-demand (idempotente) così non serve una migration
 * separata. L'email è UNIQUE: doppi invii dallo stesso indirizzo non gonfiano il
 * conteggio (ON CONFLICT DO NOTHING).
 *
 * Variabili d'ambiente: DATABASE_URL (+ PGSSLMODE) — le stesse già usate dal sito.
 */

async function ensureTable(): Promise<void> {
  await getPool().query(
    `CREATE TABLE IF NOT EXISTS beta_signups (
       id         serial PRIMARY KEY,
       email      text UNIQUE NOT NULL,
       profile    text,
       created_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
}

async function currentCount(): Promise<number> {
  const res = await getPool().query('SELECT count(*)::int AS n FROM beta_signups');
  return res.rows?.[0]?.n ?? 0;
}

export async function GET() {
  try {
    await ensureTable();
    return NextResponse.json({ ok: true, count: await currentCount() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { email?: string; profile?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON non valido' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const profile = (body.profile || '').trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'email non valida' }, { status: 400 });
  }

  try {
    await ensureTable();
    await getPool().query(
      'INSERT INTO beta_signups (email, profile) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      [email, profile],
    );
    return NextResponse.json({ ok: true, count: await currentCount() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
