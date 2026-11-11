/**
 * Fatture dell'abbonamento e metodo di pagamento, per la pagina
 * «My subscription» dell'app.
 *
 * Solo LETTURA, e solo dei dati di chi chiama: il cliente Stripe si ricava dal
 * token, mai da un parametro. Un id cliente passato dall'app si potrebbe
 * cambiare a mano e leggere le fatture di un altro.
 *
 * Della carta si restituiscono marca, ultime quattro cifre e scadenza: e' cio'
 * che Stripe stesso mostra nelle ricevute. Il numero completo non arriva mai
 * al sito, quindi non puo' arrivare all'app.
 *
 * Se Stripe non e' configurato o la persona non ha mai pagato nulla, la
 * risposta e' vuota e `available` dice perche': la pagina mostra uno stato
 * vuoto, non un errore.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall, configurato, ErroreStripe } from '@/lib/stripe';
import { piani, TIER_MAX } from '@/lib/abbonamenti';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Carta = { brand: string; last4: string; expMonth: number; expYear: number; expired: boolean };

function carta(pm: any): Carta | null {
  const c = pm?.card;
  if (!c || !c.last4) return null;
  const ora = new Date();
  const scaduta = Number(c.exp_year) < ora.getFullYear()
    || (Number(c.exp_year) === ora.getFullYear() && Number(c.exp_month) < ora.getMonth() + 1);
  return {
    brand: String(c.display_brand || c.brand || 'card'),
    last4: String(c.last4),
    expMonth: Number(c.exp_month) || 0,
    expYear: Number(c.exp_year) || 0,
    expired: scaduta,
  };
}

function iso(sec: any): string | null {
  const n = Number(sec);
  return n > 0 ? new Date(n * 1000).toISOString() : null;
}

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token missing or expired' }, { status: 401 });

  const pool = getPool();
  let customer = '';
  let subId = '';
  try {
    const r = await pool.query(
      'SELECT "stripeCustomerId" AS c, "stripeSubscriptionId" AS s FROM "User" WHERE id = $1',
      [auth.uid]);
    customer = String(r.rows[0]?.c || '');
    subId = String(r.rows[0]?.s || '');
  } catch {
    return NextResponse.json({ ok: true, available: false, reason: 'schema', invoices: [], card: null });
  }

  if (!customer) {
    return NextResponse.json({ ok: true, available: true, reason: 'no_customer', invoices: [], card: null });
  }
  if (!configurato()) {
    return NextResponse.json({ ok: true, available: false, reason: 'not_configured', invoices: [], card: null });
  }

  try {
    const [lista, cli, sub, catalogo] = await Promise.all([
      stripeCall(`/invoices?customer=${encodeURIComponent(customer)}&limit=24`),
      stripeCall(`/customers/${encodeURIComponent(customer)}?expand[]=invoice_settings.default_payment_method`)
        .catch(() => null),
      subId
        ? stripeCall(`/subscriptions/${encodeURIComponent(subId)}?expand[]=default_payment_method`).catch(() => null)
        : Promise.resolve(null),
      piani(pool),
    ]);

    // Il piano di una fattura: dal codice nei metadati, poi dal prodotto, poi
    // dal numero. Il numero da solo sbaglia sulle fatture nate prima del
    // catalogo di novembre 2026, quando Desk era il livello 3.
    const perCodice = new Map(catalogo.map((x) => [x.code, x.tier] as [string, number]));
    const perProdotto = new Map(catalogo.filter((x) => x.stripeProductId)
      .map((x) => [x.stripeProductId, x.tier] as [string, number]));

    // La finestra della prova dell'abbonamento: la fattura da zero emessa
    // quando la prova parte si chiama «Trial», non «Charged».
    const provaDa = Number(sub?.trial_start || 0);
    const provaA = Number(sub?.trial_end || 0);

    // Le bozze non sono fatture: Stripe le tiene aperte un'ora prima di
    // emetterle, e mostrarle farebbe vedere un addebito che ancora non c'e'.
    const invoices = (lista?.data || [])
      .filter((f: any) => f && f.status && f.status !== 'draft')
      .map((f: any) => {
        const riga = f.lines?.data?.[0] || {};
        // Livello e periodo stanno nei metadati dell'abbonamento (scritti dal
        // checkout e da ogni cambio di livello). Le versioni recenti dell'API li
        // mettono sotto `parent.subscription_details`, quelle vecchie sotto
        // `subscription_details`.
        const meta = f.parent?.subscription_details?.metadata
          || f.subscription_details?.metadata || riga.metadata || {};
        const prodotto = String(riga.price?.product || riga.pricing?.price_details?.product || '');
        let tier = perCodice.get(String(meta.code || '')) || perProdotto.get(prodotto) || 0;
        if (!tier) tier = Number(meta.tier);
        const zero = Number(f.total ?? f.amount_due ?? 0) === 0;
        const creata = Number(f.created || 0);
        const diProva = zero && provaA > 0 && creata >= provaDa - 60 && creata < provaA;
        return {
          tier: Number.isInteger(tier) && tier >= 1 && tier <= TIER_MAX ? tier : null,
          period: String(meta.periodo || ''),
          id: String(f.id || ''),
          number: String(f.number || ''),
          created: iso(f.created),
          periodStart: iso(riga.period?.start ?? f.period_start),
          periodEnd: iso(riga.period?.end ?? f.period_end),
          amountCents: Number(f.status === 'paid' ? f.amount_paid : f.amount_due) || 0,
          currency: String(f.currency || 'eur').toUpperCase(),
          status: diProva ? 'trial' : String(f.status || ''),
          description: String(riga.description || f.description || ''),
          hostedInvoiceUrl: String(f.hosted_invoice_url || ''),
          invoicePdf: String(f.invoice_pdf || ''),
        };
      });

    // La carta dell'abbonamento ha la precedenza su quella predefinita del
    // cliente: e' quella che verra' addebitata al rinnovo.
    const card = carta(sub?.default_payment_method)
      || carta(cli?.invoice_settings?.default_payment_method);

    return NextResponse.json({ ok: true, available: true, invoices, card });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ ok: false, available: false, error: String(e?.message || e),
                               invoices: [], card: null }, { status: st >= 400 && st < 600 ? st : 500 });
  }
}
