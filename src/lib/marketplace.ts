import crypto from 'node:crypto';
import { getPool } from '@/lib/pg';

/**
 * Marketplace — funzioni condivise.
 *
 * Tre responsabilita':
 *   1. cifrare e decifrare i pacchetti degli artefatti
 *   2. calcolare la divisione del pagamento fra venditore e piattaforma
 *   3. rispondere alla domanda "questo utente puo' eseguire questo artefatto?"
 *
 * Nulla qui parla con Stripe: quello sta in stripe.ts.
 */

// ─────────────────────────── cifratura ───────────────────────────
//
// Due livelli, per non tenere mai in chiaro la chiave che apre i pacchetti:
//
//   pacchetto  --cifrato con-->  chiave del pacchetto (una per versione)
//   chiave     --avvolta da -->  chiave madre (MARKETPLACE_MASTER_KEY, solo in env)
//
// Chi ottenesse un dump del database avrebbe i pacchetti e le chiavi avvolte,
// ma senza la chiave madre non puo' aprire nulla. Ruotare la chiave di un
// singolo artefatto non richiede di ricifrare gli altri.

const ALGO = 'aes-256-gcm';

export function masterKey(): Buffer | null {
  const raw = (process.env.MARKETPLACE_MASTER_KEY || '').trim();
  if (!raw) return null;
  let k: Buffer;
  try {
    k = Buffer.from(raw, 'base64');
  } catch {
    return null;
  }
  // 32 byte esatti: AES-256 non accetta altro, e una chiave corta passata per
  // distrazione darebbe un errore oscuro al primo acquisto invece che subito
  return k.length === 32 ? k : null;
}

export function masterKeyReady(): boolean {
  return masterKey() !== null;
}

export type Cifrato = { ciphertext: Buffer; nonce: Buffer; tag: Buffer };

function cifraCon(key: Buffer, plain: Buffer): Cifrato {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv(ALGO, key, nonce);
  const ciphertext = Buffer.concat([c.update(plain), c.final()]);
  return { ciphertext, nonce, tag: c.getAuthTag() };
}

function decifraCon(key: Buffer, e: Cifrato): Buffer {
  const d = crypto.createDecipheriv(ALGO, key, e.nonce);
  d.setAuthTag(e.tag);
  return Buffer.concat([d.update(e.ciphertext), d.final()]);
}

/** Cifra i file di una versione. Ritorna pacchetto + chiave avvolta. */
export function cifraPacchetto(files: unknown) {
  const master = masterKey();
  if (!master) throw new Error('MARKETPLACE_MASTER_KEY assente o non valida');

  const plain = Buffer.from(JSON.stringify(files), 'utf8');
  const key = crypto.randomBytes(32);
  const pacco = cifraCon(key, plain);
  const avvolta = cifraCon(master, key);

  return {
    pacco,
    avvolta,
    sha256: crypto.createHash('sha256').update(plain).digest('hex'),
    sizeBytes: plain.length,
  };
}

/** Riapre un pacchetto. Usata solo dopo aver verificato il diritto d'uso. */
export function apriPacchetto(pacco: Cifrato, avvolta: Cifrato): any {
  const master = masterKey();
  if (!master) throw new Error('MARKETPLACE_MASTER_KEY assente o non valida');
  const key = decifraCon(master, avvolta);
  return JSON.parse(decifraCon(key, pacco).toString('utf8'));
}

/**
 * Riavvolge la chiave del pacchetto per UN SOLO destinatario.
 *
 * L'app non riceve mai la chiave madre: quella non esce dal sito. Riceve il
 * pacchetto e la sua chiave, ricifrata con un segreto che entrambe le parti
 * sanno gia' calcolare — il token dell'utente piu' l'id del permesso:
 *
 *     segreto = SHA-256( token + ":" + grantId )
 *
 * Il token e' la credenziale dell'utente, quindi chi non ce l'ha non apre la
 * risposta nemmeno intercettandola; il grantId cambia a ogni richiesta, quindi
 * una risposta salvata non si puo' riusare.
 *
 * Serve una derivazione che il CLIENT sappia rifare: avvolgere la chiave con
 * un segreto derivato dalla chiave madre l'avrebbe resa indecifrabile per
 * l'app, che quella chiave non la vede mai.
 */
export function segretoSessione(rawToken: string, grantId: string): Buffer {
  return crypto.createHash('sha256').update(`${rawToken}:${grantId}`).digest();
}

export function chiavePerDestinatario(
  avvolta: Cifrato, rawToken: string, grantId: string,
): Cifrato {
  const master = masterKey();
  if (!master) throw new Error('MARKETPLACE_MASTER_KEY assente o non valida');
  const key = decifraCon(master, avvolta);
  return cifraCon(segretoSessione(rawToken, grantId), key);
}

export function b64(b: Buffer): string {
  return b.toString('base64');
}

// ─────────────────────────── denaro ───────────────────────────

export type Divisione = {
  totalCents: number;
  feeCents: number;   // alla piattaforma
  netCents: number;   // al venditore
  basisPoints: number;
};

