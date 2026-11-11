import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/pg';
import { verificaFirmaWebhook, stripeCall } from '@/lib/stripe';
import { idNuovo } from '@/lib/marketplace';
import { inviaRicevuta } from '@/lib/mailer';
import { periodoValido, tierDelPiano, TIER_MAX } from '@/lib/abbonamenti';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Punto di verita' del pagamento.
 *
 * L'accesso all'artefatto si concede SOLO qui, quando Stripe conferma di aver
 * incassato. Il ritorno del browser dopo il pagamento non prova nulla: e' un
 * URL, e chiunque puo' aprirlo.
 *
 * Due difese contro il doppio accredito:
 *   - la firma dell'evento viene verificata (chi non ha il segreto non passa)
 *   - ogni evento gia' elaborato viene registrato: Stripe ritenta quando la
 *     risposta tarda, e senza questo controllo la stessa vendita verrebbe
 *     contabilizzata due volte
 *
 * Da configurare su Stripe: endpoint  <sito>/api/market/webhook
 * eventi: checkout.session.completed, checkout.session.expired,
 *         charge.refunded, charge.dispute.created, account.updated,
 *         customer.subscription.created, customer.subscription.updated,
 *         customer.subscription.deleted, invoice.paid,
 *         invoice.payment_failed
 *
 * Gli ultimi cinque sono gli ABBONAMENTI. Sono qui e non in un endpoint a
 * parte perche' la protezione contro il doppio accredito — la firma piu' il
 * registro degli eventi gia' visti — e' la stessa, e duplicarla significa
 * dover ricordarsi di correggerla in due posti.
 */
