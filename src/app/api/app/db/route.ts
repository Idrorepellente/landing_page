import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest, isAdmin } from '@/lib/appToken';
import manifest from '@/lib/appQueries.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Canale dati dell'app desktop.
 *
 * L'app NON invia più SQL: chiede una query per nome, scegliendola da un elenco
 * che il sito conosce in anticipo (`appQueries.json`, generato dal codice
 * dell'app). Tutto il resto viene rifiutato, quindi non è possibile leggere
 * tabelle non previste né alterare il database, nemmeno con un token valido.
 *
 * Per le query legate a un utente il manifest indica quale parametro
 * rappresenta l'identità: quel valore viene SOSTITUITO con l'id ricavato dal
 * token, così chiedere i dati di un altro non serve a nulla.
 */

type OpDef = { sql: string; userParam: number | null; source?: string };
const OPS = (manifest as any).ops as Record<string, OpDef>;

// %s (stile psycopg) -> $1, $2 … (node-postgres)
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/%s/g, () => '$' + ++i);
}

const WRITE = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/i;

export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'token assente o scaduto: esegui di nuovo l\'accesso' },
      { status: 401 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const op = String(body?.op || '');
  const def = OPS[op];
  if (!def) {
    // niente dettagli: un elenco degli op validi aiuterebbe solo chi sonda
    return NextResponse.json({ error: 'operazione non consentita' }, { status: 403 });
  }

  const params: any[] = Array.isArray(body?.params) ? [...body.params] : [];
  const expected = (def.sql.match(/%s/g) || []).length;
  if (params.length !== expected) {
    return NextResponse.json(
      { error: `parametri attesi ${expected}, ricevuti ${params.length}` },
      { status: 400 },
    );
  }

  // identità: imposta dal server, mai dal client
  if (def.userParam !== null && def.userParam !== undefined) {
    params[def.userParam] = auth.uid;
  }

  // Struttura del database. Le sole istruzioni ammesse sono i CREATE TABLE IF
  // NOT EXISTS gia' presenti nell'elenco: fanno parte del codice dell'app, che
  // crea le proprie tabelle al primo utilizzo. Saltarli lasciava l'app senza
  // tabelle (i feedback, per esempio, non si salvavano). Tutto il resto —
  // DROP, TRUNCATE, ALTER — resta vietato anche se finisse nell'elenco.
  if (/^\s*(DROP|TRUNCATE|ALTER)/i.test(def.sql)) {
    return NextResponse.json({ error: 'operazione non consentita' }, { status: 403 });
  }
  if (/^\s*CREATE/i.test(def.sql)
      && !/^\s*CREATE\s+(TABLE|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(def.sql)) {
    return NextResponse.json({ error: 'operazione non consentita' }, { status: 403 });
  }

  try {
    const res = await getPool().query(toPgPlaceholders(def.sql), params);
    return NextResponse.json({
      ok: true,
      rows: res.rows,
      rowCount: res.rowCount,
      write: WRITE.test(def.sql) || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/** Diagnostica: dice se il token è valido, senza rivelare altro. */
export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    email: auth.email,
    admin: isAdmin(auth.email),
    ops: Object.keys(OPS).length,
    version: (manifest as any).version ?? null,
  });
}

/**
 * Verifica di allineamento.
 *
 * L'app invia le impronte delle query che intende usare e riceve l'elenco di
 * quelle che il sito non conosce. Serve a distinguere subito "il sito e'
 * indietro di un aggiornamento" da un guasto vero: sono situazioni con gli
 * stessi sintomi ma rimedi opposti. Non espone nulla — chi chiede possiede gia'
 * le impronte, e non si restituisce mai il testo delle query.
 */
export async function PUT(req: NextRequest) {
  if (!tokenFromRequest(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const wanted: string[] = Array.isArray(body?.ops) ? body.ops.map(String) : [];
  const missing = wanted.filter((h) => !OPS[h]);
  return NextResponse.json({
    ok: missing.length === 0,
    richieste: wanted.length,
    sconosciute: missing.length,
    ops: Object.keys(OPS).length,
  });
}
