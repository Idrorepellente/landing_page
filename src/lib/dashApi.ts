import type { NextRequest } from 'next/server';

// La dashboard si autentica all'API con un segreto condiviso (header
// x-dashboard-secret) verificato contro DASHBOARD_API_SECRET.
export function checkSecret(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_API_SECRET || '';
  const got = req.headers.get('x-dashboard-secret') || '';
  return secret.length > 0 && got === secret;
}

// Converte i placeholder stile psycopg (%s) in placeholder node-postgres ($1,$2...).
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/%s/g, () => '$' + (++i));
}
