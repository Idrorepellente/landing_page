/**
 * Scambio del codice quando Google richiama direttamente l'applicazione.
 *
 * L'app riceve il `code` sul proprio indirizzo locale e lo manda qui: il
 * segreto del client resta sul server, dove deve stare. Il codice da solo non
 * apre nulla — vale una volta, pochi secondi, e solo insieme al segreto.
 *
 * `redirect_uri` va rimandato identico a quello usato nella richiesta di
 * autorizzazione: Google lo confronta, e non deve essere un indirizzo che il
 * sito possa raggiungere — solo uno che combaci.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured } from '@/lib/appToken';
import { betaAttiva, ammessoInBeta } from '@/app/api/dashboard/beta/route';

export const runtime = 'nodejs';

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

export async function POST(req: NextRequest) {
  if (!isConfigured() || !process.env.GOOGLE_CLIENT_ID
      || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'accesso con Google non configurato' },
                             { status: 503 });
  }
  let b: any = {};
  try { b = await req.json(); } catch { /* vuoto */ }
  const code = String(b?.code || '');
  const redirect = String(b?.redirect || '');
  if (!code || !redirect) {
    return NextResponse.json({ error: 'richiesta incompleta' }, { status: 400 });
  }
  // Solo indirizzi locali: senza questo controllo, chi chiamasse questo
  // endpoint potrebbe farsi scambiare un codice ottenuto con un redirect
  // arbitrario.
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(redirect)) {
    return NextResponse.json({ error: 'indirizzo di ritorno non ammesso' },
                             { status: 400 });
  }

  try {
    const tk = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: String(process.env.GOOGLE_CLIENT_ID),
        client_secret: String(process.env.GOOGLE_CLIENT_SECRET),
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      }),
    }).then((r) => r.json());

    if (!tk?.id_token) {
      return NextResponse.json({
        error: 'Google non ha completato l\'accesso',
        detail: String(tk?.error_description || tk?.error || ''),
      }, { status: 403 });
    }

    const parti = String(tk.id_token).split('.');
    const info = JSON.parse(Buffer.from(parti[1], 'base64').toString('utf8'));
    const sub = String(info?.sub || '');
    const email = String(info?.email || '').toLowerCase();
    const nome = String(info?.name || '') || email.split('@')[0];
    if (!sub || !email || info?.email_verified === false) {
      return NextResponse.json({ error: 'indirizzo Google non verificato' },
                               { status: 403 });
    }

    const pool = getPool();
    let r = await pool.query(
      'SELECT id, email, "displayName" FROM "User" WHERE "googleSub" = $1 LIMIT 1',
      [sub]);
    let user = r.rows[0];

    if (!user) {
      r = await pool.query(
        'SELECT id, email, "displayName" FROM "User" WHERE lower(email) = $1 LIMIT 1',
        [email]);
      user = r.rows[0];
      if (user) {
        // stesso indirizzo, account gia' esistente: si collega, non si duplica
        await pool.query('UPDATE "User" SET "googleSub" = $2 WHERE id = $1',
                         [user.id, sub]);
      } else {
        const id = crypto.randomUUID();
        await pool.query(
          `INSERT INTO "User"(id, email, "passwordHash", "displayName", username,
                              "googleSub", "emailVerified", "createdAt")
           VALUES ($1, $2, '$google$', $3, $4, $5, NOW(), NOW())`,
          [id, email, nome, await nomeUtenteLibero(pool, email), sub]);
        user = { id, email, displayName: nome };
      }
    }

    // ---- ACCESSO RISERVATO DURANTE LA BETA -------------------------------
    // Google e' una porta d'ingresso diversa dalla password, e va chiusa
    // anch'essa: proteggere una sola delle due lascia l'altra spalancata.
    //
    // Il controllo sta DOPO la creazione dell'utente, non prima: chi non e'
    // ammesso oggi potrebbe esserlo domani, e non avrebbe senso perdere il
    // collegamento con il suo account Google nel frattempo.
    if (await betaAttiva(pool)) {
      if (!(await ammessoInBeta(pool, String(user.email)))) {
        return NextResponse.json({
          error: 'L\'applicazione e\' in fase beta e questo indirizzo non e\' '
               + 'fra quelli ammessi.',
          detail: 'Se pensi che debba esserlo, scrivi a chi gestisce la beta.',
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      ok: true,
      token: createToken(String(user.id), String(user.email)),
      user: { id: user.id, email: user.email,
              displayName: user.displayName ?? nome, username: null },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
