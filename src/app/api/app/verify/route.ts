import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { getPool } from '@/lib/pg';
import { createToken, isConfigured } from '@/lib/appToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Registrazione e recupero password dell'app desktop.
 *
 * Sono i due flussi che avvengono PRIMA di avere un token, quindi non possono
 * passare dal canale dati normale. Qui vivono per intero sul sito:
 *
 *   POST { action: "request", purpose: "register"|"reset", email, username? }
 *        genera un codice, lo salva e lo manda per email
 *   POST { action: "confirm", purpose, email, code, password, username?, displayName? }
 *        verifica il codice e completa: crea l'account o cambia la password
 *
 * Perché qui e non nell'app:
 *  - le credenziali della casella restano sul server;
 *  - l'app non deve conoscere alcun segreto condiviso;
 *  - il codice non transita mai dal client che lo dovrà digitare.
 *
 * Contro gli abusi: il codice è conservato come impronta, scade, ha un numero
 * massimo di tentativi, e l'invio è limitato nel tempo per indirizzo. Le
 * risposte non rivelano se un indirizzo è registrato.
 */

const CODE_TTL_MIN = 20;
const MAX_ATTEMPTS = 5;
const RESEND_WAIT_S = 60;

const REGISTER_SMTP_HOST = 'authsmtp.securemail.pro';
const REGISTER_SMTP_PORT = 465;

