/**
 * Primo accesso di un account della beta: si sceglie la propria password.
 *
 * Gli account della beta li crea il sistema con una password generata a caso
 * e spedita per email (lib/betaAccount.ts). Al primo accesso con quella
 * password /api/app/login NON rilascia il token: risponde con un passaggio
 * (`challenge`, scopo 'password', trenta minuti) che serve solo a questa
 * rotta. Qui si sceglie la password nuova e solo allora arriva il token vero.
 *
 * Cosi' la password dell'email, che resta scritta in una casella di posta,
 * vale una volta sola; e la sua copia cifrata sul sito si cancella.
 *
 *   POST { challenge, password }  ->  { ok, token, user }
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { createToken, verificaPassaggio, isConfigured } from '@/lib/appToken';
import { consentito, azzera, messaggioLimite } from '@/lib/limiti';
import { passwordCambiata, primaPasswordInUso } from '@/lib/betaAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** La stessa soglia dell'app (dashboard/auth.py, MIN_PASSWORD) e del sito. */
const MINIMO = 8;

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'APP_TOKEN_SECRET is not set on the site' },
                             { status: 503 });
  }
  let b: any = {};
  try { b = await req.json(); } catch { /* vuoto */ }

  const auth = verificaPassaggio(String(b?.challenge || ''), 'password');
  if (!auth) {
    return NextResponse.json(
      { error: 'The sign-in step has expired: sign in again with the password from the email.' },
      { status: 401 });
  }

  const chiaveLimite = 'primapw:' + String(auth.uid);
  const lim = await consentito(chiaveLimite, 10, 900);
  if (!lim.ok) {
    return NextResponse.json({ error: messaggioLimite(lim) }, { status: 429 });
  }

  const password = String(b?.password || '');
  if (password.length < MINIMO) {
    return NextResponse.json(
      { error: `The password must be at least ${MINIMO} characters long.` }, { status: 400 });
  }
  if (password.length > 200) {
    return NextResponse.json({ error: 'The password is too long.' }, { status: 400 });
  }

  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT id, email, "passwordHash", "displayName", username, "emailVerified",
              COALESCE("tokenVersion",1) AS "tokenVersion"
         FROM "User" WHERE id = $1 LIMIT 1`, [auth.uid]);
    const u = r.rows[0];
    if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    // Il passaggio vale solo finche' la prima password e' in uso. Dopo, la
    // password si cambia dalla pagina della sicurezza, con quella attuale:
    // un passaggio rimasto in giro non deve diventare un modo per cambiarla
    // senza conoscerla.
    if (!(await primaPasswordInUso(pool, String(u.id)))) {
      return NextResponse.json(
        { error: 'Your password has already been chosen: sign in with it.' }, { status: 409 });
    }
    if (await bcrypt.compare(password, String(u.passwordHash || ''))) {
      return NextResponse.json(
        { error: 'Choose a password different from the one in the email.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    // Entrare con la password arrivata per email prova anche che la casella
    // e' di chi la usa: l'indirizzo risulta verificato da qui.
    await pool.query(
      `UPDATE "User" SET "passwordHash" = $2,
              "emailVerified" = COALESCE("emailVerified", NOW())
        WHERE id = $1`, [u.id, hash]);
    await passwordCambiata(pool, String(u.id));
    await azzera(chiaveLimite);
    await azzera('login:' + String(u.email).toLowerCase());

    return NextResponse.json({
      ok: true,
      token: createToken(String(u.id), String(u.email), undefined, 'accesso',
                         Number(u.tokenVersion ?? 1)),
      user: {
        id: u.id,
        email: u.email,
        displayName: u.displayName ?? null,
        username: u.username ?? null,
        emailVerified: u.emailVerified ?? new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
