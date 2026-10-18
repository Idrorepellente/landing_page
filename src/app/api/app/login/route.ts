import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured, verifyToken } from '@/lib/appToken';
import { consentito, azzera, messaggioLimite } from '@/lib/limiti';
import { verifica as verificaTotp } from '@/lib/totp';
import { creaCodice, verificaCodice } from '@/lib/authcodes';
import { inviaEmail, postaConfigurata } from '@/lib/mailer';
import {
  betaAttiva, ammessoInBeta, BETA_NON_AMMESSO, BETA_SENZA_PASSWORD,
} from '@/lib/beta';

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
    // di risposta direbbero quali indirizzi sono registrati. Il confronto si
    // fa SEMPRE, anche quando si sa già che non c'è nessun utente.
    const hash = user?.passwordHash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu';
    const ok = await bcrypt.compare(password, hash);

    // ---- ACCESSO RISERVATO DURANTE LA BETA -------------------------------
    // Con la beta attiva gli unici indirizzi che possono entrare sono quelli
    // ammessi: iscritti dal sito, invitati dal pannello, amministratori.
    //
    // DUE CASI DIVERSI, e qui sta il punto di tutta questa parte:
    //
    //   nessun account + indirizzo AMMESSO
    //     È il primo accesso di chi si è iscritto alla beta. Non ha una
    //     password perché non ha un account: ha solo lasciato un indirizzo sul
    //     form. Rispondere «credenziali non valide» lo lascia davanti a un
    //     muro, convinto di aver sbagliato a digitare — e il percorso
    //     previsto, «dimentica password», non lo trova nessuno da solo.
    //     Quindi si dice dove andare.
    //
    //   indirizzo NON ammesso
    //     Rifiutato, con l'indicazione di iscriversi alla beta.
    //
    // L'ORDINE conta. Per un account che ESISTE il controllo della beta viene
    // DOPO la verifica della password: altrimenti provando indirizzi a uno a
    // uno si scoprirebbe chi è invitato senza conoscerne la password. Per un
    // account che non esiste non c'è nessuna password da verificare, quindi la
    // distinzione si può fare subito; e ciò che si rivela — «questo indirizzo
    // è nella lista e non ha ancora una password» — non è sfruttabile, perché
    // per impostarla serve leggere il codice spedito a quella casella.
    //
    // Quando la beta è spenta `betaAttiva` risponde subito false e non si
    // legge nemmeno una lista: nessun costo, e l'accesso resta quello di
    // sempre.
    const beta = await betaAttiva(getPool());

    // Ramo A — l'account NON esiste. Non c'è nessuna password da verificare,
    // quindi il motivo si può dire subito. È il ramo che fa funzionare il
    // primo accesso di chi si è iscritto alla beta.
    if (!user) {
      if (beta) {
        return NextResponse.json(
          (await ammessoInBeta(getPool(), email))
            ? BETA_SENZA_PASSWORD : BETA_NON_AMMESSO,
          { status: 403 });
      }
      return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
    }

    // Ramo B — l'account esiste. Qui la password si verifica PRIMA della
    // beta, e l'ordine non è un dettaglio: invertirlo trasformerebbe questo
    // endpoint in un modo per scoprire chi è ammesso provando indirizzi a uno
    // a uno con una password qualsiasi.
    if (!ok) {
      return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
    }
    if (beta && !(await ammessoInBeta(getPool(), String(user.email)))) {
      return NextResponse.json(BETA_NON_AMMESSO, { status: 403 });
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
            error: 'two-step verification by email is on, but mail is not '
                 + 'e\' configured on the site: contact support',
          }, { status: 503 });
        }
        const codice = await creaCodice(String(user.id), 'login_2fa', 10);
        await inviaEmail(String(user.email), 'Lyra sign-in code',
          `Your sign-in code is ${codice}. It expires in 10 minutes.\n`
          + 'If you are not signing in, somebody knows your password: '
          + 'change it as soon as you can.');
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