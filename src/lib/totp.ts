/**
 * TOTP — codici a tempo (RFC 6238), quelli delle app di autenticazione.
 *
 * Implementato con il solo `crypto` di Node invece di aggiungere una
 * dipendenza: l'algoritmo è una trentina di righe, e una libreria in più su
 * qualcosa che protegge gli accessi è una superficie in più da tenere
 * aggiornata.
 *
 * Come funziona: si condivide un segreto, si prende il tempo diviso in
 * finestre da 30 secondi, e si calcola un HMAC del numero di finestra. Il
 * codice a 6 cifre è un estratto di quell'HMAC. Chi ha il segreto e l'orologio
 * giusto ottiene lo stesso numero.
 */
import crypto from 'crypto';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';   // base32, RFC 4648

/** Segreto nuovo, in base32 (il formato che le app si aspettano). */
export function nuovoSegreto(byte = 20): string {
  const b = crypto.randomBytes(byte);
  let bits = '';
  for (const x of b) bits += x.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += ALFABETO[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function daBase32(s: string): Buffer {
  const pulito = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of pulito) {
    const v = ALFABETO.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, '0');
  }
  const byte: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    byte.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(byte);
}

/** Il codice per una data finestra temporale. */
export function codice(segreto: string, contatore: number, cifre = 6,
                       algo: string = 'sha1'): string {
  const chiave = daBase32(segreto);
  const buf = Buffer.alloc(8);
  // il contatore è a 64 bit: si scrive in due metà da 32, perché
  // writeUInt32BE non copre l'intero intervallo
  buf.writeUInt32BE(Math.floor(contatore / 0x100000000), 0);
  buf.writeUInt32BE(contatore >>> 0, 4);

  const h = crypto.createHmac(algo, chiave).update(buf).digest();
  // "troncamento dinamico": gli ultimi 4 bit dicono da dove leggere
  const off = h[h.length - 1] & 0x0f;
  const num = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16)
            | (h[off + 2] << 8) | h[off + 3];
  return String(num % 10 ** cifre).padStart(cifre, '0');
}

/**
 * Verifica un codice inserito dall'utente.
 *
 * `tolleranza` accetta anche la finestra precedente e la successiva: gli
 * orologi non sono mai perfettamente allineati, e senza margine un codice
 * corretto verrebbe rifiutato perché il telefono è avanti di dieci secondi.
 * Più di una finestra per lato allargherebbe troppo il tempo utile a chi
 * prova a indovinare.
 */
export function verifica(segreto: string, inserito: string,
                         tolleranza = 1, passo = 30): boolean {
  const c = String(inserito || '').replace(/\D/g, '');
  if (c.length !== 6 || !segreto) return false;
  const ora = Math.floor(Date.now() / 1000 / passo);
  for (let d = -tolleranza; d <= tolleranza; d++) {
    const atteso = codice(segreto, ora + d);
    // confronto a tempo costante: la durata non deve dire quante cifre
    // erano giuste
    const a = Buffer.from(atteso, 'utf8');
    const b = Buffer.from(c, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** L'indirizzo `otpauth://` da mettere nel codice QR. */
export function urlOtpauth(segreto: string, email: string,
                           emittente = 'Lyra'): string {
  const et = encodeURIComponent(emittente);
  const ac = encodeURIComponent(email);
  return `otpauth://totp/${et}:${ac}?secret=${segreto}`
       + `&issuer=${et}&algorithm=SHA1&digits=6&period=30`;
}
