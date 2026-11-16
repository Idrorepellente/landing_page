/**
 * lib/allineaCatalogo.ts — il database dei piani, allineato da solo al
 * catalogo del sito (lib/catalogo.ts).
 *
 * IL PROBLEMA CHE TOGLIE. I piani che l'app mostra (My subscription), che il
 * checkout fa pagare e che il webhook riconosce stanno nella tabella
 * "SubscriptionPlan". Prima li scriveva marketplace_abbonamenti.sql, da
 * eseguire a mano sul Postgres del sito: finché nessuno lo eseguiva, l'app
 * continuava a mostrare i tre piani segnaposto (Author, Studio, Desk a
 * 9/19/39 €) mentre il sito vendeva Pro, Professional, Quant e Desk a
 * 49/149/200 € e 8.000 € l'anno.
 *
 * COME. Alla prima lettura dei piani dopo un rilascio (`piani()` in
 * lib/abbonamenti.ts, quindi l'app, il checkout, il webhook e il pannello)
 * il sito confronta le righe della tabella con il catalogo. Se una differisce
 * in qualunque cosa (nome, frase, prezzi, valuta, voci) o manca, in una sola
 * transazione e sotto un lucchetto di Postgres (più istanze del sito possono
 * partire insieme):
 *
 *   1. completa lo schema degli abbonamenti, toccando solo ciò che manca
 *      (colonne della prova, vincoli dei livelli da 0 a 4, tabelle): è lo
 *      stesso schema di marketplace_abbonamenti.sql;
 *   2. sposta Desk dal livello 3 al 4 se il catalogo è quello vecchio (con
 *      abbonati e storico dei pagamenti);
 *   3. scrive i quattro piani, tenendo il prodotto Stripe di un piano solo
 *      se il codice è lo stesso (un prodotto «Lyra Author» sulle fatture di
 *      Pro sarebbe un errore);
 *   4. annota l'impronta del catalogo in "AppSetting".
 *
 * Una riga cambiata a mano nel database torna come nel catalogo alla prima
 * istanza nuova: il catalogo è l'unica fonte, e il pannello non cambia più i
 * prezzi. Per cambiare un prezzo si cambia lib/catalogo.ts e si pubblica.
 *
 * Se qualcosa va storto (il database non risponde, mancano i permessi) i
 * piani si leggono comunque come sono, l'errore si ricorda per il pannello e
 * si riprova dopo un minuto, non a ogni richiesta.
 */
import { CATALOGO, IMPRONTA_CATALOGO, jsonCanonico } from './catalogo';

const CHIAVE = 'subscription_catalog';
const RIPROVA_MS = 60_000;

export type StatoCatalogo = {
  /** L'impronta del catalogo di questo rilascio del sito. */
  impronta: string;
  /** Il database ha esattamente i piani del catalogo. */
  allineato: boolean;
  /** Quando il database è stato allineato a questa impronta (ISO), se si sa. */
  quando: string | null;
  /** Questa istanza ha riscritto i piani (il database non li aveva giusti). */
  scritto: boolean;
  /** Perché non è stato possibile allineare, se non lo è. */
  errore: string | null;
};

let allineato = false;
let quando: string | null = null;
let scritto = false;
let ultimoErrore: string | null = null;
let ultimoTentativo = 0;
let inCorso: Promise<StatoCatalogo> | null = null;

function stato(): StatoCatalogo {
  return { impronta: IMPRONTA_CATALOGO, allineato, quando, scritto, errore: ultimoErrore };
}

/**
 * Il perché di uno schema degli abbonamenti che manca, per i messaggi
 * d'errore delle rotte. Le tabelle e le colonne le crea il sito da solo:
 * se mancano, l'allineamento non è riuscito, e la cosa utile da dire è il
 * motivo, non un file SQL da eseguire a mano.
 */
export function spiegaSchema(): string {
  return 'The site sets up its subscription tables by itself'
    + (ultimoErrore ? `, and the last attempt failed: ${ultimoErrore}.` : '.')
    + ' It retries every minute; the Plans card of the admin panel shows the state.';
}

/** Per le prove: dimentica cio' che questa istanza sa. */
export function _dimentica(): void {
  allineato = false; quando = null; scritto = false;
  ultimoErrore = null; ultimoTentativo = 0; inCorso = null;
}

/**
 * Allinea il database al catalogo, una volta per istanza. Non lancia mai:
 * ritorna lo stato (e chi legge i piani li legge comunque).
 */
