/**
 * Secondo passo dell'accesso: si presenta il codice, si ottiene il token.
 *
 * Il `challenge` ricevuto dal primo passo prova che la password era giusta;
 * qui si prova di avere anche il secondo fattore. Solo superati entrambi
 * viene rilasciato il token vero.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg';
import { createToken, verificaPassaggio, isConfigured } from '@/lib/appToken';
import { consentito, azzera, messaggioLimite } from '@/lib/limiti';
import { verifica as verificaTotp } from '@/lib/totp';
import { verificaCodice } from '@/lib/authcodes';
import { cifra, decifra, cifraturaAttiva } from '@/lib/segreti';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'APP_TOKEN_SECRET non impostato sul sito' },
                             { status: 503 });
  }
  let b: any = {};
  try { b = await req.json(); } catch { /* vuoto */ }

  // Il challenge NON e' un token d'accesso: e' scaduto in dieci minuti e
  // serve solo a dire di chi stiamo parlando senza rimandare la password.
  // Deve essere un token di PASSAGGIO per il secondo fattore, non uno
  // d'accesso: cosi' un token rubato altrove non serve a saltare il passo.
  const auth = verificaPassaggio(String(b?.challenge || ''), '2fa');
  if (!auth) {
    return NextResponse.json({ error: 'sessione di accesso scaduta: rifai il login' },
                             { status: 401 });
  }

  // Un codice a sei cifre e' un milione di combinazioni: a mille tentativi
  // al secondo si esaurisce in venti minuti. Il limite e' quello che rende
  // il secondo fattore una difesa e non una formalita'.
  //
  // Sta DOPO il controllo del challenge: prima, `auth` puo' essere nullo e
  // non c'e' ancora un utente da limitare.
  const chiaveLimite = '2fa:' + String(auth.uid);
  const lim = await consentito(chiaveLimite, 6, 600);
  if (!lim.ok) {
    return NextResponse.json({ error: messaggioLimite(lim) }, { status: 429 });
  }
  const codice = String(b?.code || '').replace(/\D/g, '');
  if (codice.length !== 6) {
    return NextResponse.json({ error: 'serve un codice di sei cifre' }, { status: 400 });
  }

  try {
    const r = await getPool().query(
      `SELECT id, email, "displayName", username, "emailVerified",
              "twoFactorMode"::text AS "twoFactorMode", "twoFactorSecret", COALESCE("tokenVersion",1) AS "tokenVersion"
         FROM "User" WHERE id = $1 LIMIT 1`, [auth.uid]);
    const u = r.rows[0];
    if (!u) return NextResponse.json({ error: 'utente non trovato' }, { status: 404 });

    const modo = String(u.twoFactorMode || 'none');
    let valido = false;
    if (modo === 'totp') {
      valido = verificaTotp(decifra(String(u.twoFactorSecret || '')), codice);
    } else if (modo === 'email') {
      valido = (await verificaCodice(String(u.id), 'login_2fa', codice)).ok;
    } else {
      // il secondo fattore e' stato disattivato nel frattempo: si entra
      valido = true;
    }

    if (!valido) {
      return NextResponse.json({ error: 'codice non valido' }, { status: 403 });
    }

    await azzera(chiaveLimite);
    return NextResponse.json({
      ok: true,
      token: createToken(String(u.id), String(u.email),
                         undefined, 'accesso',
                         Number(u.tokenVersion ?? 1)),
      user: {
        id: u.id, email: u.email,
        displayName: u.displayName ?? null,
        username: u.username ?? null,
        emailVerified: u.emailVerified ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
