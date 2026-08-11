import crypto from 'node:crypto';

/**
 * Stripe senza dipendenze.
 *
 * Si parla con l'API REST tramite fetch invece di installare il pacchetto npm:
 * cosi' per mettere in funzione il marketplace bastano le variabili
 * d'ambiente, senza toccare package.json ne' rifare l'installazione.
 *
 * Serve Connect perche' il denaro si divide alla fonte: l'acquirente paga una
 * volta, la commissione arriva alla piattaforma e il resto al venditore, senza
 * che i soldi passino da un conto all'altro. Se transitassero dal nostro conto
 * saremmo noi a trasferire denaro per conto terzi, che richiede
 * un'autorizzazione da istituto di pagamento.
 */

const API = 'https://api.stripe.com/v1';

export function chiaveSegreta(): string {
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

export function configurato(): boolean {
  return chiaveSegreta().startsWith('sk_');
}

export function segretoWebhook(): string {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

/** Codifica in application/x-www-form-urlencoded, con annidamento stile Stripe. */
function form(data: Record<string, any>, prefix = ''): string {
  const parti: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    const chiave = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) {
      parti.push(form(v, chiave));
    } else if (Array.isArray(v)) {
      v.forEach((el, i) => {
        if (typeof el === 'object') parti.push(form(el, `${chiave}[${i}]`));
        else parti.push(`${encodeURIComponent(`${chiave}[${i}]`)}=${encodeURIComponent(String(el))}`);
      });
    } else {
      parti.push(`${encodeURIComponent(chiave)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parti.filter(Boolean).join('&');
}

export class ErroreStripe extends Error {
  constructor(public status: number, public tipo: string, message: string) {
    super(message);
  }
}

/**
 * Chiamata all'API. `idempotencyKey` protegge dal doppio addebito quando la
 * rete fa ritentare: Stripe riconosce la chiave e restituisce il primo esito
 * invece di creare un secondo pagamento.
 */
export async function stripeCall(
  path: string,
  data?: Record<string, any>,
  opts: { method?: string; idempotencyKey?: string; stripeAccount?: string } = {},
): Promise<any> {
  const key = chiaveSegreta();
  if (!key) throw new ErroreStripe(500, 'config', 'STRIPE_SECRET_KEY non impostata');

  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Stripe-Version': '2024-06-20',
  };
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  if (opts.stripeAccount) headers['Stripe-Account'] = opts.stripeAccount;

  const body = data ? form(data) : undefined;
  const res = await fetch(API + path, {
    method: opts.method || (data ? 'POST' : 'GET'),
    headers,
    body,
    cache: 'no-store',
  });

  const testo = await res.text();
  let json: any = {};
  try { json = testo ? JSON.parse(testo) : {}; } catch { /* risposta non JSON */ }

  if (!res.ok) {
    const e = json?.error || {};
    throw new ErroreStripe(res.status, e.type || 'api_error',
      e.message || `Stripe ha risposto ${res.status}`);
  }
  return json;
}

/**
 * Verifica la firma del webhook.
 *
 * Senza questo controllo chiunque conosca l'indirizzo potrebbe inviare un
 * finto "pagamento riuscito" e ottenere gratis qualunque artefatto. E' la
 * ragione per cui STRIPE_WEBHOOK_SECRET non e' facoltativa.
 */
export function verificaFirmaWebhook(
  payload: string,
  header: string | null,
  tolleranzaSec = 300,
): { ok: true; evento: any } | { ok: false; motivo: string } {
  const segreto = segretoWebhook();
  if (!segreto) return { ok: false, motivo: 'STRIPE_WEBHOOK_SECRET non impostata' };
  if (!header) return { ok: false, motivo: 'firma assente' };

  const campi = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = campi['t'];
  const v1 = campi['v1'];
  if (!t || !v1) return { ok: false, motivo: 'firma malformata' };

  // Finestra temporale: un evento valido ma vecchio potrebbe essere stato
  // catturato e rigiocato.
  const eta = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(eta) || eta > tolleranzaSec) {
    return { ok: false, motivo: 'firma troppo vecchia' };
  }

  const atteso = crypto.createHmac('sha256', segreto).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, motivo: 'firma non corrispondente' };
  }

  try {
    return { ok: true, evento: JSON.parse(payload) };
  } catch {
    return { ok: false, motivo: 'corpo non leggibile' };
  }
}

/** Indirizzo pubblico del sito, per i ritorni dal pagamento. */
export function baseUrl(req?: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').replace(/\/+$/, '');
  if (env) return env;
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  if (req) {
    try {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    } catch { /* niente */ }
  }
  return '';
}