export async function assicuraCatalogo(pool: any): Promise<StatoCatalogo> {
  if (allineato) return stato();
  if (inCorso) return inCorso;
  if (ultimoErrore && Date.now() - ultimoTentativo < RIPROVA_MS) return stato();
  ultimoTentativo = Date.now();
  inCorso = (async () => {
    try {
      const giaGiusto = await confronta(pool);
      if (!giaGiusto) await scrivi(pool);
      allineato = true;
      ultimoErrore = null;
    } catch (e: any) {
      allineato = false;
      ultimoErrore = String(e?.message || e).slice(0, 400);
      // eslint-disable-next-line no-console
      console.error('[catalogo] piani non allineati:', ultimoErrore);
    }
    return stato();
  })().finally(() => { inCorso = null; });
  return inCorso;
}

// ---------------------------------------------------------------------------
// il confronto
// ---------------------------------------------------------------------------

function rigaUguale(r: any, p: (typeof CATALOGO)[number]): boolean {
  const feat = (r.features && typeof r.features === 'object') ? r.features : {};
  return String(r.code) === p.code
    && String(r.name) === p.name
    && String(r.tagline || '') === p.tagline
    && Number(r.monthlyCents) === p.monthlyCents
    && Number(r.annualCents) === p.annualCents
    && String(r.currency || '').toUpperCase() === p.currency
    && r.active !== false
    && jsonCanonico(feat) === jsonCanonico(p.features);
}

/**
 * Il database ha già esattamente il catalogo (e l'impronta)? Senza lucchetti,
 * e senza mai far fallire una query: dentro una transazione un errore la
 * renderebbe inutilizzabile, quindi le tabelle assenti si guardano prima.
 */
async function confronta(db: any): Promise<boolean> {
  const t = await db.query(
    `SELECT to_regclass('"SubscriptionPlan"') AS piani, to_regclass('"AppSetting"') AS imp`);
  if (!t.rows[0]?.piani || !t.rows[0]?.imp) return false;   // tabelle da creare
  const r = await db.query(
    `SELECT tier, code, name, tagline, "monthlyCents", "annualCents",
            currency, features, active
       FROM "SubscriptionPlan"`);
  const righe: any[] = r.rows;
  const perTier = new Map(righe.map((x: any) => [Number(x.tier), x]));
  for (const p of CATALOGO) {
    const x = perTier.get(p.tier);
    if (!x || !rigaUguale(x, p)) return false;
  }
  // un livello in più ancora attivo (catalogo vecchio)
  const livelli = new Set(CATALOGO.map((p) => p.tier));
  if (righe.some((x: any) => !livelli.has(Number(x.tier)) && x.active !== false)) return false;
  const m = await db.query(
    `SELECT valore, "updatedAt" FROM "AppSetting" WHERE chiave = $1`, [CHIAVE]);
  const riga = m.rows[0];
  if (!riga || riga.valore !== IMPRONTA_CATALOGO) return false;
  quando = riga.updatedAt ? new Date(riga.updatedAt).toISOString() : null;
  return true;
}

// ---------------------------------------------------------------------------
// la scrittura
// ---------------------------------------------------------------------------

async function esiste(c: any, tabella: string): Promise<boolean> {
  const r = await c.query('SELECT to_regclass($1) AS t', [`"${tabella}"`]);
  return !!r.rows[0]?.t;
}

async function colonne(c: any, tabella: string): Promise<Set<string>> {
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1`, [tabella]);
  return new Set(r.rows.map((x: any) => String(x.column_name)));
}

/**
 * Il vincolo di intervallo su una colonna dei livelli: si rifà solo se quello
 * che c'è non ammette il massimo (il catalogo vecchio arrivava a 3). Rifarlo
 * sempre vorrebbe dire rileggere la tabella a ogni rilascio.
 */
async function vincoloLivelli(c: any, tabella: string, colonna: string,
                              nome: string, min: number, max: number): Promise<void> {
  const r = await c.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conrelid = to_regclass($1) AND contype = 'c'`, [`"${tabella}"`]);
  const suColonna = r.rows.filter((x: any) => String(x.def).includes(colonna));
  const giusto = suColonna.length > 0 && suColonna.every((x: any) => {
    const d = String(x.def).replace(/\s+/g, ' ');
    return d.includes(`>= ${min}`) && d.includes(`<= ${max}`);
  });
  if (giusto) return;
  for (const x of suColonna) {
    await c.query(`ALTER TABLE "${tabella}" DROP CONSTRAINT "${String(x.conname).replace(/"/g, '""')}"`);
  }
  await c.query(`ALTER TABLE "${tabella}" ADD CONSTRAINT "${nome}"
                   CHECK ("${colonna}" BETWEEN ${min} AND ${max})`);
}

