/**
 * Accesso con Google.
 *
 * L'applicazione apre nel browser l'indirizzo restituito da GET; l'utente
 * sceglie l'account su Google; Google rimanda qui con un codice; il sito lo
 * scambia con l'identità e rilascia il token dell'applicazione.
 *
 * Perché il codice e non direttamente un token: il segreto del client non
 * deve mai stare sul computer dell'utente. Lo scambio avviene qui, sul server.
 *
 * Serve configurare sul sito:
 *   GOOGLE_CLIENT_ID      — dalla console Google Cloud
 *   GOOGLE_CLIENT_SECRET  — idem
 * L'URI di reindirizzamento da registrare presso Google è
 *   https://<il-sito>/api/app/google
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured } from '@/lib/appToken';
import { baseUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

function configurato(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(req: NextRequest): string {
  return `${baseUrl(req)}/api/app/google`;
}

/* ── 1. l'app chiede dove mandare l'utente ── */

/** Un `username` libero, derivato dall'indirizzo.
 *
 *  La colonna e' obbligatoria nello schema, e l'inserimento senza fallisce —
 *  visto dal vivo al primo accesso di un utente NUOVO: chi esisteva gia'
 *  entrava, chi arrivava per la prima volta no. Si parte dalla parte prima
 *  della chiocciola e si aggiunge un numero finche' e' libero.
 */
async function nomeUtenteLibero(pool: any, email: string): Promise<string> {
  const base = (String(email).split('@')[0] || 'utente')
    .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'utente';
  for (let i = 0; i < 50; i++) {
    const tentativo = i === 0 ? base : `${base}${i + 1}`;
    const r = await pool.query(
      'SELECT 1 FROM "User" WHERE lower(username) = $1 LIMIT 1', [tentativo]);
    if (!r.rows[0]) return tentativo;
  }
  // dopo cinquanta tentativi si smette di indovinare
  return `${base}${Date.now().toString(36).slice(-6)}`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  // Senza `code` è l'app che chiede l'indirizzo di partenza.
  if (!code) {
    if (!configurato()) {
      return NextResponse.json({
        error: 'accesso con Google non configurato sul sito',
        detail: 'Mancano GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
      }, { status: 503 });
    }
    // `state` lega la richiesta alla risposta: senza, un terzo potrebbe
    // indurre il browser a completare un accesso che non ha iniziato.
    const state = crypto.randomBytes(16).toString('hex');
    // L'app puo' chiedere che Google la richiami DIRETTAMENTE, sul suo
    // indirizzo locale (127.0.0.1). Cosi' l'utente non deve copiare nulla: il
    // browser torna all'app, che manda qui il codice per lo scambio.
    //
    // Il segreto resta comunque sul server: 127.0.0.1 riceve solo il codice,
    // che da solo non apre niente. Google ammette gli indirizzi locali come
    // eccezione alla regola dell'HTTPS proprio per questo caso.
    const locale = req.nextUrl.searchParams.get('local') || '';
    const dove = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(locale)
      ? locale : redirectUri(req);

    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', String(process.env.GOOGLE_CLIENT_ID));
    u.searchParams.set('redirect_uri', dove);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid email profile');
    u.searchParams.set('state', state);
    u.searchParams.set('prompt', 'select_account');
    const res = NextResponse.json({ ok: true, url: u.toString(), state,
                                    redirect: dove });
    res.cookies.set('g_state', state, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
    });
    return res;
  }

  /* ── 2. Google ci rimanda qui col codice ── */

  if (!isConfigured() || !configurato()) {
    return NextResponse.redirect(`${baseUrl(req)}/accesso?err=config`);
  }
  const atteso = req.cookies.get('g_state')?.value || '';
  const dato = req.nextUrl.searchParams.get('state') || '';
  if (!atteso || atteso !== dato) {
    return NextResponse.redirect(`${baseUrl(req)}/accesso?err=state`);
  }

  try {
    // scambio del codice: avviene da server a server, col segreto
    const tk = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: String(process.env.GOOGLE_CLIENT_ID),
        client_secret: String(process.env.GOOGLE_CLIENT_SECRET),
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code',
      }),
    }).then((r) => r.json());

    if (!tk?.id_token) {
      return NextResponse.redirect(`${baseUrl(req)}/accesso?err=token`);
    }

    // Il corpo del token d'identità basta: arriva da uno scambio diretto con
    // Google su canale cifrato, quindi non c'è un terzo che possa averlo
    // sostituito. (Una verifica della firma servirebbe se il token arrivasse
    // dal browser.)
    const parti = String(tk.id_token).split('.');
    const info = JSON.parse(Buffer.from(parti[1], 'base64').toString('utf8'));
    const sub = String(info?.sub || '');
    const email = String(info?.email || '').toLowerCase();
    const nome = String(info?.name || '') || email.split('@')[0];
    if (!sub || !email || info?.email_verified === false) {
      return NextResponse.redirect(`${baseUrl(req)}/accesso?err=email`);
    }

    const pool = getPool();
    // Si cerca prima per `sub`: l'email può cambiare proprietario, il `sub` no.
    let r = await pool.query(
      'SELECT id, email FROM "User" WHERE "googleSub" = $1 LIMIT 1', [sub]);
    let user = r.rows[0];

    if (!user) {
      // Stessa email con account già esistente: si collega, non si duplica.
      r = await pool.query(
        'SELECT id, email FROM "User" WHERE lower(email) = $1 LIMIT 1', [email]);
      user = r.rows[0];
      if (user) {
        await pool.query('UPDATE "User" SET "googleSub" = $2 WHERE id = $1',
                         [user.id, sub]);
      } else {
        const id = crypto.randomUUID();
        // Nessuna password: si scrive un segnaposto che bcrypt non può mai
        // produrre, così nessuna password al mondo apre questo account.
        await pool.query(
          `INSERT INTO "User"(id, email, "passwordHash", "displayName", username,
                              "googleSub", "emailVerified", "createdAt")
           VALUES ($1, $2, '$google$', $3, $4, $5, NOW(), NOW())`,
          [id, email, nome, await nomeUtenteLibero(pool, email), sub]);
        user = { id, email };
      }
    }

    // Il token dell'app viaggia nel frammento dell'indirizzo (#): i frammenti
    // non finiscono nei log del server né nell'intestazione Referer.
    const token = createToken(String(user.id), String(user.email));
    const res = NextResponse.redirect(`${baseUrl(req)}/accesso#token=${token}`);
    res.cookies.delete('g_state');
    return res;
  } catch {
    return NextResponse.redirect(`${baseUrl(req)}/accesso?err=scambio`);
  }
}
