/**
 * Il lucchetto del marketplace — l'unico interruttore, dal pannello admin.
 *
 *   chiuso (beta)   nessuno carica, nessuno compra
 *   aperto          caricare richiede un abbonamento; prezzi e acquisti attivi
 *
 * Si chiama ancora `/api/dashboard/vendite` perche' e' l'indirizzo che l'app
 * installata interroga: cambiarlo avrebbe rotto ogni copia gia' distribuita,
 * che tornerebbe a non sapere se il marketplace e' aperto — e in caso di
 * dubbio l'app risponde «chiuso», quindi nessuno potrebbe piu' pubblicare
 * nulla fino all'aggiornamento. Il corpo della risposta porta sia il nome
 * nuovo (`bloccato`) sia quello vecchio (`attive`), cosi' una versione
 * precedente dell'app continua a funzionare.
 *
 * Con il marketplace chiuso il sito non tratta denaro: si resta dentro i
 * termini del piano gratuito dell'hosting, che vieta l'uso commerciale, e non
 * nasce l'obbligo fiscale legato all'intermediazione.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { marketplaceBloccato, impostaLucchetto } from '@/lib/impostazioni';
import { piani } from '@/lib/abbonamenti';
import { stripeCall, configurato } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pool = getPool();
  const bloccato = await marketplaceBloccato(pool);

  let inVendita = 0;
  let pubblicati = 0;
  try {
    const r = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE "isForSale" = TRUE)::int AS vendita,
              COUNT(*)::int                                   AS tutti
         FROM "Artifact"`);
    inVendita = Number(r.rows[0]?.vendita || 0);
    pubblicati = Number(r.rows[0]?.tutti || 0);
  } catch { /* tabella assente */ }

  // Quanti possono pubblicare oggi, se si aprisse. Serve a decidere: aprire
  // con zero abbonati significa una vetrina che nessuno puo' alimentare.
  let abbonati = 0;
  let schemaPiani = true;
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS n FROM "User"
        WHERE "subscriptionStatus" = 'subscribed'
          AND ("subscriptionUntil" IS NULL OR "subscriptionUntil" > NOW())`);
    abbonati = Number(r.rows[0]?.n || 0);
  } catch { schemaPiani = false; }

  const listaPiani = await piani(pool);

  return NextResponse.json({
    ok: true,
    bloccato,
    // nome vecchio, per le copie dell'app che non conoscono `bloccato`
    attive: !bloccato,
    inVendita,
    pubblicati,
    abbonati,
    schemaPiani: schemaPiani && listaPiani.length > 0,
    piani: listaPiani,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    // Si accetta `bloccato` (nome nuovo) oppure `attive` (nome vecchio, che
    // significa l'opposto). Accettarli entrambi evita che una versione
    // precedente del pannello, inviando `attive`, finisca per CHIUDERE il
    // marketplace credendo di aprirlo.
    let chiuso: boolean;
    if (b && Object.prototype.hasOwnProperty.call(b, 'bloccato')) {
      chiuso = !!b.bloccato;
    } else if (b && Object.prototype.hasOwnProperty.call(b, 'attive')) {
      chiuso = !b.attive;
    } else {
      return NextResponse.json(
        { error: 'missing "bloccato" (or legacy "attive")' }, { status: 400 });
    }

    const chi = String(b?.richiedente || 'admin').trim().toLowerCase();
    const pool = getPool();

    // ── NON SI APRE IL MARKETPLACE SENZA LE FONDAMENTA ────────────────
    // Aprire senza i piani significa che al primo tentativo di pubblicare
    // l'utente si sente chiedere un abbonamento che non esiste: un vicolo
    // cieco, e si scopre solo provando.
    if (!chiuso) {
      const listaPiani = await piani(pool);
      if (!listaPiani.length) {
        return NextResponse.json({
          error: 'subscription plans are not installed',
          detail: 'Opening the marketplace now would ask authors for a plan '
                + 'that does not exist. Run marketplace_abbonamenti.sql on '
                + 'the site Postgres first.',
        }, { status: 409 });
      }

      // ── NE' SENZA UN CONTO CHE INCASSI ───────────────────────────────
      // Aprire mentre nessun autore ha collegato un conto significa mostrare
      // prezzi che non si possono pagare: il compratore arriva al checkout e
      // trova un errore. Meglio dirlo qui.
      let conti = 0;
      try {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n FROM "SellerAccount"
            WHERE status = 'active' OR "payoutsEnabled" = TRUE`);
        conti = Number(r.rows[0]?.n || 0);
      } catch { /* schema vecchio: non si blocca */ }
      if (!conti) {
        return NextResponse.json({
          error: 'no author can receive payouts yet',
          detail: 'Opening now would show prices nobody can be paid for. '
                + 'Link a payout account first, from Profile.',
        }, { status: 409 });
      }
    }

    await impostaLucchetto(chiuso, chi, pool);

    // ── CHIUDENDO, SI CHIUDONO ANCHE I PAGAMENTI GIA' APERTI ──────────
    // Il lucchetto ferma chi chiede un pagamento da adesso in poi. Una pagina
    // di pagamento aperta un minuto prima pero' resterebbe valida fino alla
    // sua scadenza, e chi la completasse comprerebbe a marketplace chiuso.
    // Si fanno scadere subito tutte quelle ancora aperte (abbonamenti e
    // acquisti di artefatti): da quel momento Stripe non accetta piu' nulla.
    let pagamentiChiusi = 0;
    let pagamentiNonChiusi = 0;
    if (chiuso && configurato()) {
      const esito = await chiudiPagamentiAperti();
      pagamentiChiusi = esito.chiusi;
      pagamentiNonChiusi = esito.falliti;
    }
    return NextResponse.json({ ok: true, bloccato: chiuso, attive: !chiuso,
                               pagamentiChiusi, pagamentiNonChiusi });
  } catch (e: any) {
    const t = String(e?.message || e);
    if (/relation .*AppSetting.* does not exist/i.test(t)) {
      return NextResponse.json({
        error: 'The AppSetting table does not exist yet.',
        detail: 'Run marketplace_beta.sql and marketplace_abbonamenti.sql on '
              + 'the site Postgres.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: t }, { status: 500 });
  }
}


/**
 * Fa scadere le sessioni di Checkout ancora aperte create dal marketplace:
 * abbonamenti (`metadata.kind = 'subscription'`) e acquisti di artefatti
 * (`metadata.purchaseId`). Le altre sessioni dell'account Stripe, se ce ne
 * sono, non si toccano.
 *
 * Non solleva: un errore di Stripe qui non deve impedire di chiudere il
 * marketplace, che e' gia' chiuso nel database. Si contano i casi falliti e
 * il pannello li riporta.
 */
async function chiudiPagamentiAperti(): Promise<{ chiusi: number; falliti: number }> {
  let chiusi = 0;
  let falliti = 0;
  let dopo = '';
  for (let pagina = 0; pagina < 10; pagina++) {
    let lista: any;
    try {
      lista = await stripeCall('/checkout/sessions?status=open&limit=100'
        + (dopo ? '&starting_after=' + encodeURIComponent(dopo) : ''));
    } catch {
      falliti++;
      break;
    }
    const sessioni: any[] = lista?.data || [];
    for (const s of sessioni) {
      const m = s?.metadata || {};
      if (m.kind !== 'subscription' && !m.purchaseId) continue;
      try {
        await stripeCall(`/checkout/sessions/${encodeURIComponent(s.id)}/expire`, {});
        chiusi++;
      } catch {
        falliti++;
      }
    }
    if (!lista?.has_more || !sessioni.length) break;
    dopo = String(sessioni[sessioni.length - 1].id || '');
  }
  return { chiusi, falliti };
}
