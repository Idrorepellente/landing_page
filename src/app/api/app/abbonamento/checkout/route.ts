/**
 * Avvio dell'abbonamento: una sessione di pagamento RICORRENTE.
 *
 * Differenze dall'acquisto di un artefatto, tutte e tre importanti:
 *
 *   1. `mode: 'subscription'` invece di `payment`: Stripe tiene il metodo di
 *      pagamento e rinnova da se'. Senza questo, ogni mese qualcuno dovrebbe
 *      ricordarsi di pagare, e un abbonamento che si dimentica non e' un
 *      abbonamento;
 *   2. NESSUN Connect. L'abbonamento lo incassa la piattaforma, perche' e' la
 *      piattaforma a dare il servizio. Negli artefatti il denaro si divide
 *      alla fonte perche' li' vende l'autore;
 *   3. il prezzo arriva da `price_data`, costruito al volo dalla riga di
 *      "SubscriptionPlan". Non ci sono Product/Price creati sul pannello
 *      Stripe, e non per pigrizia: cosi' un prezzo e' scritto in UN SOLO
 *      POSTO. Due posti divergono sempre, e qui divergere significa
 *      addebitare una cifra diversa da quella mostrata.
 *
 * Qui NON si concede nulla. Il livello lo scrive il webhook, quando Stripe
 * conferma l'incasso: fidarsi del ritorno del browser vorrebbe dire regalare
 * l'abbonamento a chiunque sappia costruire un URL.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest, isAdminCompleto } from '@/lib/appToken';
import { stripeCall, configurato, baseUrl, ErroreStripe } from '@/lib/stripe';
import { marketplaceBloccato } from '@/lib/impostazioni';
import {
  piano, periodoValido, prezzoCents, intervalloStripe, statoAbbonamento,
  prodottoStripe,
} from '@/lib/abbonamenti';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    return await gestisci(req);
  } catch (e: any) {
    const testo = String(e?.message || e);
    if (/column|relation|does not exist|violates|constraint/i.test(testo)) {
      return NextResponse.json({
        error: 'The site database is not ready for subscriptions.',
        detail: testo + '. Run marketplace_abbonamenti.sql on the site Postgres.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: testo }, { status: 500 });
  }
}

async function gestisci(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token missing or expired' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const tier = Number(body?.tier);
  const periodo = periodoValido(body?.periodo || body?.period);
  if (!periodo) {
    return NextResponse.json(
      { error: 'periodo must be "monthly" or "annual"' }, { status: 400 });
  }

  const pool = getPool();
  const admin = await isAdminCompleto(auth.email, pool);

  // ── A MARKETPLACE CHIUSO NON SI VENDONO ABBONAMENTI ──────────────────
  // L'abbonamento serve a UNA cosa: caricare sul marketplace. Finche' il
  // marketplace e' chiuso quella cosa non si puo' fare, quindi incassare
  // sarebbe vendere un servizio che non si eroga — e in ambiente LIVE
  // sarebbe denaro vero da rimborsare.
  //
  // L'amministratore passa, e serve: e' l'unico modo di provare il circuito
  // di pagamento per davvero prima di aprire, con la propria carta e sul
  // proprio conto, invece di scoprire all'apertura se funziona.
  if (!admin && (await marketplaceBloccato(pool))) {
    return NextResponse.json({
      error: 'subscriptions are not open yet',
      detail: 'A subscription buys one thing: publishing on the marketplace. '
            + 'The marketplace is closed during the beta, so there is nothing '
            + 'to subscribe for yet. Nothing is charged.',
      code: 'locked',
    }, { status: 403 });
  }

  // Prima si valida la RICHIESTA, poi l'ambiente. L'ordine opposto era
  // sbagliato e si vedeva: chi chiedeva un livello inesistente si sentiva
  // rispondere «i pagamenti non sono configurati», cioe' un problema del
  // server per un errore suo, e andava a cercare dalla parte opposta.
  const p = await piano(tier, pool);
  if (!p) {
    return NextResponse.json({
      error: 'unknown plan',
      detail: 'tier must be 1, 2 or 3, and the plan must be active. If the '
            + 'plans table is empty, run marketplace_abbonamenti.sql.',
    }, { status: 400 });
  }
  const importo = prezzoCents(p, periodo);
  if (importo <= 0) {
    return NextResponse.json({
      error: 'this plan has no price for that period',
      detail: `${p.name}: ${periodo} is set to zero. Set it from the admin panel.`,
    }, { status: 409 });
  }

  // ── GIA' ABBONATO: si CAMBIA, non si ricompra ────────────────────────
  // Un secondo checkout creerebbe un SECONDO abbonamento su Stripe: due
  // addebiti per la stessa cosa, e il webhook scriverebbe il livello
  // dell'ultimo arrivato. Quindi il passaggio da un livello all'altro (o da
  // mensile ad annuale) modifica l'abbonamento esistente, con il conguaglio
  // del periodo gia' pagato calcolato da Stripe. Disdire e riabbonarsi
  // butterebbe i giorni rimasti.
  const st = await statoAbbonamento(auth.uid, pool);
  if (st.attivo) {
    if (st.tier === p.tier && st.periodo === periodo) {
      return NextResponse.json({
        ok: false, giaAbbonato: true, tier: st.tier,
        error: 'this is already your plan',
        detail: 'Nothing to change. Use "Manage subscription" to update the '
              + 'payment method, download invoices or cancel.',
      }, { status: 409 });
    }
    return await cambiaLivello(pool, auth.uid, p, periodo, st.tier);
  }

  // Qui la richiesta e' valida e si sta per parlare con Stripe: e' il punto
  // in cui la configurazione serve davvero.
  if (!configurato()) {
    return NextResponse.json({
      error: 'payments are not configured on the site',
      detail: 'STRIPE_SECRET_KEY is missing from the site environment.',
    }, { status: 503 });
  }

  // ── il cliente su Stripe ─────────────────────────────────────────────
  // Si riusa quello che c'e'. Crearne uno nuovo a ogni tentativo lascerebbe
  // dietro clienti doppi, e un rinnovo arriverebbe con un id che non
  // corrisponde a nessun utente.
  let customer = '';
  try {
    const r = await pool.query(
      'SELECT "stripeCustomerId" AS c FROM "User" WHERE id = $1', [auth.uid]);
    customer = String(r.rows[0]?.c || '');
  } catch { /* colonna assente: si crea */ }

  if (!customer) {
    const cli = await stripeCall('/customers', {
      email: auth.email || undefined,
      metadata: { uid: auth.uid },
    }, { idempotencyKey: 'cust:' + auth.uid });
    customer = String(cli.id || '');
    if (customer) {
      await pool.query(
        'UPDATE "User" SET "stripeCustomerId" = $2 WHERE id = $1',
        [auth.uid, customer]).catch(() => {});
    }
  }

  const base = baseUrl(req);
  const valuta = String(p.currency || 'EUR').toLowerCase();
  // Il prodotto su Stripe serve anche qui, non solo nei cambi di livello: con
  // lo stesso prodotto su entrambe le strade, le fatture di chi si abbona e
  // di chi passa di livello mostrano la stessa voce.
  const prodotto = await prodottoStripe(p, pool);

  // La chiave di idempotenza include livello, periodo e MINUTO: ritentare lo
  // stesso bottone non apre due sessioni, ma riprovare dopo aver annullato
  // non resta bloccato sulla sessione vecchia.
  const minuto = Math.floor(Date.now() / 60000);
  const chiave = `sub:${auth.uid}:${p.tier}:${periodo}:${minuto}`;

  try {
    const sess = await stripeCall('/checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: auth.uid,
      success_url: `${base}/subscription/thank-you?t=${p.tier}`,
      cancel_url: `${base}/pricing?cancelled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: valuta,
          unit_amount: importo,
          recurring: { interval: intervalloStripe(periodo) },
          ...(prodotto
            ? { product: prodotto }
            : {
                product_data: {
                  name: `Lyra ${p.name}`,
                  description: (p.tagline || 'Marketplace publishing').slice(0, 300),
                },
              }),
        },
      }],
      // I metadati vanno sull'ABBONAMENTO, non solo sulla sessione: i rinnovi
      // e le disdette arrivano come eventi dell'abbonamento, dove la sessione
      // non esiste piu'. Senza, al primo rinnovo non si saprebbe quale utente
      // e quale livello.
      subscription_data: {
        metadata: { uid: auth.uid, tier: String(p.tier), periodo },
      },
      metadata: { uid: auth.uid, tier: String(p.tier), periodo, kind: 'subscription' },
      allow_promotion_codes: true,
    }, { idempotencyKey: chiave });

    return NextResponse.json({
      ok: true,
      url: sess.url,
      tier: p.tier,
      periodo,
      amountCents: importo,
      currency: p.currency,
    });
  } catch (e: any) {
    const st2 = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ error: String(e?.message || e) }, { status: st2 });
  }
}

/**
 * Passaggio di livello o di periodo su un abbonamento in corso.
 *
 * `proration_behavior: 'always_invoice'` e' la scelta che conta: Stripe
 * calcola quanto resta del periodo gia' pagato, lo accredita, e fattura
 * subito la differenza. Le alternative sono peggiori per motivi diversi —
 * `create_prorations` rimanda tutto alla fattura successiva (chi sale di
 * livello lo usa subito e paga fra un mese, e se disdice prima non paga
 * affatto), `none` regala il periodo in corso al livello nuovo.
 *
 * Il livello NON si scrive qui: lo scrive il webhook, come per un abbonamento
 * nuovo. Se lo scrivessimo adesso e il pagamento della differenza fallisse,
 * qualcuno si troverebbe il livello superiore senza averlo pagato.
 */
async function cambiaLivello(pool: any, uid: string, p: any,
                             periodo: 'monthly' | 'annual', tierAttuale: number) {
  let subId = '';
  try {
    const r = await pool.query(
      'SELECT "stripeSubscriptionId" AS s FROM "User" WHERE id = $1', [uid]);
    subId = String(r.rows[0]?.s || '');
  } catch { /* colonna assente */ }

  if (!subId) {
    // Abbonato secondo il database ma senza abbonamento su Stripe: e' il caso
    // di chi e' stato attivato a mano durante la beta. Non si tocca nulla —
    // un invito senza scadenza non ha un pagamento da modificare.
    return NextResponse.json({
      ok: false,
      error: 'this subscription has no Stripe payment behind it',
      detail: 'It was granted manually (no expiry, nothing charged), so there '
            + 'is no billing to change. Ask an administrator to adjust the '
            + 'level, or cancel the manual grant first.',
      code: 'manuale',
    }, { status: 409 });
  }

  const prodotto = await prodottoStripe(p, pool);
  const valuta = String(p.currency || 'EUR').toLowerCase();

  try {
    // L'id della voce da sostituire: un abbonamento ne ha una sola.
    const sub = await stripeCall(`/subscriptions/${subId}`);
    const itemId = String(sub?.items?.data?.[0]?.id || '');
    if (!itemId) {
      return NextResponse.json({
        error: 'the subscription on Stripe has no line to change',
        detail: 'Subscription ' + subId + ' came back without items.',
      }, { status: 500 });
    }

    const aggiornato = await stripeCall(`/subscriptions/${subId}`, {
      items: [{
        id: itemId,
        price_data: {
          currency: valuta,
          unit_amount: prezzoCents(p, periodo),
          recurring: { interval: intervalloStripe(periodo) },
          product: prodotto,
        },
      }],
      proration_behavior: 'always_invoice',
      // I metadati seguono il cambio: senza, al rinnovo successivo il webhook
      // leggerebbe il livello vecchio e lo riscriverebbe.
      metadata: { uid, tier: String(p.tier), periodo },
    }, { idempotencyKey: `switch:${uid}:${p.tier}:${periodo}:${Math.floor(Date.now() / 60000)}` });

    return NextResponse.json({
      ok: true,
      cambiato: true,
      da: tierAttuale,
      tier: p.tier,
      periodo,
      amountCents: prezzoCents(p, periodo),
      currency: p.currency,
      stato: String(aggiornato?.status || ''),
      detail: 'Plan changed. Stripe credits what you already paid for the '
            + 'current period and invoices the difference now; the new level '
            + 'appears as soon as that payment is confirmed.',
    });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    return NextResponse.json({ error: String(e?.message || e) }, { status: st });
  }
}
