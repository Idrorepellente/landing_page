/**
 * lib/betaAccount.ts — gli account della beta: li crea il sistema, li invita
 * il pannello.
 *
 * COME FUNZIONA, da questa versione
 * ---------------------------------
 *   1. Ogni richiesta dal form del sito («Entra nella beta») CREA L'ACCOUNT
 *      di quell'indirizzo, con una password generata a caso. Prima lasciava
 *      solo un indirizzo, e il primo accesso passava da «password
 *      dimenticata»: un percorso che nessuno trovava da solo.
 *   2. Con la beta attiva gli account sono al più `beta_account_limit` (405
 *      se non è impostato): contati TUTTI gli account del sistema, perché il
 *      limite serve a contenere il caso peggiore di carico sul database.
 *      Oltre il limite la richiesta resta registrata ma l'account non nasce
 *      (`beta_signups.esito = 'lista'`).
 *   3. L'amministratore può aggiungere un account dall'app anche oltre il
 *      limite: il limite resta, quegli account si aggiungono lo stesso.
 *   4. «Invite all» nel pannello dà inizio alla beta: a ogni account manda il
 *      link per scaricare l'app, l'indirizzo e la prima password. Da quel
 *      momento chi riceve un account (da una richiesta o dal pannello) riceve
 *      l'invito subito.
 *   5. Al primo accesso con la password dell'email l'app chiede di sceglierne
 *      una propria: il sito non rilascia il token finché non lo si fa (vedi
 *      /api/app/login e /api/app/login/password). La password dell'email
 *      smette così di valere, e la sua copia cifrata si cancella.
 *
 * PERCHÉ LA PASSWORD SI CONSERVA CIFRATA
 * --------------------------------------
 * Una password si verifica con un'impronta bcrypt, che non si può invertire.
 * Ma qui la password va anche SPEDITA, e non subito: l'invito parte quando
 * l'amministratore preme «Invite all», giorni o settimane dopo la richiesta.
 * Fino ad allora la si tiene cifrata (AES-256-GCM, chiave derivata da
 * APP_TOKEN_SECRET con un'etichetta propria: chi ha il database non ha la
 * chiave, chi ha la chiave non ha il database). Si cancella appena l'utente
 * sceglie la sua.
 *
 * LE RICHIESTE ARRIVATE PRIMA DI QUESTA VERSIONE
 * ----------------------------------------------
 * Hanno un indirizzo e nessun account. La prima volta che un'istanza del sito
 * tocca la beta le prepara tutte, nell'ordine in cui sono arrivate e con lo
 * stesso limite: l'account nasce con un'impronta che nessuna password apre
 * (`HASH_IN_ATTESA`, come `$google$` per gli account di Google), e la password
 * vera si genera al momento dell'invito. Generarla ora vorrebbe dire calcolare
 * centinaia di impronte bcrypt in una sola richiesta.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/pg';
import { nomeUtenteLibero, nuovoId } from '@/lib/utenti';
import { inviaEmailEsito, postaConfigurata, trasportoCondiviso } from '@/lib/mailer';
import {
  ammessoInBeta, BETA_IN_LISTA, BETA_NON_AMMESSO, BETA_SENZA_ACCOUNT,
} from '@/lib/beta';

export const LIMITE_PREDEFINITO = 405;

/** Nessuna password apre questo account: bcrypt vuole 60 caratteri. */
export const HASH_IN_ATTESA = '$beta$';

/** Quanto vale il passaggio per scegliere la password dopo il primo accesso. */
export const PASSAGGIO_PASSWORD_MS = 30 * 60 * 1000;

export type Origine = 'richiesta' | 'admin' | 'esistente';

export type Impostazioni = {
  attiva: boolean;
  limite: number;
  link: string;
  iniziataIl: string | null;
};

// ===========================================================================
//  SCHEMA
// ===========================================================================

let pronto = false;
let inCorso: Promise<void> | null = null;

/**
 * Tabelle e colonne della beta, e la preparazione delle richieste vecchie.
 * Una volta per istanza; le istanze che partono insieme si mettono in fila
 * dietro un lucchetto di Postgres.
 */
export async function preparaBeta(db?: any): Promise<void> {
  if (pronto) return;
  if (inCorso) return inCorso;
  const pool = db || getPool();
  inCorso = (async () => {
    if (!(await schemaCompleto(pool))) await creaSchema(pool);
    await preparaRichiestePendenti(pool);
    pronto = true;
  })();
  try {
    await inCorso;
  } finally {
    inCorso = null;
  }
}

/** Per le prove: dimentica cio' che questa istanza sa. */
export function _dimentica(): void {
  pronto = false;
  inCorso = null;
}

async function schemaCompleto(db: any): Promise<boolean> {
  const r = await db.query(
    `SELECT to_regclass('"BetaAccount"') AS conti,
            to_regclass('"BetaAccess"') AS inviti,
            to_regclass('"AppSetting"') AS imp,
            EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'beta_signups' AND column_name = 'esito') AS esito,
            EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'BetaAccount' AND column_name = 'inviteAttemptAt') AS tentativo`);
  const x = r.rows[0] || {};
  return !!(x.conti && x.inviti && x.imp && x.esito && x.tentativo);
}

