import crypto from 'node:crypto';

/**
 * Token PERSONALE dell'utente per l'app desktop.
 *
 * Sostituisce il segreto condiviso: prima ogni copia dell'app portava con sé la
 * stessa chiave, e chi la estraeva poteva interrogare il database di tutti.
 * Qui il token vale per un solo utente, scade, e la chiave che lo firma resta
 * sul server — nel pacchetto distribuito non c'è nulla di riutilizzabile.
 *
 * Formato: <payload base64url>.<firma base64url>, firma HMAC-SHA256.
 */

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TTL = 30 * DAY;

export type AppTokenPayload = {
  uid: string;
  email: string;
  exp: number; // millisecondi epoch
};

function secret(): string {
  // APP_TOKEN_SECRET è la chiave dedicata; in mancanza si riusa quella già
  // presente sul sito, così l'installazione non si blocca.
  const s =
    process.env.APP_TOKEN_SECRET ||
    process.env.DASHBOARD_API_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    '';
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function unb64url(s: string): Buffer {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function isConfigured(): boolean {
  return secret().length >= 16;
}

export function createToken(uid: string, email: string, ttlMs: number = DEFAULT_TTL): string {
  const payload: AppTokenPayload = { uid, email, exp: Date.now() + ttlMs };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

/** Payload se il token è valido e non scaduto, altrimenti null. */
export function verifyToken(token: string | null | undefined): AppTokenPayload | null {
  if (!token || !isConfigured()) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = crypto.createHmac('sha256', secret()).update(body).digest();
  let got: Buffer;
  try {
    got = unb64url(sig);
  } catch {
    return null;
  }
  // confronto a tempo costante: evita di rivelare la firma un byte alla volta
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;

  try {
    const payload = JSON.parse(unb64url(body).toString('utf8')) as AppTokenPayload;
    if (!payload?.uid || !payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Legge il token dall'header Authorization: Bearer … oppure x-app-token. */
export function tokenFromRequest(req: Request): AppTokenPayload | null {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return verifyToken(bearer || req.headers.get('x-app-token'));
}

/** Elenco degli amministratori, definito solo lato server. */
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
