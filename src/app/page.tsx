import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/landing';
import { DARK_CSS } from '@/content/darkTheme';
import { getPool } from '@/lib/pg';

export const metadata: Metadata = {
  title: "Lyra — Il workbench quantitativo",
  description: "Dall’idea al live. Se regge, va.",
};

// Il contatore "già in lista d'attesa" riflette le iscrizioni beta reali nel DB
// (tabella beta_signups, popolata dal form). In assenza di DB o in errore si
// mantiene il valore statico della pagina.
export const dynamic = 'force-dynamic';

async function betaCount(): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    await getPool().query(
      `CREATE TABLE IF NOT EXISTS beta_signups (
         id serial PRIMARY KEY, email text UNIQUE NOT NULL,
         profile text, created_at timestamptz NOT NULL DEFAULT now())`,
    );
    const res = await getPool().query('SELECT count(*)::int AS n FROM beta_signups');
    return res.rows?.[0]?.n ?? 0;
  } catch {
    return null;
  }
}

export default async function Page() {
  const n = await betaCount();
  const out = n != null ? html.replace('data-count="500"', `data-count="${n}"`) : html;
  return <StaticPage html={out} css={css + DARK_CSS} />;
}
