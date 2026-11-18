import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured, tokenFromRequest } from '@/lib/appToken';
import { betaAttiva, BETA_ISCRIZIONI_CHIUSE } from '@/lib/beta';
import { passwordCambiata } from '@/lib/betaAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creazione account e cambio password per l'app desktop.
 *
 * L'hashing avviene sul server: l'app non maneggia mai `passwordHash`, né in
 * lettura né in scrittura. Le query che toccano quel campo sono infatti escluse
 * dall'elenco delle operazioni consentite (vedi appQueries.json).
 *
 *   POST { action: "register", email, username, password, displayName? }
 *   POST { action: "password", email, password }   + token valido dell'utente
 */

function cuid(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'APP_TOKEN_SECRET is not set on the site' },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const action = String(body?.action || 'register');
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!email || password.length < 8) {
    return NextResponse.json(
      { error: 'email mancante o password troppo corta (minimo 8 caratteri)' },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();

    // ---------------------------------------------------------------- cambio
    if (action === 'password') {
      // solo il diretto interessato, e solo con un token valido
      const auth = tokenFromRequest(req);
      if (!auth || auth.email.toLowerCase() !== email) {
        return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
      }
      const hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE "User" SET "passwordHash" = $1 WHERE id = $2', [
        hash,
        auth.uid,
      ]);
      await passwordCambiata(pool, String(auth.uid));
      return NextResponse.json({ ok: true });
    }

    // ------------------------------------------------------------ iscrizione
    // ---- NIENTE ISCRIZIONI DURANTE LA BETA -------------------------------
    // Con la beta attiva NESSUNO crea un account da se', nemmeno un indirizzo
    // ammesso: gli account li crea il sistema, uno per ogni richiesta dal
    // form del sito (fino al limite) e quelli aggiunti dal pannello (vedi
    // lib/betaAccount.ts). Il motivo si DICE: chi prova a registrarsi deve
    // sapere dove andare, altrimenti riprova all'infinito credendo a un
    // guasto.
    if (await betaAttiva(pool)) {
      return NextResponse.json(BETA_ISCRIZIONI_CHIUSE, { status: 403 });
    }

    const username = String(body?.username || '').trim() || email.split('@')[0];
    const displayName = String(body?.displayName || '').trim() || username;

    const dup = await pool.query(
      'SELECT id FROM "User" WHERE lower(email) = $1 OR lower(username) = $2 LIMIT 1',
      [email, username.toLowerCase()],
    );
    if (dup.rows.length) {
      return NextResponse.json({ error: 'Email o username già in uso.' }, { status: 409 });
    }

    const id = cuid();
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO "User"(id, email, username, "passwordHash", "displayName", "createdAt") VALUES ($1,$2,$3,$4,$5, now())',
      [id, email, username, hash, displayName],
    );

    return NextResponse.json({
      ok: true,
      token: createToken(id, email),
      user: { id, email, username, displayName },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
