import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { checkSecret, toPgPlaceholders } from '@/lib/dashApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Esegue una query parametrizzata sul DB centrale per conto della dashboard.
// I segreti del DB restano sul sito; la dashboard non ha piu' DATABASE_URL.
export async function POST(req: NextRequest) {
  // Endpoint LEGACY: esegue SQL arbitrario, quindi non va esposto ai client.
  // L'app desktop non lo usa più (passa da /api/app/db, con elenco chiuso di
  // query e identità presa dal token). Resta solo per manutenzione da macchine
  // fidate e si disattiva con DASHBOARD_QUERY_DISABLED=1.
  if (process.env.DASHBOARD_QUERY_DISABLED === '1') {
    return NextResponse.json({ error: 'endpoint disattivato' }, { status: 410 });
  }
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const sql = typeof body?.sql === 'string' ? body.sql : '';
  const params = Array.isArray(body?.params) ? body.params : [];
  if (!sql) {
    return NextResponse.json({ error: 'missing sql' }, { status: 400 });
  }
  try {
    const res = await getPool().query(toPgPlaceholders(sql), params);
    return NextResponse.json({ ok: true, rows: res.rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
