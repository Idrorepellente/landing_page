import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { tokenFromRequest } from '@/lib/appToken';
import { stripeCall, configurato, baseUrl, ErroreStripe, ambienteStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Conto del venditore (Stripe Connect Express).
 *
 * GET  -> stato: puo' incassare? cosa manca?
 * POST -> crea il conto se non c'e' e restituisce il link al modulo di Stripe.
 *
 * I dati bancari e di identita' NON passano da qui: li raccoglie Stripe sul
 * proprio modulo. Noi conserviamo solo il riferimento al conto e lo stato di
 * verifica, quindi non custodiamo nulla di sensibile e non ne rispondiamo.
 */

async function leggiConto(userId: string) {
  const pool = getPool();
  const r = await pool.query(
    `SELECT "userId", "providerRef", status::text AS status, country,
            "payoutsEnabled", "chargesEnabled", requirements
       FROM "SellerAccount" WHERE "userId" = $1`, [userId]);
  return r.rows[0] || null;
}

/** Riallinea il nostro stato a quello che dice Stripe. */
async function sincronizza(userId: string, acct: any) {
  const pool = getPool();
  const payouts = !!acct?.payouts_enabled;
  const charges = !!acct?.charges_enabled;
  const mancanti = acct?.requirements?.currently_due || [];
  const stato = payouts && charges ? 'verified'
    : (acct?.requirements?.disabled_reason ? 'restricted' : 'onboarding');

  await pool.query(
    `INSERT INTO "SellerAccount"
       ("userId", provider, "providerRef", status, country, "payoutsEnabled",
        "chargesEnabled", requirements, "updatedAt")
     VALUES ($1,'stripe',$2,$3::payout_status,$4,$5,$6,$7,NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       "providerRef" = EXCLUDED."providerRef",
       status = EXCLUDED.status,
       country = EXCLUDED.country,
       "payoutsEnabled" = EXCLUDED."payoutsEnabled",
       "chargesEnabled" = EXCLUDED."chargesEnabled",
       requirements = EXCLUDED.requirements,
       "updatedAt" = NOW()`,
    [userId, acct.id, stato, acct?.country || null, payouts, charges,
     JSON.stringify({ currently_due: mancanti, disabled_reason: acct?.requirements?.disabled_reason || null })]);

  return { stato, payouts, charges, mancanti };
}

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  if (!configurato()) {
    return NextResponse.json({ configured: false, status: 'none', payoutsEnabled: false,
      message: 'incasso non configurato sul sito' });
  }

  // L'ambiente viaggia sempre: quando qualcosa non torna, la prima domanda e'
  // "quale Stripe sto interrogando?" — e senza risposta si cerca alla cieca.
  const ambiente = ambienteStripe();

  const riga = await leggiConto(auth.uid);
  if (!riga?.providerRef) {
    return NextResponse.json({ configured: true, status: 'none',
      payoutsEnabled: false, ambiente });
  }

  try {
    const acct = await stripeCall('/accounts/' + riga.providerRef);
    const s = await sincronizza(auth.uid, acct);
    return NextResponse.json({
      configured: true, status: s.stato, payoutsEnabled: s.payouts,
      chargesEnabled: s.charges, missing: s.mancanti, country: acct?.country || null,
      ambiente,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, status: riga.status,
      payoutsEnabled: riga.payoutsEnabled, ambiente,
      error: String(e?.message || e) });
  }
}

/**
 * Protezione generale: qualunque caduta produce un messaggio, non un 500 muto.
 *
 * Le query fuori dal `try` facevano cadere la richiesta prima che Next.js
 * potesse comporre una risposta, e all'utente arrivava un nudo «HTTP 500».
 */
export async function POST(req: NextRequest) {
  try {
    return await gestisciPOST(req);
  } catch (e: any) {
    const testo = String(e?.message || e);
    if (/column|relation|does not exist|violates|constraint/i.test(testo)) {
      return NextResponse.json({
        error: 'Il database del sito non e\' allineato.',
        detail: testo + '. Esegui gli schemi SQL sul Postgres.',
        raw: testo,
      }, { status: 500 });
    }
    return NextResponse.json({ error: testo, raw: testo }, { status: 500 });
  }
}

