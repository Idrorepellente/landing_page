/**
 * Sicurezza dell'account: password, indirizzo email, verifica in due passaggi.
 *
 * Tutte le operazioni qui dentro richiedono un token valido E, dove ha senso,
 * la password attuale. Il motivo: una sessione aperta su un computer lasciato
 * incustodito non deve bastare a prendere possesso dell'account. Cambiare
 * password o indirizzo senza riconfermare chi sei renderebbe la sessione una
 * chiave permanente.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { inviaEmail, postaConfigurata } from '@/lib/mailer';
import { creaCodice, verificaCodice } from '@/lib/authcodes';
import { nuovoSegreto, verifica as verificaTotp, urlOtpauth } from '@/lib/totp';
import { cifra, decifra, cifraturaAttiva } from '@/lib/segreti';

export const runtime = 'nodejs';

// Deve combaciare con MIN_PASSWORD di dashboard/auth.py e con quella in
// dashboard/static/js/security.js. Era 10 mentre la registrazione ne
// ammetteva 6: chi si iscriveva con sette caratteri non poteva piu'
// cambiare password, e il messaggio non diceva perche'.
const MIN_PASSWORD = 8;

async function utente(uid: string) {
  const r = await getPool().query(
    `SELECT id, email, "passwordHash", "twoFactorMode"::text AS "twoFactorMode",
            "twoFactorSecret", "googleSub"
       FROM "User" WHERE id = $1 LIMIT 1`, [uid]);
  return r.rows[0] || null;
}

/** La password attuale, quando serve riconfermare l'identità. */
async function passwordCorretta(u: any, password: string): Promise<boolean> {
  // Chi è entrato con Google non ha una password da confermare: per lui la
  // riprova d'identità è già avvenuta presso Google.
  if (!u?.passwordHash || u.passwordHash.startsWith('$google$')) return true;
  return bcrypt.compare(String(password || ''), String(u.passwordHash));
}

/* ─────────────────────────── stato ─────────────────────────── */

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  const u = await utente(auth.uid);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    email: u.email,
    twoFactor: u.twoFactorMode || 'none',
    conGoogle: !!u.googleSub,
    // se la posta non è configurata, il secondo fattore via email non è
    // proponibile: meglio dirlo che offrire una scelta che non funziona
    emailDisponibile: postaConfigurata(),
  });
}

/* ─────────────────────────── azioni ─────────────────────────── */