async function ensureTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS app_email_codes (
      email      TEXT NOT NULL,
      purpose    TEXT NOT NULL,
      code_hash  TEXT NOT NULL,
      payload    JSONB,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts   INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (email, purpose)
    )`);
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

async function sendMail(to: string, subject: string, text: string, html: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS are not configured on the site');

  const host = process.env.SMTP_HOST || REGISTER_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || (host === REGISTER_SMTP_HOST ? REGISTER_SMTP_PORT : 587);
  const transport = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `Lyra <${user}>`,
    to, subject, text, html,
  });
}

function mailBody(purpose: string, code: string) {
  const what = purpose === 'reset' ? 'reset your password' : 'confirm your address';
  const subject = purpose === 'reset' ? 'Lyra · password code' : 'Lyra · confirmation code';
  const text =
    `Il tuo codice per ${what} e': ${code}\n\n` +
    `It expires in ${CODE_TTL_MIN} minutes. If you did not ask for anything, ignore this message.`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b">` +
    `<p style="margin:0 0 14px">Your code to ${what}:</p>` +
    `<p style="margin:0 0 14px;font:700 30px ui-monospace,monospace;letter-spacing:.22em;color:#1800ac">${code}</p>` +
    `<p style="margin:0;color:#6b7280;font-size:13px">It expires in ${CODE_TTL_MIN} minutes. ` +
    `If you did not ask for anything, you can ignore this message.</p></div>`;
  return { subject, text, html };
}

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'APP_TOKEN_SECRET is not set on the site' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const action = String(body?.action || '');
  const purpose = String(body?.purpose || '');
  const email = String(body?.email || '').trim().toLowerCase();
  if (!['register', 'reset'].includes(purpose) || !email) {
    return NextResponse.json({ error: 'invalid parameters' }, { status: 400 });
  }

  const pool = getPool();
  try {
    await ensureTable();

    // ------------------------------------------------------------- richiesta
    if (action === 'request') {
      const username = String(body?.username || '').trim();

      const exists = await pool.query(
        'SELECT id FROM "User" WHERE lower(email) = $1 LIMIT 1', [email]);

      if (purpose === 'register') {
        if (exists.rows.length) {
          return NextResponse.json({ error: 'That email is already registered.' }, { status: 409 });
        }
        if (username) {
          const dupU = await pool.query(
            'SELECT id FROM "User" WHERE lower(username) = $1 LIMIT 1', [username.toLowerCase()]);
          if (dupU.rows.length) {
            return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
          }
        }
      }

      // Attesa fra due invii: evita che l'endpoint diventi un inoltro di posta.
      const recent = await pool.query(
        `SELECT created_at FROM app_email_codes
          WHERE email = $1 AND purpose = $2
            AND created_at > now() - ($3 || ' seconds')::interval LIMIT 1`,
        [email, purpose, String(RESEND_WAIT_S)]);
      if (recent.rows.length) {
        return NextResponse.json(
          { error: `Wait ${RESEND_WAIT_S} seconds before asking for another code.` },
          { status: 429 });
      }

      // Per il recupero: se l'indirizzo non esiste si risponde comunque "ok",
      // senza inviare nulla. Altrimenti si potrebbe scoprire chi è registrato.
      if (purpose === 'reset' && !exists.rows.length) {
        return NextResponse.json({ ok: true, sent: true });
      }

      const code = newCode();
      await pool.query(
        `INSERT INTO app_email_codes(email, purpose, code_hash, payload, expires_at, attempts, created_at)
         VALUES ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval, 0, now())
         ON CONFLICT (email, purpose) DO UPDATE
           SET code_hash = EXCLUDED.code_hash, payload = EXCLUDED.payload,
               expires_at = EXCLUDED.expires_at, attempts = 0, created_at = now()`,
        [email, purpose, sha(code),
         JSON.stringify({ username, displayName: String(body?.displayName || '') }),
         String(CODE_TTL_MIN)]);

      const m = mailBody(purpose, code);
      await sendMail(email, m.subject, m.text, m.html);
      return NextResponse.json({ ok: true, sent: true, ttlMinutes: CODE_TTL_MIN });
    }

    // -------------------------------------------------------------- conferma
    if (action === 'confirm') {
      const code = String(body?.code || '').trim();
      const password = String(body?.password || '');
      if (!code || password.length < 8) {
        return NextResponse.json(
          { error: 'Code missing, or password too short (at least 8 characters).' },
          { status: 400 });
      }

      const r = await pool.query(
        'SELECT code_hash, payload, expires_at, attempts FROM app_email_codes WHERE email = $1 AND purpose = $2',
        [email, purpose]);
      const row = r.rows[0];
      if (!row) {
        return NextResponse.json({ error: 'No request in progress: ask for a new code.' }, { status: 400 });
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await pool.query('DELETE FROM app_email_codes WHERE email = $1 AND purpose = $2', [email, purpose]);
        return NextResponse.json({ error: 'Code expired: ask for a new one.' }, { status: 400 });
      }
      if (row.attempts >= MAX_ATTEMPTS) {
        await pool.query('DELETE FROM app_email_codes WHERE email = $1 AND purpose = $2', [email, purpose]);
        return NextResponse.json({ error: 'Too many attempts: ask for a new code.' }, { status: 429 });
      }
      if (sha(code) !== row.code_hash) {
        await pool.query(
          'UPDATE app_email_codes SET attempts = attempts + 1 WHERE email = $1 AND purpose = $2',
          [email, purpose]);
        return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
      }

      const hash = await bcrypt.hash(password, 12);
      let uid: string;
      let profile: { username: string | null; displayName: string | null } =
        { username: null, displayName: null };

      if (purpose === 'register') {
        const dup = await pool.query('SELECT id FROM "User" WHERE lower(email) = $1 LIMIT 1', [email]);
        if (dup.rows.length) {
          return NextResponse.json({ error: 'That email is already registered.' }, { status: 409 });
        }
        const p = row.payload || {};
        const username = String(p.username || '').trim() || email.split('@')[0];
        const displayName = String(p.displayName || '').trim() || username;
        uid = cuid();
        profile = { username, displayName };
        await pool.query(
          'INSERT INTO "User"(id, email, username, "passwordHash", "displayName", "createdAt") VALUES ($1,$2,$3,$4,$5, now())',
          [uid, email, username, hash, displayName]);
      } else {
        const u = await pool.query(
          'SELECT id, username, "displayName" FROM "User" WHERE lower(email) = $1 LIMIT 1', [email]);
        if (!u.rows.length) {
          return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        uid = String(u.rows[0].id);
        profile = { username: u.rows[0].username ?? null, displayName: u.rows[0].displayName ?? null };
        await pool.query('UPDATE "User" SET "passwordHash" = $1 WHERE id = $2', [hash, uid]);
      }

      await pool.query('DELETE FROM app_email_codes WHERE email = $1 AND purpose = $2', [email, purpose]);
      // profilo completo: chi riceve la risposta deve poter mostrare il nome
      // dell'utente, non ripiegare sull'indirizzo email
      return NextResponse.json({
        ok: true,
        token: createToken(uid, email),
        user: { id: uid, email, ...profile },
      });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
