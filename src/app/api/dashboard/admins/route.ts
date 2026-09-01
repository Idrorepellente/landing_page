import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * L'elenco degli amministratori, e chi puo' modificarlo.
 *
 * Tre origini, in ordine di autorita':
 *   SUPER_ADMIN    variabile d'ambiente. Non si tocca da qui: e' la chiave
 *                  che regge tutto il resto. Se fosse un dato, chiunque
 *                  entrasse nel database potrebbe nominarsi tale.
 *   ADMIN_EMAILS   variabile d'ambiente. Resta per compatibilita' con chi
 *                  gia' la usa.
 *   "AdminEmail"   tabella. Qui vivono quelli aggiunti dal pannello.
 */
function daEnv(nome: string): string[] {
  return (process.env[nome] || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

async function daTabella(): Promise<string[]> {
  try {
    const r = await getPool().query(
      'SELECT email FROM "AdminEmail" ORDER BY "addedAt" DESC');
    return r.rows.map((x: any) => String(x.email).toLowerCase());
  } catch {
    // La tabella puo' non esistere ancora: l'elenco delle variabili basta,
    // e il pannello dira' che serve eseguire lo schema.
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const super_ = daEnv('SUPER_ADMIN');
  const env = daEnv('ADMIN_EMAILS');
  const tab = await daTabella();

  // Un indirizzo puo' comparire in piu' origini: si contano una volta sola.
  const admins = Array.from(new Set([...super_, ...env, ...tab]));

  return NextResponse.json({
    ok: true,
    admins,
    super: super_,
    da_env: env,
    da_tabella: tab,
    configured: admins.length > 0,
  });
}

/** Aggiunge o rimuove un amministratore. Solo il super amministratore. */
export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    const chiede = String(b?.richiedente || '').trim().toLowerCase();
    const azione = String(b?.azione || '').trim();
    const bersaglio = String(b?.email || '').trim().toLowerCase();

    const super_ = daEnv('SUPER_ADMIN');
    if (!super_.length) {
      return NextResponse.json({
        error: 'SUPER_ADMIN non impostato sul sito.',
        detail: 'Finche\' quella variabile e\' vuota nessuno puo\' cambiare '
              + 'l\'elenco: e\' il livello che regge tutti gli altri.',
      }, { status: 503 });
    }
    if (!chiede || !super_.includes(chiede)) {
      return NextResponse.json({
        error: 'solo il super amministratore puo\' modificare l\'elenco',
      }, { status: 403 });
    }
    if (!bersaglio.includes('@')) {
      return NextResponse.json({ error: 'indirizzo non valido' }, { status: 400 });
    }

    // ── NON SI RIMUOVE SE STESSI ─────────────────────────────────────────
    // Senza questo vincolo basta un clic distratto per restare senza nessuno
    // in grado di nominare amministratori, e l'unico rimedio sarebbe tornare
    // su Vercel: esattamente il passaggio che si voleva evitare.
    if (azione === 'rimuovi' && super_.includes(bersaglio)) {
      return NextResponse.json({
        error: 'Il super amministratore non puo\' essere rimosso.',
        detail: 'E\' l\'unico account che puo\' nominare gli altri: toglierlo '
              + 'lascerebbe l\'elenco senza nessuno in grado di modificarlo. '
              + 'Per cambiarlo si passa dalla variabile SUPER_ADMIN.',
      }, { status: 409 });
    }

    const pool = getPool();
    if (azione === 'aggiungi') {
      await pool.query(
        `INSERT INTO "AdminEmail"(email, "addedBy", nota)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET "addedBy" = EXCLUDED."addedBy"`,
        [bersaglio, chiede, String(b?.nota || '').slice(0, 200) || null]);
      return NextResponse.json({ ok: true, email: bersaglio, azione });
    }
    if (azione === 'rimuovi') {
      const r = await pool.query(
        'DELETE FROM "AdminEmail" WHERE email = $1', [bersaglio]);
      if (!r.rowCount) {
        // Puo' venire da ADMIN_EMAILS: si dice, invece di fingere di averlo
        // tolto e lasciare l'utente a chiedersi perche' e' ancora li'.
        const env = daEnv('ADMIN_EMAILS');
        if (env.includes(bersaglio)) {
          return NextResponse.json({
            error: 'Questo indirizzo viene da ADMIN_EMAILS, non dal pannello.',
            detail: 'Per toglierlo modifica quella variabile sul sito e '
                  + 'ridistribuisci.',
          }, { status: 409 });
        }
        return NextResponse.json({ error: 'non era fra gli amministratori' },
                                 { status: 404 });
      }
      return NextResponse.json({ ok: true, email: bersaglio, azione });
    }
    return NextResponse.json({ error: 'azione sconosciuta: aggiungi o rimuovi' },
                             { status: 400 });
  } catch (e: any) {
    const testo = String(e?.message || e);
    if (/relation .*AdminEmail.* does not exist/i.test(testo)) {
      return NextResponse.json({
        error: 'La tabella degli amministratori non esiste ancora.',
        detail: 'Esegui marketplace_admin.sql sul Postgres del sito.',
        raw: testo,
      }, { status: 500 });
    }
    return NextResponse.json({ error: testo, raw: testo }, { status: 500 });
  }
}
