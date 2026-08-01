import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Accesso dell'app desktop.
 *
 * La verifica della password avviene QUI: l'hash non lascia mai il server.
 * Prima l'app scaricava `passwordHash` e confrontava in locale, il che
 * significava esporre gli hash di chiunque a chi possedesse il segreto
 * condiviso. In cambio l'app riceve un token personale con scadenza.
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'APP_TOKEN_SECRET non impostato sul sito' },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: 'credenziali mancanti' }, { status: 400 });
  }

  try {
    const res = await getPool().query(
      'SELECT id, email, "passwordHash", "displayName", username, "emailVerified" FROM "User" WHERE lower(email) = $1 LIMIT 1',
      [email],
    );
    const user = res.rows[0];

    // Stessa risposta e stesso costo se l'utente non esiste: altrimenti i tempi
    // di risposta direbbero quali indirizzi sono registrati.
    const hash = user?.passwordHash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      return NextResponse.json({ error: 'credenziali non valide' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      token: createToken(String(user.id), String(user.email)),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? null,
        username: user.username ?? null,
        emailVerified: user.emailVerified ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