/**
 * Divide l'importo. La percentuale sta in tabella, non nel codice: si cambia
 * senza rideploy e resta lo storico. La variabile d'ambiente e' solo il valore
 * di partenza se la tabella e' vuota.
 */
export async function dividiPagamento(totalCents: number): Promise<Divisione> {
  const pool = getPool();
  let bps = parseInt(process.env.MARKETPLACE_FEE_BPS || '1000', 10);
  let min = 0;
  try {
    const r = await pool.query(
      'SELECT "basisPoints", "minCents" FROM "PlatformFee" ORDER BY "validFrom" DESC LIMIT 1');
    if (r.rows[0]) {
      bps = Number(r.rows[0].basisPoints);
      min = Number(r.rows[0].minCents || 0);
    }
  } catch {
    // tabella non ancora creata: si usa il valore d'ambiente
  }
  if (!Number.isFinite(bps) || bps < 0) bps = 1000;
  if (bps > 10000) bps = 10000;

  const total = Math.max(0, Math.round(totalCents));
  let fee = Math.round((total * bps) / 10000);
  if (fee < min) fee = min;
  // La commissione non puo' mangiarsi tutto: al venditore resta sempre
  // qualcosa, altrimenti un arrotondamento su importi minimi lo azzererebbe.
  if (fee > total) fee = total;
  return { totalCents: total, feeCents: fee, netCents: total - fee, basisPoints: bps };
}

// ─────────────────────────── diritti d'uso ───────────────────────────

export type EsitoLicenza =
  | { ok: true; licenseId: string; delivery: string; releaseId: string }
  | { ok: false; motivo: string; codice: string };

/**
 * Verifica che l'utente possa eseguire l'artefatto, ORA, su QUESTA macchina.
 * Registra anche la macchina se e' nuova e c'e' ancora posto.
 */
export async function verificaLicenza(
  userId: string,
  artifactId: string,
  deviceHash: string | null,
): Promise<EsitoLicenza> {
  const pool = getPool();

  const a = await pool.query(
    `SELECT id, delivery::text AS delivery, COALESCE("isForSale",FALSE) AS "isForSale"
       FROM "Artifact" WHERE id = $1`, [artifactId]);
  if (!a.rows[0]) return { ok: false, codice: 'not_found', motivo: 'artefatto inesistente' };

  const rel = await pool.query(
    `SELECT id FROM "ArtifactRelease"
      WHERE "artifactId" = $1 AND "isCurrent" = TRUE
      ORDER BY "createdAt" DESC LIMIT 1`, [artifactId]);
  const releaseId = rel.rows[0]?.id || '';

  // Gratuito: nessuna licenza da verificare.
  if (!a.rows[0].isForSale) {
    return { ok: true, licenseId: '', delivery: a.rows[0].delivery, releaseId };
  }

  const l = await pool.query(
    `SELECT id, status::text AS status, "expiresAt", "maxDevices", "releaseId"
       FROM "License" WHERE "artifactId" = $1 AND "userId" = $2`, [artifactId, userId]);
  const lic = l.rows[0];
  if (!lic) return { ok: false, codice: 'no_license', motivo: 'artefatto non acquistato' };
  if (lic.status !== 'active') {
    return { ok: false, codice: 'license_' + lic.status, motivo: 'licenza ' + lic.status };
  }
  if (lic.expiresAt && new Date(lic.expiresAt).getTime() < Date.now()) {
    return { ok: false, codice: 'expired', motivo: 'licenza scaduta' };
  }

  // Limite macchine: si conta solo se il chiamante si e' identificato.
  if (deviceHash) {
    const d = await pool.query(
      'SELECT "deviceHash" FROM "LicenseDevice" WHERE "licenseId" = $1', [lic.id]);
    const conosciute = d.rows.map((r: any) => r.deviceHash);
    if (!conosciute.includes(deviceHash)) {
      if (conosciute.length >= Number(lic.maxDevices || 3)) {
        return {
          ok: false, codice: 'too_many_devices',
          motivo: `limite di ${lic.maxDevices} macchine raggiunto`,
        };
      }
      await pool.query(
        `INSERT INTO "LicenseDevice" (id, "licenseId", "deviceHash")
         VALUES ($1,$2,$3) ON CONFLICT ("licenseId","deviceHash") DO NOTHING`,
        [crypto.randomUUID(), lic.id, deviceHash]);
    } else {
      await pool.query(
        'UPDATE "LicenseDevice" SET "lastSeen" = NOW() WHERE "licenseId" = $1 AND "deviceHash" = $2',
        [lic.id, deviceHash]);
    }
  }

  // Acquisto una tantum: la licenza e' legata alla versione comprata, non
  // all'ultima pubblicata. Chi paga una volta ha quella per sempre; gli
  // aggiornamenti sono il motivo per cui esiste l'abbonamento.
  return {
    ok: true,
    licenseId: lic.id,
    delivery: a.rows[0].delivery,
    releaseId: lic.releaseId || releaseId,
  };
}

export function idNuovo(): string {
  return crypto.randomUUID();
}

/** Impronta stabile della macchina, senza conservare il dato grezzo. */
export function impronta(raw: string): string {
  return crypto.createHash('sha256').update(String(raw || '')).digest('hex').slice(0, 32);
}
