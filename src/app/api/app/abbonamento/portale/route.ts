/**
 * Il portale di fatturazione di Stripe: disdetta, cambio piano, cambio carta,
 * fatture da scaricare.
 *
 * PERCHE' IL PORTALE E NON PAGINE NOSTRE. Un abbonamento ricorrente deve
 * poter essere disdetto senza chiedere il permesso a nessuno — e' un diritto,
 * non una cortesia. Costruirlo in casa significherebbe riscrivere conguagli,
 * fatture e cambi di metodo di pagamento, cioe' il punto in cui un errore si
 * paga con un addebito sbagliato. Stripe lo fa, lo tiene aggiornato e lo
 * mostra nella lingua del cliente.
 *
 * Un cambio fatto nel portale NON viene scritto da qui: arriva come webhook
 * (`customer.subscription.updated` o `.deleted`) e lo scrive quello. Cosi' il
 * database dice sempre cio' che Stripe sa, anche quando il cambio parte da
 * una email di Stripe invece che dalla nostra applicazione.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall, configurato, baseUrl, ErroreStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token missing or expired' }, { status: 401 });

  // Prima la SITUAZIONE di chi chiede, poi l'ambiente. L'ordine opposto era
  // sbagliato: a chi non ha mai pagato nulla arrivava «i pagamenti non sono
  // configurati», un messaggio di sistema per una persona che non ha fatto
  // niente di storto e che deve solo sapere che non ha nulla da gestire.
  const pool = getPool();
  let customer = '';
  try {
    const r = await pool.query(
      'SELECT "stripeCustomerId" AS c FROM "User" WHERE id = $1', [auth.uid]);
    customer = String(r.rows[0]?.c || '');
  } catch {
    return NextResponse.json({
      error: 'subscriptions are not installed on the site database',
      detail: 'Run marketplace_abbonamenti.sql on the site Postgres.',
    }, { status: 500 });
  }

  if (!customer) {
    // Non e' un errore: e' qualcuno che non ha mai pagato nulla. Dirlo cosi'
    // evita di mandarlo su una pagina vuota di Stripe.
    return NextResponse.json({
      error: 'no billing history',
      detail: 'There is nothing to manage yet: this account has never had a '
            + 'subscription. Pick a plan first.',
      code: 'no_customer',
    }, { status: 404 });
  }

  // C'e' qualcosa da gestire: adesso la configurazione serve davvero.
  if (!configurato()) {
    return NextResponse.json({
      error: 'payments are not configured on the site',
      detail: 'STRIPE_SECRET_KEY is missing from the site environment.',
    }, { status: 503 });
  }

  try {
    const sess = await stripeCall('/billing_portal/sessions', {
      customer,
      return_url: `${baseUrl(req)}/pricing?from=portal`,
    });
    return NextResponse.json({ ok: true, url: sess.url });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    const testo = String(e?.message || e);
    // Il portale va configurato una volta per ambiente sul pannello Stripe, e
    // sandbox e produzione sono separati: l'errore che Stripe restituisce in
    // quel caso non dice dove andare, questo si'.
    if (/configuration|portal/i.test(testo)) {
      return NextResponse.json({
        error: 'the Stripe billing portal is not configured yet',
        detail: 'Open dashboard.stripe.com/settings/billing/portal and save '
              + 'the configuration once, in THIS environment (live and '
              + 'sandbox are separate). Stripe said: ' + testo,
      }, { status: 503 });
    }
    return NextResponse.json({ error: testo }, { status: st });
  }
}
