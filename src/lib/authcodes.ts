/**
 * Codici temporanei: secondo fattore via email, conferma di un nuovo
 * indirizzo, e in generale ogni verifica "ti mando un numero, rimandamelo".
 *
 * Tre regole, tutte per lo stesso motivo — un codice a sei cifre è debole di
 * suo, e va reso inutile in fretta:
 *
 *  1. si conserva solo l'IMPRONTA, mai il codice. Chi legge il database non
 *     può usarlo;
 *  2. scade in pochi minuti;
 *  3. i tentativi sono contati, e dopo alcuni il codice muore. Senza questo,
 *     un milione di prove trova sempre un numero di sei cifre.
 */
import crypto from 'crypto';
import { getPool } from '@/lib/pg';

const MAX_TENTATIVI = 5;

function impronta(codice: string, userId: string): string {
  // l'utente entra nell'impronta: due utenti con lo stesso codice non
  // producono la stessa riga, e un codice rubato altrove non vale qui
  return crypto.createHash('sha256')
    .update(`${userId}:${codice}`).digest('hex');
}

export function nuovoCodice(): string {
  // randomInt è crittograficamente sicuro: Math.random() non lo è, e un
  // codice prevedibile non protegge niente
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function creaCodice(
  userId: string, scope: string, minuti = 10, payload: any = null,
): Promise<string> {
  const pool = getPool();
  // i codici precedenti dello stesso tipo non servono piu': tenerli in vita
  // significherebbe accettarne piu' d'uno alla volta
  await pool.query(
    'DELETE FROM "AuthCode" WHERE "userId" = $1 AND scope = $2',
    [userId, scope]);

  const codice = nuovoCodice();
  await pool.query(
    `INSERT INTO "AuthCode"(id, "userId", scope, "codeHash", payload, "expiresAt")
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' minutes')::interval)`,
    [crypto.randomUUID(), userId, scope, impronta(codice, userId),
     payload ? JSON.stringify(payload) : null, String(minuti)]);
  return codice;
}

export async function verificaCodice(
  userId: string, scope: string, codice: string,
): Promise<{ ok: true; payload: any } | { ok: false; motivo: string }> {
  const pool = getPool();
  const r = await pool.query(
    `SELECT id, "codeHash", payload, attempts
       FROM "AuthCode"
      WHERE "userId" = $1 AND scope = $2 AND "usedAt" IS NULL
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC LIMIT 1`, [userId, scope]);
  const riga = r.rows[0];
  if (!riga) return { ok: false, motivo: 'codice scaduto o mai richiesto' };

  if (Number(riga.attempts) >= MAX_TENTATIVI) {
    await pool.query('DELETE FROM "AuthCode" WHERE id = $1', [riga.id]);
    return { ok: false, motivo: 'troppi tentativi: richiedine uno nuovo' };
  }

  const atteso = Buffer.from(String(riga.codeHash), 'utf8');
  const dato = Buffer.from(impronta(String(codice || ''), userId), 'utf8');
  const uguale = atteso.length === dato.length
              && crypto.timingSafeEqual(atteso, dato);

  if (!uguale) {
    await pool.query(
      'UPDATE "AuthCode" SET attempts = attempts + 1 WHERE id = $1', [riga.id]);
    return { ok: false, motivo: 'invalid code' };
  }

  // usato una volta e basta: un codice riutilizzabile e' un codice permanente
  await pool.query('UPDATE "AuthCode" SET "usedAt" = NOW() WHERE id = $1',
                   [riga.id]);
  return { ok: true, payload: riga.payload || null };
}