async function creaSchema(db: any): Promise<void> {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('lyra:beta-schema'))`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS "AppSetting" (
        chiave      TEXT PRIMARY KEY,
        valore      TEXT NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedBy" TEXT)`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS beta_signups (
        id         serial PRIMARY KEY,
        email      text UNIQUE NOT NULL,
        profile    text,
        created_at timestamptz NOT NULL DEFAULT now())`);
    // esito: 'account' (creato), 'esistente' (c'era gia'), 'lista' (oltre il
    // limite), NULL (non ancora deciso: le richieste di prima)
    await c.query(`
      ALTER TABLE beta_signups
        ADD COLUMN IF NOT EXISTS esito    TEXT,
        ADD COLUMN IF NOT EXISTS "userId" TEXT,
        ADD COLUMN IF NOT EXISTS esito_il TIMESTAMPTZ`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS "BetaAccess" (
        email     TEXT PRIMARY KEY,
        "addedBy" TEXT NOT NULL,
        "addedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        nota      TEXT)`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS "BetaAccount" (
        email               TEXT PRIMARY KEY,
        "userId"            TEXT NOT NULL,
        origine             TEXT NOT NULL,
        "passwordCifrata"   TEXT,
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "createdBy"         TEXT,
        "invitedAt"         TIMESTAMPTZ,
        inviti              INT NOT NULL DEFAULT 0,
        "inviteError"       TEXT,
        "inviteClaim"       TIMESTAMPTZ,
        "inviteAttemptAt"   TIMESTAMPTZ,
        "passwordChangedAt" TIMESTAMPTZ)`);
    await c.query(`ALTER TABLE "BetaAccount"
                     ADD COLUMN IF NOT EXISTS "inviteAttemptAt" TIMESTAMPTZ`);
    await c.query(`CREATE INDEX IF NOT EXISTS "BetaAccount_user_idx" ON "BetaAccount" ("userId")`);
    await c.query(`CREATE INDEX IF NOT EXISTS "BetaAccount_daInvitare_idx"
                     ON "BetaAccount" ("createdAt") WHERE "invitedAt" IS NULL`);
    await c.query(`COMMENT ON TABLE "BetaAccount" IS
      'Account della beta creati dal sistema (richieste dal sito, pannello) e il loro invito. '
      'passwordCifrata: la prima password, cifrata, finche'' l''utente non ne sceglie una sua.'`);
    await c.query('COMMIT');
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { /* niente */ }
    throw e;
  } finally {
    c.release();
  }
}

// ===========================================================================
//  IMPOSTAZIONI
// ===========================================================================

const CHIAVI = ['beta_enabled', 'beta_account_limit', 'beta_download_url', 'beta_started_at'];

export async function impostazioni(db?: any): Promise<Impostazioni> {
  const pool = db || getPool();
  const out: Impostazioni = { attiva: false, limite: LIMITE_PREDEFINITO, link: '', iniziataIl: null };
  try {
    const r = await pool.query(
      'SELECT chiave, valore FROM "AppSetting" WHERE chiave = ANY($1::text[])', [CHIAVI]);
    for (const x of r.rows) {
      const v = String(x.valore ?? '');
      if (x.chiave === 'beta_enabled') out.attiva = v.toLowerCase() === 'true';
      if (x.chiave === 'beta_account_limit') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) out.limite = n;
      }
      if (x.chiave === 'beta_download_url') out.link = v.trim();
      if (x.chiave === 'beta_started_at') out.iniziataIl = v || null;
    }
  } catch {
    // Tabella assente: valgono i predefiniti, e la beta risulta spenta come
    // per lib/beta.ts. Un controllo che non si puo' eseguire non deve
    // diventare un blocco.
  }
  return out;
}

export async function salvaImpostazione(db: any, chiave: string, valore: string,
                                        chi: string): Promise<void> {
  await db.query(
    `INSERT INTO "AppSetting"(chiave, valore, "updatedBy") VALUES ($1, $2, $3)
     ON CONFLICT (chiave) DO UPDATE SET valore = EXCLUDED.valore,
       "updatedAt" = NOW(), "updatedBy" = EXCLUDED."updatedBy"`,
    [chiave, valore, chi || 'admin']);
}

/** Un link di download accettabile: http(s), un host, niente spazi. */
export function linkValido(link: string): boolean {
  const s = String(link || '').trim();
  if (!s || s.length > 600 || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname;
  } catch {
    return false;
  }
}

// ===========================================================================
//  LA PASSWORD
// ===========================================================================

// Senza i caratteri che si confondono leggendo un'email (I l 1, O 0): la
// password si copia a mano, e un carattere ambiguo vuol dire un accesso che
// fallisce senza che l'utente capisca perche'.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * Sedici caratteri casuali in quattro gruppi: «Xk7p-9QmR-v2Tz-Hn4W».
 *
 * Circa 93 bit di casualita'. Contiene sempre una maiuscola, una minuscola,
 * una cifra e un segno (il trattino): passa le regole di qualunque modulo che
 * le chieda, oltre a quella dell'app (almeno 8 caratteri). I trattini rendono
 * la lettura e la copiatura meno soggette a errori.
 */
export function generaPassword(): string {
  for (;;) {
    let s = '';
    for (let i = 0; i < 16; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)];
    if (/[A-Z]/.test(s) && /[a-z]/.test(s) && /[2-9]/.test(s)) {
      return [s.slice(0, 4), s.slice(4, 8), s.slice(8, 12), s.slice(12)].join('-');
    }
  }
}

const PREFISSO = 'bp1.';

function chiave(): Buffer {
  const base = (process.env.APP_TOKEN_SECRET || '').trim();
  if (!base) throw new Error('APP_TOKEN_SECRET is not set on the site');
  // una chiave PROPRIA, derivata con un'etichetta: il segreto dei token non
  // si usa due volte per due scopi diversi
  return crypto.createHmac('sha256', base).update('lyra:beta-credenziali:v1').digest();
}

export function cifraPassword(p: string): string {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chiave(), nonce);
  const dato = Buffer.concat([c.update(p, 'utf8'), c.final()]);
  return PREFISSO + Buffer.concat([nonce, c.getAuthTag(), dato]).toString('base64');
}

/** null se il valore non si decifra (chiave cambiata, dato rovinato). */
export function decifraPassword(v: string | null | undefined): string | null {
  if (!v || !v.startsWith(PREFISSO)) return null;
  try {
    const b = Buffer.from(v.slice(PREFISSO.length), 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', chiave(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ===========================================================================
//  CREARE GLI ACCOUNT
// ===========================================================================

export type Esito = 'creato' | 'esistente' | 'lista';

type Opzioni = {
  origine: 'richiesta' | 'admin';
  hash: string;
  cifrata: string | null;
  rispettaLimite: boolean;
  chi?: string;
};

/** Dentro una transazione gia' aperta, con il lucchetto preso. */
async function decidiAccount(c: any, email: string, o: Opzioni):
    Promise<{ esito: Esito; userId?: string }> {
  const u = await c.query('SELECT id FROM "User" WHERE lower(email) = $1 LIMIT 1', [email]);
  if (u.rows[0]) {
    const userId = String(u.rows[0].id);
    // L'account c'era gia' (registrato prima della beta, o con Google): non
    // se ne crea un altro e non si tocca la sua password. Si ricorda solo che
    // fa parte della beta, perche' l'invito gli arrivi — senza credenziali.
    await c.query(
      `INSERT INTO "BetaAccount"(email, "userId", origine, "createdBy")
       VALUES ($1, $2, 'esistente', $3) ON CONFLICT (email) DO NOTHING`,
      [email, userId, o.chi || o.origine]);
    return { esito: 'esistente', userId };
  }
  if (o.rispettaLimite) {
    const imp = await impostazioni(c);
    if (imp.attiva) {
      const n = Number((await c.query('SELECT COUNT(*)::int AS n FROM "User"')).rows[0]?.n || 0);
      if (n >= imp.limite) return { esito: 'lista' };
    }
  }
  const id = nuovoId();
  const username = await nomeUtenteLibero(c, email);
  await c.query(
    'INSERT INTO "User"(id, email, username, "passwordHash", "displayName", "createdAt") '
    + 'VALUES ($1, $2, $3, $4, $5, now())',
    [id, email, username, o.hash, username]);
  await c.query(
    `INSERT INTO "BetaAccount"(email, "userId", origine, "passwordCifrata", "createdBy")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET "userId" = EXCLUDED."userId",
       origine = EXCLUDED.origine, "passwordCifrata" = EXCLUDED."passwordCifrata",
       "createdBy" = EXCLUDED."createdBy", "createdAt" = NOW(),
       "invitedAt" = NULL, inviti = 0, "inviteError" = NULL, "inviteClaim" = NULL,
       "inviteAttemptAt" = NULL, "passwordChangedAt" = NULL`,
    [email, id, o.origine, o.cifrata, o.chi || o.origine]);
  return { esito: 'creato', userId: id };
}

/** Una transazione con il lucchetto degli account della beta. */
async function conLucchetto<T>(db: any, fn: (c: any) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    // Conteggio e inserimento devono essere un passo solo: due richieste
    // simultanee al 404° account ne creerebbero 406.
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('lyra:beta-account'))`);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { /* niente */ }
    throw e;
  } finally {
    c.release();
  }
}

