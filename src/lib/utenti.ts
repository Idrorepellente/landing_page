/**
 * lib/utenti.ts — i due pezzi che servono a creare un account, condivisi.
 *
 * Erano copiati in tre file: le due porte di Google e, da questa versione,
 * anche il recupero password, che ora può dover creare l'account al primo
 * accesso in beta. Tre copie della stessa funzione sono tre occasioni di
 * correggerne una sola — e qui una divergenza significa due utenti con lo
 * stesso username, oppure un `username` nullo su una colonna che non lo
 * ammette.
 */

/** Identificativo nello stile di quelli già presenti nella tabella. */
export function nuovoId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/**
 * Un username libero, derivato dall'indirizzo.
 *
 * Serve dove l'username non si può chiedere: l'accesso con Google non lo
 * riceve, e il recupero password nemmeno. Si parte dalla parte locale
 * dell'indirizzo, ripulita, e si aggiunge un numero finché è occupato.
 *
 * Dopo cinquanta tentativi si smette di indovinare e si mette un suffisso dal
 * tempo: cinquanta omonimi sono già un caso strano, e un ciclo che continua a
 * interrogare il database non lo migliora.
 */
export async function nomeUtenteLibero(pool: any, email: string): Promise<string> {
  const base = (String(email).split('@')[0] || 'utente')
    .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'utente';
  for (let i = 0; i < 50; i++) {
    const tentativo = i === 0 ? base : `${base}${i + 1}`;
    const r = await pool.query(
      'SELECT 1 FROM "User" WHERE lower(username) = $1 LIMIT 1', [tentativo]);
    if (!r.rows[0]) return tentativo;
  }
  return `${base}${Date.now().toString(36).slice(-6)}`;
}
