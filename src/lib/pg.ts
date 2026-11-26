import { Pool } from 'pg';

// Pool Postgres condiviso (usa DATABASE_URL + PGSSLMODE del sito su Vercel).
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const mode = (process.env.PGSSLMODE || '').toLowerCase();
    const ssl = mode === 'disable' ? false : { rejectUnauthorized: false };
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: ssl as any,
      max: 3,
    });
  }
  return pool;
}