const ESITO_RICHIESTA: Record<Esito, string> = {
  creato: 'account', esistente: 'esistente', lista: 'lista',
};

/**
 * Le richieste arrivate prima di questa versione (esito NULL) e gli inviti
 * aggiunti dal pannello senza un account: si preparano tutti, in ordine.
 * Veloce: nessuna impronta bcrypt (vedi l'intestazione del file).
 */
async function preparaRichiestePendenti(db: any): Promise<number> {
  const quante = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM beta_signups WHERE esito IS NULL)
          + (SELECT COUNT(*)::int FROM "BetaAccess" a
              WHERE NOT EXISTS (SELECT 1 FROM "BetaAccount" b WHERE b.email = a.email))
          AS n`);
  if (!Number(quante.rows[0]?.n || 0)) return 0;
  return conLucchetto(db, async (c) => {
    let fatte = 0;
    const richieste = await c.query(
      'SELECT id, lower(email) AS email FROM beta_signups WHERE esito IS NULL ORDER BY created_at, id');
    for (const r of richieste.rows) {
      const x = await decidiAccount(c, String(r.email), {
        origine: 'richiesta', hash: HASH_IN_ATTESA, cifrata: null, rispettaLimite: true,
      });
      await c.query(
        'UPDATE beta_signups SET esito = $2, "userId" = $3, esito_il = NOW() WHERE id = $1',
        [r.id, ESITO_RICHIESTA[x.esito], x.userId || null]);
      fatte++;
    }
    // Gli inviti del pannello sono una scelta dell'amministratore: come gli
    // account aggiunti da lui, non rispettano il limite.
    const inviti = await c.query(
      `SELECT lower(a.email) AS email, a."addedBy" FROM "BetaAccess" a
        WHERE NOT EXISTS (SELECT 1 FROM "BetaAccount" b WHERE b.email = lower(a.email))
        ORDER BY a."addedAt"`);
    for (const r of inviti.rows) {
      await decidiAccount(c, String(r.email), {
        origine: 'admin', hash: HASH_IN_ATTESA, cifrata: null, rispettaLimite: false,
        chi: String(r.addedBy || 'admin'),
      });
      fatte++;
    }
    return fatte;
  });
}

export type EsitoRichiesta = {
  esito: Esito | 'gia';
  /** Per 'gia': com'era andata la richiesta precedente. */
  stato?: string | null;
  invito?: EsitoInvio | null;
};

/**
 * Una richiesta dal form del sito. Registra la richiesta e, se si puo', crea
 * l'account; con la beta gia' iniziata manda subito l'invito.
 */
export async function registraRichiesta(email: string, profilo: string | null,
                                        db?: any): Promise<EsitoRichiesta> {
  const pool = db || getPool();
  await preparaBeta(pool);
  const e = String(email || '').trim().toLowerCase();
  const ins = await pool.query(
    'INSERT INTO beta_signups (email, profile) VALUES ($1, $2) '
    + 'ON CONFLICT (email) DO NOTHING RETURNING id', [e, profilo]);
  if (!ins.rows[0]) {
    // La stessa persona che preme due volte, o che torna dopo una settimana:
    // la richiesta c'e' gia', e non deve produrre un secondo account ne' un
    // posto in piu'.
    const s = await pool.query('SELECT esito FROM beta_signups WHERE email = $1', [e]);
    return { esito: 'gia', stato: s.rows[0]?.esito ?? null };
  }
  const id = ins.rows[0].id;

  // La password e la sua impronta si preparano PRIMA del lucchetto: bcrypt
  // impiega qualche centinaio di millisecondi, e il lucchetto deve durare
  // solo il tempo di contare e inserire.
  const pw = generaPassword();
  const hash = await bcrypt.hash(pw, 12);
  const cifrata = cifraPassword(pw);

  const x = await conLucchetto(pool, async (c) => {
    const r = await decidiAccount(c, e, {
      origine: 'richiesta', hash, cifrata, rispettaLimite: true,
    });
    await c.query(
      'UPDATE beta_signups SET esito = $2, "userId" = $3, esito_il = NOW() WHERE id = $1',
      [id, ESITO_RICHIESTA[r.esito], r.userId || null]);
    return r;
  });

  let invito: EsitoInvio | null = null;
  if (x.esito === 'creato') invito = await invitaSeIniziata(pool, e);
  return { esito: x.esito, invito };
}

/**
 * Un account aggiunto dal pannello. Nessun limite: e' una scelta
 * dell'amministratore. L'indirizzo entra anche fra gli ammessi della beta.
 */
export async function aggiungiDaPannello(email: string, chi: string, db?: any):
    Promise<{ esito: Esito; invito: EsitoInvio | null }> {
  const pool = db || getPool();
  await preparaBeta(pool);
  const e = String(email || '').trim().toLowerCase();
  const pw = generaPassword();
  const hash = await bcrypt.hash(pw, 12);
  const cifrata = cifraPassword(pw);
  const x = await conLucchetto(pool, async (c) => {
    await c.query(
      `INSERT INTO "BetaAccess"(email, "addedBy", nota) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET "addedBy" = EXCLUDED."addedBy"`,
      [e, chi || 'admin', 'aggiunto dal pannello']);
    return decidiAccount(c, e, {
      origine: 'admin', hash, cifrata, rispettaLimite: false, chi: chi || 'admin',
    });
  });
  const invito = x.esito === 'lista' ? null : await invitaSeIniziata(pool, e);
  return { esito: x.esito, invito };
}

/**
 * Toglie un indirizzo dagli inviti del pannello. Se l'account l'aveva creato
 * il pannello e nessuno l'ha mai ricevuto ne' usato, si toglie anche quello:
 * e' l'esatto contrario di «aggiungi». Un account gia' invitato resta (chi lo
 * ha ricevuto ha delle credenziali): perde solo l'ammissione alla beta.
 */
export async function togliDalPannello(email: string, db?: any):
    Promise<{ tolto: boolean; accountTolto: boolean }> {
  const pool = db || getPool();
  await preparaBeta(pool);
  const e = String(email || '').trim().toLowerCase();
  return conLucchetto(pool, async (c) => {
    const r = await c.query('DELETE FROM "BetaAccess" WHERE email = $1', [e]);
    const b = await c.query(
      `SELECT "userId", origine FROM "BetaAccount"
        WHERE email = $1 AND "invitedAt" IS NULL AND "passwordChangedAt" IS NULL`, [e]);
    let accountTolto = false;
    const riga = b.rows[0];
    // l'account resta se l'indirizzo e' anche fra le richieste dal sito: la
    // richiesta vale da sola
    const ancheRichiesta = await c.query('SELECT 1 FROM beta_signups WHERE email = $1', [e]);
    if (riga && !ancheRichiesta.rows[0]) {
      await c.query('DELETE FROM "BetaAccount" WHERE email = $1', [e]);
      if (riga.origine === 'admin') {
        await c.query('DELETE FROM "User" WHERE id = $1', [riga.userId]);
        accountTolto = true;
      }
    }
    return { tolto: (r.rowCount || 0) > 0, accountTolto };
  });
}

// ===========================================================================
//  IL PRIMO ACCESSO
// ===========================================================================

/** Vero se l'account sta ancora usando la password arrivata per email. */
export async function primaPasswordInUso(db: any, userId: string): Promise<boolean> {
  try {
    const r = await db.query(
      `SELECT 1 FROM "BetaAccount" WHERE "userId" = $1 AND origine <> 'esistente'
          AND "passwordChangedAt" IS NULL LIMIT 1`, [userId]);
    return !!r.rows[0];
  } catch {
    return false;      // tabella assente: nessun account della beta
  }
}

/**
 * La password e' cambiata, da qualunque strada: la prima password non vale
 * piu', e la sua copia cifrata si cancella. Non solleva mai.
 */
export async function passwordCambiata(db: any, userId: string): Promise<void> {
  try {
    await db.query(
      `UPDATE "BetaAccount" SET "passwordChangedAt" = NOW(), "passwordCifrata" = NULL
        WHERE "userId" = $1 AND "passwordChangedAt" IS NULL`, [userId]);
  } catch { /* tabella assente: niente da fare */ }
}

// ===========================================================================
//  GLI INVITI
// ===========================================================================

export type EsitoInvio = { email: string; ok: boolean; errore?: string; conPassword: boolean };

type Riga = {
  email: string; userId: string; origine: string;
  passwordCifrata: string | null; passwordChangedAt: any;
};

/**
 * La password da scrivere nell'invito, o null se l'account ne ha gia' una
 * sua. Se manca (account preparato dalle richieste di prima) o non si
 * decifra piu' (segreto del sito cambiato), se ne genera una nuova: finche'
 * l'utente non e' entrato, nessuno conosce quella vecchia.
 */
async function passwordPerInvito(db: any, r: Riga): Promise<string | null> {
  if (r.origine === 'esistente' || r.passwordChangedAt) return null;
  const letta = decifraPassword(r.passwordCifrata);
  if (letta) return letta;
  const pw = generaPassword();
  const hash = await bcrypt.hash(pw, 12);
  await db.query('UPDATE "User" SET "passwordHash" = $2 WHERE id = $1', [r.userId, hash]);
  await db.query('UPDATE "BetaAccount" SET "passwordCifrata" = $2 WHERE email = $1',
                 [r.email, cifraPassword(pw)]);
  return pw;
}

function esc(t: string): string {
  return String(t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/**
 * Il testo dell'invito. In italiano, come il form da cui arrivano le
 * richieste, con una parte in inglese: l'app e' in inglese, e chi e' stato
 * aggiunto dal pannello puo' non parlare italiano.
 */
export function emailInvito(d: { email: string; password: string | null; link: string;
                                 anteprima?: boolean }): { oggetto: string; testo: string; html: string } {
  const pw = d.password;
  const oggetto = (d.anteprima ? '[Anteprima] ' : '')
    + 'Lyra · il tuo accesso alla beta (your beta access)';
  const passoAccesso = pw
    ? 'Aprila e premi «Sign in»: entra con l\'email e la password qui sotto. '
      + 'Al primo accesso l\'app ti chiede di sceglierne una tua: questa serve solo '
      + 'per entrare la prima volta.'
    : 'Aprila e premi «Sign in»: entra con questo indirizzo e la password che usi '
      + 'già. Non la ricordi? Nell\'app: «Forgotten your password?».';
  const passoEn = pw
    ? 'Open it and press «Sign in» with the email and password above. On your first '
      + 'sign-in the app asks you to choose your own password: this one only works once.'
    : 'Open it and press «Sign in» with this address and the password you already use '
      + '(forgot it? «Forgotten your password?» in the app).';

  const testo = [
    'La beta di Lyra è aperta, e tu sei dentro.',
    '',
    `1. Scarica l'app: ${d.link}`,
    `2. ${passoAccesso}`,
    '',
    `   Email:    ${d.email}`,
    ...(pw ? [`   Password: ${pw}`] : []),
    '',
    'Hai domande o qualcosa non va? Rispondi a questa email.',
    '',
    '— English —',
    'Lyra\'s beta is open and you are in.',
    `1. Download the app: ${d.link}`,
    `2. ${passoEn}`,
    '',
    'Hai ricevuto questa email perché il tuo indirizzo è stato iscritto alla beta di '
      + 'Lyra. Se non sei stato tu, ignorala: l\'account non verrà usato.',
  ].join('\n');

  const riga = (k: string, v: string, mono = false) =>
    `<tr><td style="padding:7px 14px 7px 0;color:#6b7280;font-size:13px;white-space:nowrap">${k}</td>`
    + `<td style="padding:7px 0;font-size:15px;${mono
      ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.04em;font-weight:600'
      : 'font-weight:600'}">${esc(v)}</td></tr>`;

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:8px 4px;color:#18181b;line-height:1.55">
  <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Lyra · Beta</p>
  <h2 style="margin:0 0 18px;font-size:21px;line-height:1.3">La beta di Lyra è aperta, e tu sei dentro.</h2>
  <p style="margin:0 0 10px;font-size:15px"><b>1.</b> Scarica l'app.</p>
  <p style="margin:0 0 18px"><a href="${esc(d.link)}" style="display:inline-block;padding:11px 20px;background:#1800ac;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Scarica Lyra</a></p>
  <p style="margin:0 0 10px;font-size:15px"><b>2.</b> ${esc(passoAccesso)}</p>
  <table style="border-collapse:collapse;margin:4px 0 18px;padding:12px 16px;background:#f5f6f8;border-radius:8px;display:block">
    ${riga('Email', d.email)}
    ${pw ? riga('Password', pw, true) : ''}
  </table>
  <p style="margin:0 0 18px;font-size:13px;color:#6b7280">Se il pulsante non si apre, copia questo indirizzo nel browser:<br><span style="word-break:break-all">${esc(d.link)}</span></p>
  <p style="margin:0 0 22px;font-size:14px">Hai domande o qualcosa non va? Rispondi a questa email.</p>
  <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:13px;color:#4b5563">
    <p style="margin:0 0 6px"><b>English</b> — Lyra's beta is open and you are in.</p>
    <p style="margin:0 0 6px">1. Download the app with the button above.</p>
    <p style="margin:0">2. ${esc(passoEn)}</p>
  </div>
  <p style="margin:22px 0 0;font-size:11px;color:#9aa1ab">Hai ricevuto questa email perché il tuo indirizzo è stato iscritto alla beta di Lyra. Se non sei stato tu, ignorala: l'account non verrà usato.</p>