async function gestisciPOST(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'token assente o scaduto' }, { status: 401 });
  if (!configurato()) {
    return NextResponse.json({ error: 'incasso non configurato sul sito' }, { status: 503 });
  }

  const pool = getPool();

  // VERIFICA IN DUE PASSAGGI OBBLIGATORIA per collegare un conto.
  //
  // Da qui in avanti l'account non custodisce piu' solo del lavoro: custodisce
  // la destinazione di denaro reale. Chi entrasse con la sola password
  // potrebbe dirottare gli incassi su un conto proprio, e il venditore se ne
  // accorgerebbe al primo pagamento mancante. La password da sola non basta
  // per una cosa che si nota tardi e si recupera male.
  const q2fa = await pool.query(
    'SELECT "twoFactorMode"::text AS m FROM "User" WHERE id = $1 LIMIT 1',
    [auth.uid]);
  if (String(q2fa.rows[0]?.m || 'none') === 'none') {
    return NextResponse.json({
      error: 'Serve la verifica in due passaggi.',
      detail: 'Collegare un conto significa indicare dove finiscono i tuoi '
            + 'incassi: la sola password non basta a proteggerlo. Attivala '
            + 'dal profilo, in Sicurezza, poi torna qui.',
      code: 'serve_2fa',
    }, { status: 403 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo facoltativo */ }
  const paese = String(body?.country || 'IT').toUpperCase().slice(0, 2);
  // Chi vende puo' essere un privato o una societa'. Prima era fissato a
  // 'individual': un venditore con partita IVA si trovava il modulo di Stripe
  // che gli chiedeva dati da privato, e doveva ricominciare.
  const tipo = body?.businessType === 'company' ? 'company' : 'individual';

  try {
    let riga = await leggiConto(auth.uid);
    let accountId: string = riga?.providerRef || '';

    if (!accountId) {
      const acct = await stripeCall('/accounts', {
        type: 'express',
        country: paese,
        email: auth.email,
        business_type: tipo,
        capabilities: { transfers: { requested: 'true' } },
        metadata: { userId: auth.uid },
        // CHIAVE DI IDEMPOTENZA: stabile per un minuto, non per sempre.
        //
        // Stripe conserva per 24 ore il risultato della prima richiesta fatta
        // con una data chiave — ERRORI COMPRESI — e restituisce quello a ogni
        // ripetizione. Con `acct:<utente>` fisso, il primo tentativo fallito
        // (Connect non ancora attivo, per esempio) veniva ripetuto identico
        // per un giorno intero: si correggeva la causa e l'errore restava,
        // senza alcun modo di capire perche'.
        //
        // Il minuto e' il compromesso giusto: due clic ravvicinati sullo
        // stesso pulsante cadono nella stessa finestra e non creano due conti,
        // mentre un nuovo tentativo dopo aver sistemato qualcosa parte pulito.
        // La difesa vera contro i doppioni resta comunque il controllo su
        // SellerAccount, fatto qui sopra prima di creare.
      }, { idempotencyKey: 'acct:' + auth.uid + ':'
                           + Math.floor(Date.now() / 60000) });
      accountId = acct.id;
      await pool.query(
        `INSERT INTO "SellerAccount" ("userId", provider, "providerRef", status, country)
         VALUES ($1,'stripe',$2,'onboarding'::payout_status,$3)
         ON CONFLICT ("userId") DO UPDATE SET "providerRef" = EXCLUDED."providerRef"`,
        [auth.uid, accountId, paese]);
    }

    const base = baseUrl(req);
    const link = await stripeCall('/account_links', {
      account: accountId,
      type: 'account_onboarding',
      // il link scade: se l'utente lo apre tardi torna qui e ne chiede un altro
      refresh_url: `${base}/api/market/seller?refresh=1`,
      return_url: `${base}/marketplace/venditore?ok=1`,
    });

    return NextResponse.json({ ok: true, url: link.url, accountId });
  } catch (e: any) {
    const st = e instanceof ErroreStripe ? e.status : 500;
    const testo = String(e?.message || e);

    // Connect non attivo sull'account della PIATTAFORMA. Il messaggio di
    // Stripe e' in inglese e parla di "signing up for Connect", che a chi
    // vende non dice nulla: non e' lui a doversi iscrivere, e non c'e' niente
    // che possa fare dall'app. Va detto che dipende dal gestore del sito.
    if (/sign(ed)?\s*up for Connect|only create new accounts/i.test(testo)) {
      // L'ambiente e' l'informazione decisiva: Connect attivato nella sandbox
      // non vale in produzione e viceversa. Senza dirlo, chi ha appena
      // attivato Connect da una parte cerca il problema dalla parte
      // sbagliata — e non lo trova, perche' li' e' tutto a posto.
      const dove = ambienteStripe() === 'live'
        ? 'in PRODUZIONE (la chiave del sito e\' sk_live_…)'
        : ambienteStripe() === 'test'
          ? 'in TEST/SANDBOX (la chiave del sito e\' sk_test_…)'
          : 'nell\'ambiente configurato sul sito';
      return NextResponse.json({
        error: 'La vendita non e\' ancora attiva su questo marketplace.',
        detail: 'Stripe Connect non risulta attivo ' + dove + '. '
              + 'Va abilitato una volta sola, dal pannello Stripe, NELLO '
              + 'STESSO ambiente della chiave usata dal sito: attivarlo nella '
              + 'sandbox non vale per la produzione, e viceversa. '
              + 'Finche\' non e\' fatto, nessun utente puo\' collegare il '
              + 'proprio conto. Non dipende da te.',
        code: 'connect_non_attivo',
        ambiente: ambienteStripe(),
      }, { status: 503 });
    }
    return NextResponse.json({ error: testo }, { status: st });
  }
}
