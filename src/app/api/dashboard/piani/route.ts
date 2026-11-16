/**
 * I quattro piani a pagamento, per il pannello di amministrazione dell'app.
 *
 * SOLO LETTURA. I piani si decidono in lib/catalogo.ts, lo stesso file da cui
 * la pagina Prezzi del sito prende i numeri, e il sito allinea il database da
 * solo (lib/allineaCatalogo.ts). Prima i prezzi si ritoccavano anche da qui:
 * un prezzo cambiato nel pannello cambiava l'app e il checkout ma non la
 * pagina del sito, che è statica e piena di frasi che dipendono dai prezzi
 * («10 mesi su 12», «tre volte il Pro»). Era la seconda strada per cui l'app
 * e il sito finivano per mostrare piani diversi. Per cambiare un prezzo si
 * cambia il catalogo e si pubblica il sito: pagina, database, app e checkout
 * cambiano insieme.
 *
 * Gli abbonamenti già in corso non cambiano con il catalogo: Stripe continua a
 * fatturare la cifra pattuita con ciascun cliente, e il prezzo nuovo vale per
 * chi si abbona (o cambia livello) dopo il rilascio.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { piani, PERIODI } from '@/lib/abbonamenti';
import { assicuraCatalogo } from '@/lib/allineaCatalogo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pool = getPool();
  const lista = await piani(pool);
  const catalogo = await assicuraCatalogo(pool);

  // Quanti abbonati per livello: serve a sapere chi paga cosa.
  const conteggi: Record<string, number> = {};
  try {
    const r = await pool.query(
      `SELECT "subscriptionTier"::int AS tier, COUNT(*)::int AS n
         FROM "User"
        WHERE "subscriptionStatus" = 'subscribed'
          AND ("subscriptionUntil" IS NULL OR "subscriptionUntil" > NOW())
        GROUP BY 1`);
    for (const x of r.rows) conteggi[String(x.tier)] = Number(x.n || 0);
  } catch { /* schema non installato */ }

  return NextResponse.json({
    ok: true,
    piani: lista,
    abbonatiPerLivello: conteggi,
    schemaMancante: lista.length === 0 || undefined,
    periodi: PERIODI,
    // Da dove vengono i piani e se il database li ha giusti: il pannello lo
    // mostra, e con un errore dice perché il sito non è riuscito a scriverli.
    catalogo: { ...catalogo, file: 'src/lib/catalogo.ts' },
    modificabili: false,
  });
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    error: 'prices are set in the site catalog',
    detail: 'Plans and prices come from src/lib/catalogo.ts in the site '
          + 'project, the same file the Pricing page takes its numbers from. '
          + 'Change them there and publish the site: the Pricing page, the '
          + 'database, the app and the checkout change together.',
  }, { status: 410 });
}
