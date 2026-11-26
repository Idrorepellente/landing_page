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

async function daTabella(): Promise<{ attivi: string[]; revocati: string[] }> {
  try {
    const r = await getPool().query(
      'SELECT email, revocato FROM "AdminEmail" ORDER BY "addedAt" DESC');
    return {
      attivi: r.rows.filter((x: any) => !x.revocato)
                    .map((x: any) => String(x.email).toLowerCase()),
      revocati: r.rows.filter((x: any) => x.revocato)
                      .map((x: any) => String(x.email).toLowerCase()),
    };
  } catch {
    // La tabella puo' non esistere ancora: l'elenco delle variabili basta,
    // e il pannello dira' che serve eseguire lo schema.
    return { attivi: [], revocati: [] };
  }
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const super_ = daEnv('SUPER_ADMIN');
  const env = daEnv('ADMIN_EMAILS');
  const tab = await daTabella();

  // La REVOCA vince sulla variabile d'ambiente, ma non sul super
  // amministratore: quello resta comunque, altrimenti basterebbe una riga nel
  // database per lasciare il sistema senza nessuno al comando.
  const revocati = new Set(tab.revocati.filter((e) => !super_.includes(e)));
  const admins = Array.from(new Set([...super_, ...env, ...tab.attivi]))
    .filter((e) => !revocati.has(e));

  return NextResponse.json({
    ok: true,
    admins,
    super: super_,
    da_env: env.filter((e) => !revocati.has(e)),
    da_tabella: tab.attivi,
    revocati: Array.from(revocati),
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
      return NextResponse.json({ error: 'invalid address' }, { status: 400 });
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
      // `revocato = FALSE` esplicito: aggiungere qualcuno che era stato
      // revocato deve rimetterlo davvero, non lasciarlo a meta'.
      await pool.query(
        `INSERT INTO "AdminEmail"(email, "addedBy", revocato, nota)
         VALUES ($1, $2, FALSE, $3)
         ON CONFLICT (email) DO UPDATE
           SET "addedBy" = EXCLUDED."addedBy", revocato = FALSE`,
        [bersaglio, chiede, String(b?.nota || '').slice(0, 200) || null]);
      return NextResponse.json({ ok: true, email: bersaglio, azione });
    }
    if (azione === 'rimuovi') {
      // Si REVOCA, non si cancella soltanto. Cancellare basterebbe per chi e'
      // stato aggiunto dal pannello, ma non per chi compare in ADMIN_EMAILS:
      // quello tornerebbe al primo ricaricamento, perche' la variabile e'
      // ancora li'. Una riga di revoca vince su entrambe le origini.
      await pool.query(
        `INSERT INTO "AdminEmail"(email, "addedBy", revocato, nota)
         VALUES ($1, $2, TRUE, $3)
         ON CONFLICT (email) DO UPDATE
           SET revocato = TRUE, "addedBy" = EXCLUDED."addedBy"`,
        [bersaglio, chiede, String(b?.nota || '').slice(0, 200) || null]);
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