</div>`;
  return { oggetto, testo, html };
}

async function spedisci(db: any, r: Riga, link: string,
                        trasporto?: ReturnType<typeof trasportoCondiviso>): Promise<EsitoInvio> {
  let password: string | null = null;
  try {
    password = await passwordPerInvito(db, r);
  } catch (e: any) {
    const errore = 'password not available: ' + String(e?.message || e);
    await db.query(
      `UPDATE "BetaAccount" SET "inviteError" = $2, "inviteClaim" = NULL WHERE email = $1`,
      [r.email, errore]);
    return { email: r.email, ok: false, errore, conPassword: false };
  }
  const m = emailInvito({ email: r.email, password, link });
  const x = await inviaEmailEsito(r.email, m.oggetto, m.testo, m.html, trasporto);
  if (x.ok) {
    await db.query(
      `UPDATE "BetaAccount" SET "invitedAt" = NOW(), inviti = inviti + 1,
         "inviteError" = NULL, "inviteClaim" = NULL WHERE email = $1`, [r.email]);
  } else {
    await db.query(
      `UPDATE "BetaAccount" SET "inviteError" = $2, "inviteClaim" = NULL WHERE email = $1`,
      [r.email, x.errore || 'not sent']);
  }
  return { email: r.email, ok: x.ok, errore: x.errore, conPassword: !!password };
}

/** Dopo che la beta e' iniziata, un account nuovo riceve l'invito subito. */
async function invitaSeIniziata(db: any, email: string): Promise<EsitoInvio | null> {
  const imp = await impostazioni(db);
  if (!imp.iniziataIl || !linkValido(imp.link)) return null;
  return invitaUno(email, db);
}

/** L'invito a un indirizzo, anche gia' invitato (il «Resend» del pannello). */
export async function invitaUno(email: string, db?: any): Promise<EsitoInvio> {
  const pool = db || getPool();
  await preparaBeta(pool);
  const e = String(email || '').trim().toLowerCase();
  const imp = await impostazioni(pool);
  if (!linkValido(imp.link)) {
    return { email: e, ok: false, conPassword: false, errore: 'the download link is not set' };
  }
  const r = await pool.query(
    `UPDATE "BetaAccount" b SET "inviteAttemptAt" = NOW()
       FROM "User" u
      WHERE b.email = $1 AND u.id = b."userId"
      RETURNING b.email, b."userId", b.origine, b."passwordCifrata", b."passwordChangedAt"`, [e]);
  if (!r.rows[0]) {
    return { email: e, ok: false, conPassword: false, errore: 'this address has no beta account' };
  }
  return spedisci(pool, r.rows[0] as Riga, imp.link);
}

export type RisultatoLotto = {
  ok: boolean;
  error?: string;
  inviati: number;
  falliti: number;
  restanti: number;
  errori: Array<{ email: string; errore: string }>;
  fermato?: string;
  iniziataIl?: string | null;
};

/**
 * Un lotto di inviti. Il pannello li chiede uno dopo l'altro finche'
 * `restanti` arriva a zero: un lotto solo per centinaia di email non
 * starebbe nel tempo concesso a una funzione del sito.
 *
 * `inizio` e' l'ora in cui il pannello ha cominciato: ogni account si prova
 * UNA volta per giro, cosi' un indirizzo che fallisce non viene ritentato
 * all'infinito dentro lo stesso giro. Con `riprova` si ritentano anche gli
 * inviti falliti nei giri precedenti; senza, solo quelli mai provati.
 *
 * Gli account si PRENOTANO prima di spedire (`inviteClaim`, FOR UPDATE SKIP
 * LOCKED): due pannelli aperti insieme non mandano due volte la stessa email.
 */
export async function invitaLotto(o: { lotto?: number; riprova?: boolean; inizio?: string;
                                       chi?: string }, db?: any): Promise<RisultatoLotto> {
  const pool = db || getPool();
  await preparaBeta(pool);
  const vuoto = { inviati: 0, falliti: 0, restanti: 0, errori: [] as any[] };
  const imp = await impostazioni(pool);
  if (!linkValido(imp.link)) {
    return { ok: false, ...vuoto, error: 'Set the download link first.' };
  }
  if (!postaConfigurata()) {
    return { ok: false, ...vuoto,
             error: 'Mail is not configured on the site (SMTP_USER / SMTP_PASS): no invitation can be sent.' };
  }
  let iniziataIl = imp.iniziataIl;
  if (!iniziataIl) {
    // Il primo «Invite all» E' l'inizio della beta: da qui in poi gli
    // account nuovi ricevono l'invito appena nascono.
    iniziataIl = new Date().toISOString();
    await salvaImpostazione(pool, 'beta_started_at', iniziataIl, o.chi || 'admin');
  }
  const lotto = Math.max(1, Math.min(Number(o.lotto) || 8, 50));
  const inizio = o.inizio && !isNaN(Date.parse(o.inizio)) ? o.inizio : new Date().toISOString();
  const riprova = !!o.riprova;

  // gli stessi account per la prenotazione e per il conto di quelli che
  // restano: a e b sono le posizioni dei due parametri nella query
  const condizione = (a: number, b: number) => `x."invitedAt" IS NULL
          AND ($${a}::boolean OR x."inviteError" IS NULL)
          AND (x."inviteAttemptAt" IS NULL OR x."inviteAttemptAt" < $${b}::timestamptz)`;
  const presi = await pool.query(
    `UPDATE "BetaAccount" b SET "inviteClaim" = NOW(), "inviteAttemptAt" = NOW()
      WHERE b.email IN (
        SELECT x.email FROM "BetaAccount" x JOIN "User" u ON u.id = x."userId"
         WHERE ${condizione(2, 3)}
           AND (x."inviteClaim" IS NULL OR x."inviteClaim" < NOW() - interval '10 minutes')
         ORDER BY x."createdAt", x.email
         LIMIT $1
         FOR UPDATE OF x SKIP LOCKED)
      RETURNING b.email, b."userId", b.origine, b."passwordCifrata", b."passwordChangedAt"`,
    [lotto, riprova, inizio]);

  const errori: Array<{ email: string; errore: string }> = [];
  let inviati = 0;
  let falliti = 0;
  let diFila = 0;
  let fermato: string | undefined;
  const righe = presi.rows as Riga[];
  const trasporto = righe.length ? trasportoCondiviso() : undefined;
  try {
    for (let i = 0; i < righe.length; i++) {
      const x = await spedisci(pool, righe[i], imp.link, trasporto);
      if (x.ok) { inviati++; diFila = 0; continue; }
      falliti++; diFila++;
      errori.push({ email: x.email, errore: x.errore || 'not sent' });
      if (diFila >= 3) {
        // Tre di fila: non e' un indirizzo sbagliato, e' il server di posta
        // (credenziali, limite d'invio, rete). Continuare brucerebbe tutti
        // gli altri tentativi del giro per la stessa causa.
        fermato = x.errore || 'the mail server refused three messages in a row';
        const resto = righe.slice(i + 1).map((r) => r.email);
        if (resto.length) {
          await pool.query(
            `UPDATE "BetaAccount" SET "inviteClaim" = NULL, "inviteAttemptAt" = NULL
              WHERE email = ANY($1::text[])`, [resto]);
        }
        break;
      }
    }
  } finally {
    if (trasporto) trasporto.close();
  }

  const resto = await pool.query(
    `SELECT COUNT(*)::int AS n FROM "BetaAccount" x JOIN "User" u ON u.id = x."userId"
      WHERE ${condizione(1, 2)}`, [riprova, inizio]);
  return {
    ok: true, inviati, falliti, errori, fermato, iniziataIl,
    restanti: fermato ? 0 : Number(resto.rows[0]?.n || 0),
  };
}

/** L'invito di prova, all'amministratore che lo chiede, con credenziali finte. */
export async function anteprimaInvito(a: string, db?: any): Promise<EsitoInvio> {
  const pool = db || getPool();
  const imp = await impostazioni(pool);
  const link = linkValido(imp.link) ? imp.link : 'https://example.com/lyra-setup.exe';
  const m = emailInvito({ email: a, password: generaPassword(), link, anteprima: true });
  const x = await inviaEmailEsito(a, m.oggetto, m.testo, m.html);
  return { email: a, ok: x.ok, errore: x.errore, conPassword: true };
}

// ===========================================================================
//  LO STATO, PER IL PANNELLO
// ===========================================================================

export type Voce = {
  email: string;
  profilo: string | null;
  richiestaIl: string | null;
  /** 'account' | 'esistente' | 'lista' | null (dalla richiesta) */
  esitoRichiesta: string | null;
  dalPannello: boolean;
  origine: string | null;
  account: boolean;
  accountIl: string | null;
  invitatoIl: string | null;
  inviti: number;
  erroreInvito: string | null;
  primoAccessoIl: string | null;
};

function iso(v: any): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function statoBeta(db?: any) {
  const pool = db || getPool();
  await preparaBeta(pool);
  const imp = await impostazioni(pool);
  const n = await pool.query(`
    SELECT (SELECT COUNT(*)::int FROM "User") AS account,
           (SELECT COUNT(*)::int FROM beta_signups) AS richieste,
           (SELECT COUNT(*)::int FROM beta_signups WHERE esito = 'lista') AS lista,
           (SELECT COUNT(*)::int FROM "BetaAccount" b JOIN "User" u ON u.id = b."userId") AS beta,
           (SELECT COUNT(*)::int FROM "BetaAccount" b JOIN "User" u ON u.id = b."userId"
             WHERE b."invitedAt" IS NOT NULL) AS invitati,
           (SELECT COUNT(*)::int FROM "BetaAccount" b JOIN "User" u ON u.id = b."userId"
             WHERE b."invitedAt" IS NULL AND b."inviteError" IS NULL) AS "daInvitare",
           (SELECT COUNT(*)::int FROM "BetaAccount" b JOIN "User" u ON u.id = b."userId"
             WHERE b."invitedAt" IS NULL AND b."inviteError" IS NOT NULL) AS falliti,
           (SELECT COUNT(*)::int FROM "BetaAccount" b JOIN "User" u ON u.id = b."userId"
             WHERE b."passwordChangedAt" IS NOT NULL) AS entrati`);
  const c = n.rows[0] || {};
  const r = await pool.query(`
    WITH tutti AS (
      SELECT lower(email) AS email FROM beta_signups
      UNION SELECT lower(email) FROM "BetaAccess"
      UNION SELECT email FROM "BetaAccount")
    SELECT t.email, s.profile, s.created_at, s.esito,
           a.email IS NOT NULL AS pannello, a."addedAt",
           b.origine, b."createdAt" AS creato, b."invitedAt", b.inviti, b."inviteError",
           b."passwordChangedAt", u.id IS NOT NULL AS ha_account
      FROM tutti t
      LEFT JOIN beta_signups s ON lower(s.email) = t.email
      LEFT JOIN "BetaAccess" a ON lower(a.email) = t.email
      LEFT JOIN "BetaAccount" b ON b.email = t.email
      LEFT JOIN "User" u ON u.id = b."userId"
     ORDER BY COALESCE(b."createdAt", s.created_at, a."addedAt") DESC NULLS LAST, t.email
     LIMIT 2000`);
  const elenco: Voce[] = r.rows.map((x: any) => ({
    email: String(x.email),
    profilo: x.profile ?? null,
    richiestaIl: iso(x.created_at),
    esitoRichiesta: x.esito ?? null,
    dalPannello: !!x.pannello,
    origine: x.origine ?? null,
    account: !!x.ha_account,
    accountIl: iso(x.creato),
    invitatoIl: iso(x.invitedAt),
    inviti: Number(x.inviti || 0),
    erroreInvito: x.inviteError ?? null,
    primoAccessoIl: iso(x.passwordChangedAt),
  }));
  const account = Number(c.account || 0);
  return {
    impostazioni: imp,
    posta: postaConfigurata(),
    conteggi: {
      account,
      limite: imp.limite,
      posti: Math.max(0, imp.limite - account),
      richieste: Number(c.richieste || 0),
      lista: Number(c.lista || 0),
      beta: Number(c.beta || 0),
      invitati: Number(c.invitati || 0),
      daInvitare: Number(c.daInvitare || 0),
      falliti: Number(c.falliti || 0),
      entrati: Number(c.entrati || 0),
    },
    elenco,
  };
}

/** Com'e' andata la richiesta di un indirizzo, per i messaggi dell'accesso. */
export async function esitoRichiesta(db: any, email: string): Promise<string | null> {
  try {
    const r = await db.query('SELECT esito FROM beta_signups WHERE lower(email) = $1 LIMIT 1',
                             [String(email || '').trim().toLowerCase()]);
    return r.rows[0] ? (r.rows[0].esito ?? 'in_attesa') : null;
  } catch {
    return null;
  }
}

/**
 * Con la beta attiva, il motivo per cui un indirizzo SENZA account non entra:
 * non e' fra gli ammessi, la sua richiesta e' in lista d'attesa, oppure
 * l'account non e' ancora stato creato. Lo usano l'accesso con la password e
 * quello con Google: una porta diversa, la stessa risposta.
 */
export async function motivoSenzaAccount(db: any, email: string) {
  if (!(await ammessoInBeta(db, email))) return BETA_NON_AMMESSO;
  return (await esitoRichiesta(db, email)) === 'lista' ? BETA_IN_LISTA : BETA_SENZA_ACCOUNT;
}
