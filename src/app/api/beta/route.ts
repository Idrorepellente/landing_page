import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dns from 'node:dns/promises';
import { getPool } from '@/lib/pg';
import { consentito } from '@/lib/limiti';
import { betaAttiva } from '@/lib/beta';
import { preparaBeta, registraRichiesta } from '@/lib/betaAccount';

// pg richiede il runtime Node; il conteggio deve essere sempre fresco.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Richieste di accesso alla beta dal form della landing ("Entra nella beta").
 *
 *   GET  /api/beta                     -> { ok, count, attiva }
 *   POST /api/beta {email, profile}    -> { ok, count, esito, stato? }
 *
 * Da novembre 2026 ogni richiesta CREA L'ACCOUNT di quell'indirizzo, con una
 * password generata dal sistema (lib/betaAccount.ts): con la beta attiva
 * finche' gli account del sistema sono meno del limite (405 se non e'
 * impostato), altrimenti la richiesta resta in lista d'attesa. Le credenziali
 * arrivano per email con l'invito alla beta, che parte dal pannello di
 * amministrazione («Invite all») — o subito, se la beta e' gia' iniziata.
 *
 * `esito`: 'account' (creato), 'esistente' (l'indirizzo aveva gia' un
 * account), 'lista' (posti finiti), 'gia' (richiesta gia' fatta: `stato` dice
 * com'era andata). La landing sceglie il messaggio da qui.
 *
 * Contro chi riempirebbe i posti con indirizzi inventati: un campo nascosto
 * che solo i programmi compilano, un limite di richieste per indirizzo IP, e
 * il controllo che il dominio dell'email riceva posta.
 */

async function conteggio(): Promise<number> {
  const res = await getPool().query('SELECT count(*)::int AS n FROM beta_signups');
  return res.rows?.[0]?.n ?? 0;
}

function ipDi(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || (req.headers.get('x-real-ip') || '').trim() || 'sconosciuto';
}

/**
 * Il dominio riceve posta? true / false, oppure null se non si sa (DNS lento
 * o irraggiungibile): nel dubbio si lascia passare, perche' un controllo che
 * non si puo' fare non deve respingere una persona vera.
 */
async function dominioRiceve(dominio: string): Promise<boolean | null> {
  if (process.env.BETA_CONTROLLO_DOMINIO === '0') return null;
  const entro = <T>(p: Promise<T>) => Promise.race([
    p, new Promise<never>((_, no) => setTimeout(() => no(Object.assign(
      new Error('timeout'), { code: 'ETIMEOUT' })), 2500)),
  ]);
  try {
    const mx = await entro(dns.resolveMx(dominio));
    if (mx && mx.length) return true;
  } catch (e: any) {
    if (e?.code === 'ENOTFOUND') return false;        // il dominio non esiste
    if (e?.code !== 'ENODATA') return null;           // DNS che non risponde
  }
  // senza MX la posta va all'indirizzo del dominio (RFC 5321, 5.1)
  try {
    const a = await entro(dns.resolve4(dominio));
    return a.length > 0;
  } catch (e: any) {
    if (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA') return false;
    return null;
  }
}

export async function GET() {
  try {
    const pool = getPool();
    await preparaBeta(pool);
    // `attiva`: con la beta accesa ci si iscrive solo da qui (l'app lo usa
    // per dire che le iscrizioni sono chiuse, invece di un modulo che fallisce)
    return NextResponse.json({ ok: true, count: await conteggio(), attiva: await betaAttiva(pool) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: string; profile?: string; sito?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const profile = (body.profile || '').trim().slice(0, 80) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: 'email non valida' }, { status: 400 });
  }

  try {
    // Il campo nascosto: una persona non lo vede e non lo compila. A chi lo
    // compila si risponde come se fosse andata bene, senza fare niente: un
    // programma che riceve un errore cambia strategia, uno che riceve un «ok»
    // va avanti contento.
    if ((body.sito || '').trim()) {
      return NextResponse.json({ ok: true, count: await conteggio(), esito: 'account' });
    }

    const lim = await consentito('beta:ip:' + ipDi(req), 6, 3600);
    if (!lim.ok) {
      return NextResponse.json({
        ok: false,
        error: 'Troppe richieste da questa connessione: riprova fra un\'ora.',
      }, { status: 429 });
    }

    const riceve = await dominioRiceve(email.split('@')[1]);
    if (riceve === false) {
      return NextResponse.json({
        ok: false,
        error: 'Questo indirizzo non può ricevere email: controlla il dominio dopo la @.',
      }, { status: 400 });
    }

    const r = await registraRichiesta(email, profile);
    return NextResponse.json({
      ok: true,
      count: await conteggio(),
      esito: r.esito === 'creato' ? 'account' : r.esito,
      stato: r.stato ?? null,
      invitato: !!(r.invito && r.invito.ok),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
