import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured, verifyToken } from '@/lib/appToken';
import { consentito, azzera, messaggioLimite } from '@/lib/limiti';
import { verifica as verificaTotp } from '@/lib/totp';
import { creaCodice, verificaCodice } from '@/lib/authcodes';
import { inviaEmail, postaConfigurata } from '@/lib/mailer';
import { betaAttiva, ammessoInBeta } from '@/app/api/dashboard/beta/route';

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

  // Limite sui tentativi: senza, la password si prova all'infinito.
  // La chiave e' l'INDIRIZZO, non l'IP: gli indirizzi IP si cambiano con
  // nulla, e limitare per IP penalizza chi condivide una connessione.
  const chiaveLimite = 'login:' + email;
  const lim = await consentito(chiaveLimite, 8, 900);
  if (!lim.ok) {
    return NextResponse.json({ error: messaggioLimite(lim) }, { status: 429 });
  }
  const password = String(body?.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: 'credenziali mancanti' }, { status: 400 });
  }

  try {
    const res = await getPool().query(
      'SELECT id, email, "passwordHash", "displayName", username, "emailVerified", '
      + '"twoFactorMode"::text AS "twoFactorMode", "twoFactorSecret", COALESCE("tokenVersion",1) AS "tokenVersion" '
      + 'FROM "User" WHERE lower(email) = $1 LIMIT 1',
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

    // ---- ACCESSO RISERVATO DURANTE LA BETA -------------------------------
    // Il controllo sta QUI, dopo la verifica della password: prima sarebbe
    // un modo per scoprire quali indirizzi sono invitati provandoli a uno a
    // uno, senza conoscerne la password.
    //
    // Quando la beta e' spenta questa funzione risponde subito false e non
    // si legge nemmeno la lista: nessun costo, e l'accesso resta quello di
    // sempre.
    if (await betaAttiva(getPool())) {
      if (!(await ammessoInBeta(getPool(), String(user.email)))) {
        return NextResponse.json({
          error: 'L\'applicazione e\' in fase beta e questo indirizzo non e\' '
               + 'fra quelli ammessi.',
          detail: 'Se pensi che debba esserlo, scrivi a chi gestisce la beta.',
        }, { status: 403 });
      }
    }

    // ---- VERIFICA IN DUE PASSAGGI ----------------------------------------
    // Password corretta non basta ancora: se il secondo fattore e' attivo, il
    // token NON viene rilasciato. Si risponde con una richiesta di codice, e
    // il token arriva solo al secondo giro.
    //
    // Questo accade solo quando si RIFA' l'accesso: una sessione gia' aperta
    // continua a valere, ed e' voluto — chiedere un codice a ogni apertura
    // dell'applicazione sarebbe un fastidio quotidiano senza guadagno di
    // sicurezza, perche' il computer e' gia' quello di chi ha superato la
    // verifica.
    const modo2fa = String(user.twoFactorMode || 'none');
    if (modo2fa !== 'none') {
      if (modo2fa === 'email') {
        if (!postaConfigurata()) {
          return NextResponse.json({
            error: 'verifica in due passaggi via email attiva, ma la posta non '
                 + 'e\' configurata sul sito: contatta il supporto',
          }, { status: 503 });
        }
        const codice = await creaCodice(String(user.id), 'login_2fa', 10);
        await inviaEmail(String(user.email), 'Codice di accesso Lyra',
          `Il tuo codice di accesso e' ${codice}. Scade fra 10 minuti.\n`
          + 'Se non stai accedendo tu, qualcuno conosce la tua password: '
          + 'cambiala appena puoi.');
      }
      await azzera(chiaveLimite);   // password corretta: non e' un tentativo a vuoto
      return NextResponse.json({
        need2fa: true,
        mode: modo2fa,
        // Un token BREVE che prova solo il superamento della password. Non
        // apre nulla: serve al secondo passo per sapere di chi si tratta,
        // senza rimandare la password in giro.
        // dieci minuti, in MILLISECONDI: `createToken` li vuole cosi'
        challenge: createToken(String(user.id), String(user.email),
                               10 * 60 * 1000, '2fa'),
      }, { status: 200 });
    }

    await azzera(chiaveLimite);
    return NextResponse.json({
      ok: true,
      token: createToken(String(user.id), String(user.email),
                         undefined, 'accesso',
                         Number(user.tokenVersion ?? 1)),
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