export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });

  let b: any = {};
  try { b = await req.json(); } catch { /* corpo facoltativo */ }
  const azione = String(b?.action || '');
  const pool = getPool();
  const u = await utente(auth.uid);
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  try {
    // ---- cambio password ------------------------------------------------
    // Disconnessione da tutti i dispositivi, su richiesta. Serve quando si
    // sospetta un accesso altrui ma non si vuole cambiare la password.
    if (azione === 'disconnetti_tutto') {
      await pool.query(
        'UPDATE "User" SET "tokenVersion" = COALESCE("tokenVersion",1) + 1 '
        + 'WHERE id = $1', [u.id]);
      return NextResponse.json({
        ok: true,
        nota: 'All sessions have been signed out: sign in again with your '
            + 'credenziali.',
      });
    }

    if (azione === 'password') {
      const nuova = String(b?.newPassword || '');
      if (nuova.length < MIN_PASSWORD) {
        return NextResponse.json({
          error: `the new password must be at least ${MIN_PASSWORD} characters long`,
        }, { status: 400 });
      }
      if (!(await passwordCorretta(u, b?.currentPassword))) {
        return NextResponse.json({ error: 'current password is wrong' }, { status: 403 });
      }
      const hash = await bcrypt.hash(nuova, 12);
      // Cambiare la password INVALIDA tutti i token: e' il gesto che si compie
      // quando si teme che qualcuno sia entrato, e finora non chiudeva fuori
      // nessuno — chi aveva un token rubato continuava ad accedere per
      // trenta giorni.
      await pool.query(
        'UPDATE "User" SET "tokenVersion" = COALESCE("tokenVersion",1) + 1 '
        + 'WHERE id = $1', [u.id]).catch(() => {});
      await pool.query('UPDATE "User" SET "passwordHash" = $2 WHERE id = $1',
                       [u.id, hash]);
      return NextResponse.json({ ok: true });
    }

    // ---- cambio email: passo 1, si manda il codice al NUOVO indirizzo ----
    if (azione === 'email_start') {
      const nuova = String(b?.newEmail || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nuova)) {
        return NextResponse.json({ error: 'invalid address' }, { status: 400 });
      }
      if (!(await passwordCorretta(u, b?.currentPassword))) {
        return NextResponse.json({ error: 'current password is wrong' }, { status: 403 });
      }
      const gia = await pool.query(
        'SELECT id FROM "User" WHERE lower(email) = $1 AND id <> $2 LIMIT 1',
        [nuova, u.id]);
      if (gia.rows[0]) {
        return NextResponse.json({ error: 'address already in use' }, { status: 409 });
      }
      if (!postaConfigurata()) {
        return NextResponse.json({
          error: 'mail is not configured on the site: cannot confirm',
        }, { status: 503 });
      }
      // Il codice va al NUOVO indirizzo, non al vecchio: serve a dimostrare
      // che quella casella esiste e che è tua. Un errore di battitura viene
      // scoperto qui, non dopo aver perso l'accesso.
      const codice = await creaCodice(u.id, 'email_change', 15, { email: nuova });
      await inviaEmail(nuova, 'Confirm your new address',
        `Your code to confirm this address on Lyra is ${codice}.\n`
        + 'It expires in 15 minutes. If you did not ask for the change, ignore '
        + 'this message: your current address stays as it is.');
      return NextResponse.json({ ok: true, sent: true });
    }

    // ---- cambio email: passo 2, si conferma -----------------------------
    if (azione === 'email_confirm') {
      const esito = await verificaCodice(u.id, 'email_change', String(b?.code || ''));
      if (!esito.ok) {
        return NextResponse.json({ error: esito.motivo }, { status: 403 });
      }
      const nuova = String((esito as any).payload?.email || '');
      if (!nuova) {
        return NextResponse.json({ error: 'request no longer valid' }, { status: 409 });
      }
      await pool.query(
        'UPDATE "User" SET email = $2, "emailVerified" = NOW() WHERE id = $1',
        [u.id, nuova]);
      // avviso al vecchio indirizzo: se il cambio non l'hai chiesto tu, e'
      // l'unico modo per accorgertene
      await inviaEmail(u.email, 'Your Lyra address has changed',
        `The account address has been changed to ${nuova}.\n`
        + 'If this was not you, contact support right away.');
      return NextResponse.json({ ok: true, email: nuova });
    }

    // ---- secondo fattore: preparazione ----------------------------------
    if (azione === '2fa_setup') {
      const modo = b?.mode === 'email' ? 'email' : 'totp';
      if (modo === 'email') {
        if (!postaConfigurata()) {
          return NextResponse.json({
            error: 'mail is not configured on the site',
          }, { status: 503 });
        }
        const codice = await creaCodice(u.id, 'login_2fa', 10);
        await inviaEmail(u.email, 'Lyra verification code',
          `Your code is ${codice}. It expires in 10 minutes.`);
        return NextResponse.json({ ok: true, mode: 'email', sent: true });
      }
      // Il segreto si conserva SUBITO ma la modalità resta 'none' finché
      // l'utente non dimostra di saperlo usare: attivarla prima lo
      // chiuderebbe fuori se l'app non fosse configurata bene.
      const segreto = nuovoSegreto();
      // Nel DATABASE va cifrato; all'utente si manda in chiaro, perche' deve
      // poterlo inquadrare col telefono. Se la chiave non e' configurata si
      // salva com'era: meglio un 2FA in chiaro che un 2FA che non si attiva.
      await pool.query('UPDATE "User" SET "twoFactorSecret" = $2 WHERE id = $1',
                       [u.id, cifraturaAttiva() ? cifra(segreto) : segreto]);
      return NextResponse.json({
        ok: true, mode: 'totp', secret: segreto,
        otpauth: urlOtpauth(segreto, u.email),
      });
    }

    // ---- secondo fattore: attivazione -----------------------------------
    if (azione === '2fa_enable') {
      const modo = b?.mode === 'email' ? 'email' : 'totp';
      const codice = String(b?.code || '');
      let valido = false;
      if (modo === 'totp') {
        valido = verificaTotp(decifra(String(u.twoFactorSecret || '')), codice);
      } else {
        valido = (await verificaCodice(u.id, 'login_2fa', codice)).ok;
      }
      if (!valido) {
        return NextResponse.json({ error: 'invalid code' }, { status: 403 });
      }
      await pool.query(
        `UPDATE "User" SET "twoFactorMode" = $2::two_factor_mode,
                           "twoFactorSince" = NOW() WHERE id = $1`,
        [u.id, modo]);
      await inviaEmail(u.email, 'Verifica in due passaggi attivata',
        'Two-step verification is now on for your Lyra account.\n'
        + 'If this was not you, contact support right away.');
      return NextResponse.json({ ok: true, twoFactor: modo });
    }

    // ---- secondo fattore: disattivazione --------------------------------
    if (azione === '2fa_disable') {
      // Serve la password: disattivare la protezione è esattamente
      // l'operazione che un intruso proverebbe per prima.
      if (!(await passwordCorretta(u, b?.currentPassword))) {
        return NextResponse.json({ error: 'current password is wrong' }, { status: 403 });
      }
      const conto = await pool.query(
        'SELECT 1 FROM "SellerAccount" WHERE "userId" = $1 LIMIT 1', [u.id]);
      if (conto.rows[0]) {
        return NextResponse.json({
          error: 'you cannot turn it off while an account is linked',
          detail: 'Two-step verification protects the account that '
                + 'receives the earnings. Unlink the payout account first, '
                + 'from Profile \u2192 Marketplace earnings; then you can '
                + 'turn this off.',
        }, { status: 409 });
      }
      await pool.query(
        `UPDATE "User" SET "twoFactorMode" = 'none'::two_factor_mode,
                           "twoFactorSecret" = NULL, "twoFactorSince" = NULL
          WHERE id = $1`, [u.id]);
      await inviaEmail(u.email, 'Verifica in due passaggi disattivata',
        'Two-step verification has been turned off for your Lyra account.\n'
        + 'If this was not you, contact support right away.');
      return NextResponse.json({ ok: true, twoFactor: 'none' });
    }

    return NextResponse.json({ error: 'azione sconosciuta' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
