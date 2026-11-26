/**
 * lib/segreti.ts — cifratura dei segreti che devono restare leggibili.
 *
 * **Il problema.** Una password si verifica senza conservarla: bcrypt produce
 * un'impronta irreversibile e al login si confrontano le impronte. Il segreto
 * del secondo fattore no: per ricalcolare il codice a sei cifre il server
 * deve poterlo *leggere*. Quindi va cifrato, non trasformato in hash.
 *
 * **Perché conta.** Tenendolo in chiaro, chi ottiene una copia del database
 * genera i codici di chiunque abbia il 2FA attivo — senza il telefono. È
 * esattamente lo scenario da cui il secondo fattore dovrebbe proteggere: chi
 * ha già la password.
 *
 * **La separazione.** La chiave sta in una variabile d'ambiente, il dato nel
 * database. Chi ottiene l'uno non ha l'altro, e servono entrambi. È l'unica
 * ragione per cui questo file esiste.
 */
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

/** Marcatore che distingue un valore cifrato da uno vecchio in chiaro. */
const PREFISSO = 'enc.v1.';

export class ChiaveMancante extends Error {}

function chiave(): Buffer {
  const grezza = (process.env.TOTP_ENC_KEY || '').trim();
  if (!grezza) throw new ChiaveMancante('TOTP_ENC_KEY non impostata');

  // Si accetta sia esadecimale (64 caratteri) sia una frase qualsiasi: nel
  // secondo caso si deriva una chiave di 32 byte. Pretendere un formato
  // preciso porterebbe a chiavi copiate male e a un'applicazione che non
  // parte, senza guadagno di sicurezza reale.
  if (/^[0-9a-f]{64}$/i.test(grezza)) return Buffer.from(grezza, 'hex');
  return crypto.createHash('sha256').update(grezza).digest();
}

/** Vero se la cifratura è configurata: serve a decidere se attivarla. */
export function cifraturaAttiva(): boolean {
  return !!(process.env.TOTP_ENC_KEY || '').trim();
}

/**
 * Cifra un valore. Il risultato porta il nonce e il tag con sé: senza,
 * servirebbero due colonne in più e una migrazione dello schema.
 */
export function cifra(valore: string): string {
  if (!valore) return valore;
  const k = chiave();
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv(ALGO, k, nonce);
  const dato = Buffer.concat([c.update(valore, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return PREFISSO + Buffer.concat([nonce, tag, dato]).toString('base64');
}

/**
 * Decifra un valore. Se NON è cifrato lo restituisce com'è.
 *
 * Serve alla transizione: i segreti già nel database sono in chiaro, e
 * pretenderli cifrati bloccherebbe fuori tutti quelli che hanno il 2FA
 * attivo. Vengono riscritti cifrati al primo uso.
 */
export function decifra(valore: string): string {
  if (!valore || !valore.startsWith(PREFISSO)) return valore;
  const k = chiave();
  const b = Buffer.from(valore.slice(PREFISSO.length), 'base64');
  const nonce = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const dato = b.subarray(28);
  const d = crypto.createDecipheriv(ALGO, k, nonce);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dato), d.final()]).toString('utf8');
}

/** Vero se il valore è già cifrato: evita di cifrare due volte. */
export function eCifrato(valore: string): boolean {
  return !!valore && valore.startsWith(PREFISSO);
}