export async function POST(req: NextRequest) {
  const corpo = await req.text();
  const v = verificaFirmaWebhook(corpo, req.headers.get('stripe-signature'));
  if (!v.ok) {
    // 400: Stripe ritentera'. Nessun dettaglio a chi sta sondando.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const ev = v.evento;
  const pool = getPool();

  // gia' visto? si esce senza rifare nulla
  const nuovo = await pool.query(
    `INSERT INTO "WebhookEvent" (id, provider, type, payload)
     VALUES ($1,'stripe',$2,$3) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [String(ev.id), String(ev.type || ''), JSON.stringify({ type: ev.type })]);
  if (!nuovo.rows[0]) return NextResponse.json({ ok: true, duplicato: true });

  try {
    switch (ev.type) {
      case 'checkout.session.completed': {
        // Due cose arrivano con lo stesso nome: l'acquisto di un artefatto e
        // l'attivazione di un abbonamento. Si distinguono dal `mode`.
        // Senza questa biforcazione, l'abbonamento finiva in
        // `pagamentoRiuscito`, che cercava un `purchaseId` inesistente e
        // uscuiva in silenzio: il cliente pagava e non riceveva il livello.
        if (String(ev.data.object?.mode || '') === 'subscription') {
          const motivo = await abbonamentoDaSessione(pool, ev.data.object);
          if (motivo) return NextResponse.json({ ok: true, nulla: motivo });
          break;
        }
        const motivo = await pagamentoRiuscito(pool, ev.data.object);
        if (motivo) {
          // Non e' un errore da ritentare, ma non e' nemmeno un successo:
          // si risponde 200 (Stripe non deve riprovare) dicendo cosa e'
          // successo, cosi' resta scritto accanto alla consegna.
          return NextResponse.json({ ok: true, nulla: motivo });
        }
        break;
      }
      case 'checkout.session.expired':
        await pagamentoAbbandonato(pool, ev.data.object);
        break;
      case 'charge.refunded':
        await rimborso(pool, ev.data.object);
        break;
      case 'charge.dispute.created':
        await contestazione(pool, ev.data.object);
        break;
      case 'account.updated':
        await contoAggiornato(pool, ev.data.object);
        break;

      // ── abbonamenti ──────────────────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await abbonamentoAggiornato(pool, ev.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await fatturaAbbonamento(pool, ev.data.object, 'paid');
        break;
      case 'invoice.payment_failed':
        await fatturaAbbonamento(pool, ev.data.object, 'failed');
        break;

      default:
        break;   // evento non gestito: registrato e basta
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // L'evento resta registrato ma il lavoro e' fallito: si toglie il segno,
    // cosi' il ritentativo di Stripe puo' rifarlo.
    await pool.query('DELETE FROM "WebhookEvent" WHERE id = $1', [String(ev.id)]);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function pagamentoRiuscito(pool: any, sess: any) {
  // I ritorni SILENZIOSI erano il problema: l'evento veniva accettato con
  // 200 OK e non succedeva nulla, senza lasciare traccia del perche'. Ora
  // ogni uscita dice il motivo, e il motivo si legge nel corpo della risposta
  // che Stripe conserva accanto alla consegna.
  if (sess.payment_status !== 'paid') return 'the payment does not show as collected';
  const meta = sess.metadata || {};
  const purchaseId = String(sess.client_reference_id || meta.purchaseId || '');
  if (!purchaseId) return 'event without a purchaseId';

  const p = await pool.query('SELECT * FROM "Purchase" WHERE id = $1', [purchaseId]);
  const acq = p.rows[0];
  if (!acq) return 'acquisto ' + purchaseId + ' non trovato nel database';
  if (acq.status === 'paid') return 'acquisto gia\' segnato come pagato';

  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');

    await cli.query(
      `UPDATE "Purchase" SET status='paid', "paidAt"=NOW(), "providerRef"=$2 WHERE id=$1`,
      [purchaseId, String(sess.payment_intent || sess.id)]);

    // La licenza si aggancia alla versione corrente e ci resta: acquisto una
    // tantum vuol dire "questa versione, per sempre". Gli aggiornamenti sono
    // il motivo per cui esiste l'abbonamento.
    const licId = idNuovo();
    const lic = await cli.query(
      `INSERT INTO "License" (id, "artifactId", "userId", status, "expiresAt",
                              "purchaseId", "releaseId")
       SELECT $1,$2,$3,'active'::license_status, NULL, $4,
              (SELECT id FROM "ArtifactRelease"
                WHERE "artifactId"=$2 AND "isCurrent" ORDER BY "createdAt" DESC LIMIT 1)
       ON CONFLICT ("artifactId","userId") DO UPDATE
         SET status='active'::license_status, "purchaseId"=EXCLUDED."purchaseId",
             "updatedAt"=NOW()
       RETURNING id`,
      [licId, acq.artifactId, acq.buyerId, purchaseId]);

    await cli.query('UPDATE "Purchase" SET "licenseId"=$2 WHERE id=$1',
      [purchaseId, lic.rows[0]?.id || licId]);

    // libro mastro: incasso, quota piattaforma, netto al venditore
    const vals = String(acq.currency || 'EUR');
    await cli.query(
      `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
       VALUES ($1,$2,'charge',$3,$4,$5,'incasso'),
              ($1,NULL,'fee',$6,$4,$5,'commissione piattaforma'),
              ($1,$2,'payout',$7,$4,$5,'netto al venditore')`,
      [purchaseId, acq.sellerId, acq.amountCents, vals,
       String(sess.payment_intent || ''), acq.feeCents, acq.netCents]);

    await cli.query('UPDATE "Artifact" SET downloads = COALESCE(downloads,0)+1 WHERE id=$1',
      [acq.artifactId]);

    await cli.query('COMMIT');
  } catch (e) {
    await cli.query('ROLLBACK');
    throw e;
  } finally {
    cli.release();
  }

  // ── ricevuta all'acquirente ──
  // FUORI dalla transazione e senza propagare errori: se la posta e' giu', il
  // pagamento resta valido. Sollevare qui farebbe ritentare Stripe e si
  // rischierebbe di rielaborare un acquisto gia' registrato.
  try {
    const d = await pool.query(
      `SELECT a.name AS artefatto, a.delivery::text AS consegna, u.email
         FROM "Purchase" p
         JOIN "Artifact" a ON a.id = p."artifactId"
         LEFT JOIN "User" u ON u.id = p."buyerId"
        WHERE p.id = $1`, [purchaseId]);
    const r = d.rows[0];
    // l'indirizzo del cliente su Stripe e' l'ultima risorsa se manca in anagrafica
    const email = r?.email || sess.customer_details?.email || sess.customer_email || '';
    if (email) {
      await inviaRicevuta({
        email,
        artefatto: r?.artefatto || 'Artefatto',
        importoCents: Number(acq.amountCents || 0),
        valuta: String(acq.currency || 'EUR'),
        consegna: String(r?.consegna || 'local'),
        purchaseId,
        data: new Date(),
      });
    }
  } catch (e) {
    console.error('[webhook] receipt not sent:', e);
  }
}

async function pagamentoAbbandonato(pool: any, sess: any) {
  const id = String(sess.client_reference_id || sess.metadata?.purchaseId || '');
  if (!id) return;
  await pool.query(
    `UPDATE "Purchase" SET status='expired' WHERE id=$1 AND status='pending'`, [id]);
}

/** Rimborso: la licenza si spegne, altrimenti si terrebbe merce non pagata. */
async function rimborso(pool: any, charge: any) {
  const pi = String(charge.payment_intent || '');
  if (!pi) return;
  const p = await pool.query('SELECT * FROM "Purchase" WHERE "providerRef" = $1', [pi]);
  const acq = p.rows[0];
  if (!acq) return;

  const totale = Number(charge.amount_refunded || 0) >= Number(acq.amountCents || 0);
  await pool.query(
    `UPDATE "Purchase" SET status=$2, "refundedAt"=NOW() WHERE id=$1`,
    [acq.id, totale ? 'refunded' : 'partial_refund']);
  if (totale) {
    await pool.query(
      `UPDATE "License" SET status='refunded'::license_status, "updatedAt"=NOW()
        WHERE "artifactId"=$1 AND "userId"=$2`, [acq.artifactId, acq.buyerId]);
  }
  await pool.query(
    `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
     VALUES ($1,$2,'refund',$3,$4,$5,'rimborso')`,
    [acq.id, acq.sellerId, -Number(charge.amount_refunded || 0),
     String(acq.currency || 'EUR'), pi]);
}

/** Contestazione della carta: si sospende subito, si decidera' all'esito. */
async function contestazione(pool: any, disputa: any) {
  const pi = String(disputa.payment_intent || '');
  if (!pi) return;
  const p = await pool.query('SELECT * FROM "Purchase" WHERE "providerRef" = $1', [pi]);
  const acq = p.rows[0];
  if (!acq) return;
  await pool.query(
    `UPDATE "License" SET status='revoked'::license_status, "updatedAt"=NOW()
      WHERE "artifactId"=$1 AND "userId"=$2`, [acq.artifactId, acq.buyerId]);
  await pool.query(
    `INSERT INTO "LedgerEntry" ("purchaseId","userId",kind,"amountCents",currency,"providerRef",note)
     VALUES ($1,$2,'chargeback',$3,$4,$5,'contestazione')`,
    [acq.id, acq.sellerId, -Number(disputa.amount || 0), String(acq.currency || 'EUR'), pi]);
}

// ===========================================================================
//  ABBONAMENTI
// ===========================================================================

/**
 * La fine del periodo pagato.
 *
 * Si guarda in DUE posti e non per abbondanza: Stripe ha spostato
 * `current_period_end` dall'abbonamento alla singola voce, e il sito dichiara
 * una versione dell'API configurabile (`STRIPE_API_VERSION`). Leggere solo il
 * primo posto significa che, cambiando versione, la scadenza arriva vuota e
 * ogni abbonato risulta scaduto subito — cioe' tutti perdono l'accesso in
 * blocco il giorno dell'aggiornamento.
 */
function finePeriodo(sub: any): Date | null {
  const n = Number(sub?.current_period_end
    ?? sub?.items?.data?.[0]?.current_period_end
    ?? 0);
  return n > 0 ? new Date(n * 1000) : null;
}

/** Lo stato di Stripe tradotto nel nostro, e se dà diritto a pubblicare. */
function traduciStato(stripeStatus: string): { stato: string; vale: boolean } {
  switch (String(stripeStatus || '').toLowerCase()) {
    case 'active':
    case 'trialing':
      return { stato: 'subscribed', vale: true };
    // Pagamento rifiutato: Stripe ritenta per giorni. Nel frattempo
    // l'abbonamento NON vale — dare il servizio a chi non lo sta pagando e
    // poi toglierlo è peggio che non darlo subito.
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'paused':
      return { stato: 'past_due', vale: false };
    case 'canceled':
    case 'incomplete_expired':
      return { stato: 'cancelled', vale: false };
    default:
      return { stato: 'none', vale: false };
  }
}

/**
 * Scrive lo stato dell'abbonamento a partire dall'oggetto di Stripe.
 *
 * È IL SOLO PUNTO che tocca `subscriptionStatus` e `subscriptionTier`. Vale
 * per un abbonamento nuovo, per un rinnovo, per un cambio di livello e per
 * una disdetta fatta dal portale: in tutti i casi l'oggetto che arriva
 * descrive lo stato COMPLETO, quindi riscriverlo tutto è giusto ed è anche
 * idempotente — lo stesso evento consegnato due volte lascia lo stesso
 * risultato.
 *
 * Chi è stato attivato A MANO durante la beta non ha un abbonamento su
 * Stripe, quindi nessun evento lo riguarda e nessun evento lo tocca.
 */
async function abbonamentoAggiornato(pool: any, sub: any) {
  const meta = sub?.metadata || {};
  const subId = String(sub?.id || '');
  const customer = String(sub?.customer || '');

  // Chi è: prima i metadati (li scriviamo noi al checkout), poi l'id del
  // cliente, poi l'id dell'abbonamento. Tre strade perché un evento che non
  // si sa a chi attribuire è un pagamento incassato e non accreditato.
  let uid = String(meta.uid || '');
  if (!uid && customer) {
    const r = await pool.query(
      'SELECT id FROM "User" WHERE "stripeCustomerId" = $1 LIMIT 1', [customer]);
    uid = String(r.rows[0]?.id || '');
  }
  if (!uid && subId) {
    const r = await pool.query(
      'SELECT id FROM "User" WHERE "stripeSubscriptionId" = $1 LIMIT 1', [subId]);
    uid = String(r.rows[0]?.id || '');
  }
  if (!uid) {
    console.error('[webhook] subscription without a known user:', subId, customer);
    return;
  }

  const { stato, vale } = traduciStato(sub?.status);
  // Il livello si riconosce prima dal CODICE del piano (nei metadati da
  // novembre 2026) e dal PRODOTTO Stripe, poi dal numero. Il numero da solo
  // non basta: Desk era il livello 3 prima che arrivasse Quant, e un
  // abbonamento Desk nato allora porta ancora «tier 3» nei metadati.
  const prodotto = String(sub?.items?.data?.[0]?.price?.product?.id
    || sub?.items?.data?.[0]?.price?.product || '');
  let tierPiano = await tierDelPiano(String(meta.code || ''), prodotto, pool);
  if (!tierPiano) tierPiano = Number(meta.tier || 0);
  const tier = vale && tierPiano >= 1 && tierPiano <= TIER_MAX ? tierPiano : 0;
  const periodo = periodoValido(meta.periodo)
    || (String(sub?.items?.data?.[0]?.price?.recurring?.interval || '') === 'year'
        ? 'annual' : 'monthly');
  const fine = finePeriodo(sub);
  // Disdetta chiesta ma periodo in corso: resta attivo fino alla fine. Senza
  // questa distinzione si toglierebbe l'accesso a qualcuno che ha pagato.
  const disdetta = sub?.cancel_at_period_end
    ? (Number(sub?.cancel_at || 0) > 0 ? new Date(Number(sub.cancel_at) * 1000) : fine)
    : null;

  await pool.query(
    `UPDATE "User"
        SET "subscriptionStatus"     = $2::subscription_status,
            "subscriptionTier"       = $3,
            "subscriptionUntil"      = $4,
            "subscriptionPeriod"     = $5,
            "subscriptionCancelAt"   = $6,
            "stripeSubscriptionId"   = $7,
            "stripeCustomerId"       = COALESCE("stripeCustomerId", $8)
      WHERE id = $1`,
    [uid, stato, tier, fine, periodo, disdetta, subId || null, customer || null]);

  // ── la prova ──────────────────────────────────────────────────────────
  // In una UPDATE a parte, perche' le due colonne sono le ultime arrivate:
  // se il file SQL che le aggiunge non e' ancora passato, lo stato
  // dell'abbonamento qui sopra deve essere scritto lo stesso.
  //   - `subscriptionTrialEnd`: la fine della prova finche' la prova e' in
  //     corso; vuota quando finisce (o se non c'e' mai stata);
  //   - `trialUsedAt`: la prima volta che l'account ha una prova. Non si
  //     svuota mai: la prova e' una per account.
  const fineProva = Number(sub?.trial_end || 0);
  const inProva = String(sub?.status || '').toLowerCase() === 'trialing'
    && fineProva * 1000 > Date.now();
  try {
    await pool.query(
      `UPDATE "User"
          SET "subscriptionTrialEnd" = $2,
              "trialUsedAt" = CASE WHEN $3::boolean
                                   THEN COALESCE("trialUsedAt", NOW())
                                   ELSE "trialUsedAt" END
        WHERE id = $1`,
      [uid, inProva ? new Date(fineProva * 1000) : null, fineProva > 0]);
  } catch (e: any) {
    console.error('[webhook] trial columns not written (run marketplace_abbonamenti.sql):',
                  String(e?.message || e));
  }
}

/**
 * L'abbonamento appena attivato, a partire dalla sessione di checkout.
 *
 * Stripe manda ANCHE `customer.subscription.created`, ma l'ordine di arrivo
 * non è garantito e una delle due consegne può fallire. Gestirle entrambe non
 * raddoppia nulla: scrivono lo stesso stato dalla stessa fonte.
 */
async function abbonamentoDaSessione(pool: any, sess: any): Promise<string | null> {
  const subId = String(sess?.subscription || '');
  if (!subId) return 'subscription session without a subscription id';
  // Si RILEGGE l'abbonamento da Stripe invece di fidarsi della sessione: la
  // sessione dice cosa è stato chiesto, l'abbonamento dice cosa esiste.
  const sub = await stripeCall(`/subscriptions/${subId}`);
  // Se i metadati non sono arrivati sull'abbonamento, si prendono dalla
  // sessione: senza il livello, l'accredito sarebbe a zero.
  if (!sub.metadata || !sub.metadata.uid) {
    sub.metadata = {
      ...(sub.metadata || {}),
      uid: String(sess?.metadata?.uid || sess?.client_reference_id || ''),
      tier: String(sess?.metadata?.tier || ''),
      code: String(sess?.metadata?.code || ''),
      periodo: String(sess?.metadata?.periodo || ''),
    };
  }
  await abbonamentoAggiornato(pool, sub);
  return null;
}

/**
 * Lo storico degli incassi di abbonamento.
 *
 * Serve a tre domande a cui le colonne su "User" non possono rispondere,
 * perché quelle tengono lo stato corrente: quanto ha pagato questa persona,
 * quando un rinnovo è stato rifiutato, e quale fattura copre quale periodo.
 *
 * `providerRef` è unico nella tabella: è così che un webhook ritentato non
 * registra due volte lo stesso incasso. Il conflitto si ignora invece di
 * essere un errore, perché un doppione non è un guasto — è Stripe che
 * riprova.
 */
async function fatturaAbbonamento(pool: any, inv: any, esito: 'paid' | 'failed') {
  const subId = String(inv?.subscription
    || inv?.parent?.subscription_details?.subscription || '');
  const customer = String(inv?.customer || '');
  if (!subId && !customer) return;

  const r = await pool.query(
    `SELECT id, "subscriptionTier" AS tier, "subscriptionPeriod" AS periodo
       FROM "User"
      WHERE ($1 <> '' AND "stripeSubscriptionId" = $1)
         OR ($2 <> '' AND "stripeCustomerId" = $2)
      LIMIT 1`, [subId, customer]);
  const u = r.rows[0];
  if (!u) {
    console.error('[webhook] invoice without a known user:', inv?.id, subId, customer);
    return;
  }

  const riga = inv?.lines?.data?.[0];
  const inizio = Number(riga?.period?.start || 0);
  const fine = Number(riga?.period?.end || 0);

  await pool.query(
    `INSERT INTO "SubscriptionPayment"
       (id, "userId", tier, period, "amountCents", currency, status,
        provider, "providerRef", "periodStart", "periodEnd")
     VALUES ($1,$2,$3,$4,$5,$6,$7,'stripe',$8,$9,$10)
     ON CONFLICT ("providerRef") DO NOTHING`,
    [idNuovo(), u.id, Number(u.tier || 0),
     String(u.periodo || 'monthly'),
     Number(esito === 'paid' ? (inv?.amount_paid || 0) : (inv?.amount_due || 0)),
     String(inv?.currency || 'eur').toUpperCase(),
     esito, String(inv?.id || ''),
     inizio ? new Date(inizio * 1000) : null,
     fine ? new Date(fine * 1000) : null]);

  // Un rinnovo pagato SPOSTA la scadenza. L'evento dell'abbonamento la porta
  // comunque, ma può arrivare dopo o non arrivare: aggiornarla anche da qui
  // evita che qualcuno risulti scaduto per un ordine di consegna.
  if (esito === 'paid' && fine) {
    await pool.query(
      `UPDATE "User" SET "subscriptionUntil" = GREATEST(
          COALESCE("subscriptionUntil", TO_TIMESTAMP($2)), TO_TIMESTAMP($2))
        WHERE id = $1`, [u.id, fine]);
  }
}

async function contoAggiornato(pool: any, acct: any) {
  const payouts = !!acct.payouts_enabled;
  const charges = !!acct.charges_enabled;
  const stato = payouts && charges ? 'verified'
    : (acct?.requirements?.disabled_reason ? 'restricted' : 'onboarding');
  await pool.query(
    `UPDATE "SellerAccount"
        SET status=$2::payout_status, "payoutsEnabled"=$3, "chargesEnabled"=$4,
            requirements=$5, "updatedAt"=NOW()
      WHERE "providerRef"=$1`,
    [String(acct.id), stato, payouts, charges,
     JSON.stringify({ currently_due: acct?.requirements?.currently_due || [],
                      disabled_reason: acct?.requirements?.disabled_reason || null })]);
}