const COLONNE_UTENTE: [string, string][] = [
  ['subscriptionStatus', `subscription_status NOT NULL DEFAULT 'none'`],
  ['subscriptionUntil', 'TIMESTAMPTZ'],
  ['subscriptionTier', 'SMALLINT NOT NULL DEFAULT 0'],
  ['subscriptionPeriod', 'TEXT'],
  ['stripeCustomerId', 'TEXT'],
  ['stripeSubscriptionId', 'TEXT'],
  ['subscriptionCancelAt', 'TIMESTAMPTZ'],
  ['subscriptionTrialEnd', 'TIMESTAMPTZ'],
  ['trialUsedAt', 'TIMESTAMPTZ'],
];

/** Lo schema degli abbonamenti (lo stesso di marketplace_abbonamenti.sql),
 *  toccando solo ciò che manca. */
async function schema(c: any): Promise<void> {
  if (!(await esiste(c, 'AppSetting'))) {
    await c.query(`CREATE TABLE "AppSetting" (
        chiave      TEXT PRIMARY KEY,
        valore      TEXT NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedBy" TEXT)`);
  }
  const tipo = await c.query(`SELECT 1 FROM pg_type WHERE typname = 'subscription_status'`);
  if (!tipo.rows.length) {
    await c.query(`CREATE TYPE subscription_status AS ENUM
                     ('none', 'subscribed', 'past_due', 'cancelled')`);
  }
  if (await esiste(c, 'User')) {
    const ci = await colonne(c, 'User');
    for (const [nome, tipoCol] of COLONNE_UTENTE) {
      if (!ci.has(nome)) {
        await c.query(`ALTER TABLE "User" ADD COLUMN "${nome}" ${tipoCol}`);
      }
    }
    await vincoloLivelli(c, 'User', 'subscriptionTier', 'User_subscriptionTier_range', 0, 4);
    const idx = await c.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'User'`);
    const ix = new Set(idx.rows.map((x: any) => String(x.indexname)));
    if (!ix.has('User_subscription_idx')) {
      await c.query(`CREATE INDEX "User_subscription_idx" ON "User" ("subscriptionStatus")
                       WHERE "subscriptionStatus" <> 'none'`);
    }
    if (!ix.has('User_stripeSubscription_idx')) {
      await c.query(`CREATE INDEX "User_stripeSubscription_idx" ON "User" ("stripeSubscriptionId")
                       WHERE "stripeSubscriptionId" IS NOT NULL`);
    }
    if (!ix.has('User_stripeCustomer_idx')) {
      await c.query(`CREATE INDEX "User_stripeCustomer_idx" ON "User" ("stripeCustomerId")
                       WHERE "stripeCustomerId" IS NOT NULL`);
    }
  }
  if (!(await esiste(c, 'SubscriptionPlan'))) {
    await c.query(`CREATE TABLE "SubscriptionPlan" (
        tier              SMALLINT PRIMARY KEY,
        code              TEXT        NOT NULL UNIQUE,
        name              TEXT        NOT NULL,
        tagline           TEXT        NOT NULL DEFAULT '',
        "monthlyCents"    INTEGER     NOT NULL CHECK ("monthlyCents" >= 0),
        "annualCents"     INTEGER     NOT NULL CHECK ("annualCents"  >= 0),
        currency          TEXT        NOT NULL DEFAULT 'EUR',
        features          JSONB       NOT NULL DEFAULT '{}'::jsonb,
        active            BOOLEAN     NOT NULL DEFAULT TRUE,
        "stripeProductId" TEXT,
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedBy"       TEXT)`);
  } else if (!(await colonne(c, 'SubscriptionPlan')).has('stripeProductId')) {
    await c.query(`ALTER TABLE "SubscriptionPlan" ADD COLUMN "stripeProductId" TEXT`);
  }
  const max = Math.max(...CATALOGO.map((p) => p.tier));
  await vincoloLivelli(c, 'SubscriptionPlan', 'tier', 'SubscriptionPlan_tier_range', 1, max);
  if (!(await esiste(c, 'SubscriptionPayment'))) {
    await c.query(`CREATE TABLE "SubscriptionPayment" (
        id             TEXT        PRIMARY KEY,
        "userId"       TEXT        NOT NULL,
        tier           SMALLINT    NOT NULL,
        period         TEXT        NOT NULL,
        "amountCents"  INTEGER     NOT NULL,
        currency       TEXT        NOT NULL DEFAULT 'EUR',
        status         TEXT        NOT NULL,
        provider       TEXT        NOT NULL DEFAULT 'stripe',
        "providerRef"  TEXT        UNIQUE,
        "periodStart"  TIMESTAMPTZ,
        "periodEnd"    TIMESTAMPTZ,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await c.query(`CREATE INDEX "SubscriptionPayment_user_idx"
                     ON "SubscriptionPayment" ("userId", "createdAt" DESC)`);
  }
  // Il lucchetto del marketplace: se manca nasce chiuso (o aperto, se lo
  // era il vecchio interruttore degli artefatti a pagamento). Come nel file SQL.
  await c.query(
    `INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
     SELECT 'marketplace_locked',
            CASE WHEN lower(COALESCE(
                   (SELECT valore FROM "AppSetting" WHERE chiave = 'paid_artifacts_enabled'),
                   'false')) = 'true' THEN 'false' ELSE 'true' END,
            'sito: lib/allineaCatalogo.ts'
     ON CONFLICT (chiave) DO NOTHING`);
}

async function scrivi(pool: any): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // Più istanze del sito possono arrivare qui insieme: una alla volta, e
    // chi arriva dopo ritrova il lavoro fatto.
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('lyra:subscription_catalog'))`);
    if (await confronta(c)) {
      // un'altra istanza ha appena finito: niente da riscrivere
      await c.query('COMMIT');
      return;
    }
    await schema(c);

    // Desk dal livello 3 al 4 (catalogo vecchio), con abbonati e storico.
    const tre = await c.query(`SELECT code FROM "SubscriptionPlan" WHERE tier = 3`);
    if (tre.rows[0]?.code === 'desk') {
      await c.query(`DELETE FROM "SubscriptionPlan" WHERE tier = 4`);
      await c.query(`UPDATE "SubscriptionPlan" SET tier = 4 WHERE tier = 3`);
      if (await esiste(c, 'User')) {
        await c.query(`UPDATE "User" SET "subscriptionTier" = 4 WHERE "subscriptionTier" = 3`);
      }
      await c.query(`UPDATE "SubscriptionPayment" SET tier = 4 WHERE tier = 3`);
    }

    // Un codice del catalogo che oggi sta su un altro livello (un catalogo
    // riordinato): il vincolo UNIQUE sul codice fermerebbe la scrittura, quindi
    // prima lo si libera. Il livello giusto lo riceve subito dopo.
    for (const p of CATALOGO) {
      await c.query(
        `UPDATE "SubscriptionPlan" SET code = code || '~' || tier
          WHERE code = $1 AND tier <> $2`, [p.code, p.tier]);
    }

    const chi = `catalogo ${IMPRONTA_CATALOGO}`;
    for (const p of CATALOGO) {
      await c.query(
        `INSERT INTO "SubscriptionPlan" AS s
           (tier, code, name, tagline, "monthlyCents", "annualCents", currency,
            features, active, "updatedAt", "updatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, TRUE, NOW(), $9)
         ON CONFLICT (tier) DO UPDATE SET
           code           = EXCLUDED.code,
           name           = EXCLUDED.name,
           tagline        = EXCLUDED.tagline,
           "monthlyCents" = EXCLUDED."monthlyCents",
           "annualCents"  = EXCLUDED."annualCents",
           currency       = EXCLUDED.currency,
           features       = EXCLUDED.features,
           active         = TRUE,
           "stripeProductId" = CASE WHEN s.code = EXCLUDED.code
                                    THEN s."stripeProductId" ELSE NULL END,
           "updatedAt"    = NOW(),
           "updatedBy"    = EXCLUDED."updatedBy"`,
        [p.tier, p.code, p.name, p.tagline, p.monthlyCents, p.annualCents,
         p.currency, JSON.stringify(p.features), chi]);
    }
    // Un livello che il catalogo non ha più non si vende.
    await c.query(
      `UPDATE "SubscriptionPlan" SET active = FALSE, "updatedAt" = NOW(), "updatedBy" = $2
        WHERE NOT (tier = ANY($1::smallint[])) AND active`,
      [CATALOGO.map((p) => p.tier), chi]);

    const m = await c.query(
      `INSERT INTO "AppSetting"(chiave, valore, "updatedBy")
       VALUES ($1, $2, 'sito: lib/catalogo.ts')
       ON CONFLICT (chiave) DO UPDATE SET
         valore = EXCLUDED.valore, "updatedAt" = NOW(), "updatedBy" = EXCLUDED."updatedBy"
       RETURNING "updatedAt"`, [CHIAVE, IMPRONTA_CATALOGO]);
    await c.query('COMMIT');
    scritto = true;
    quando = m.rows[0]?.updatedAt ? new Date(m.rows[0].updatedAt).toISOString() : null;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
