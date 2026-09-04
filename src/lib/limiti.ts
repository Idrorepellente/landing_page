/**
 * lib/limiti.ts — quante volte si può provare, e in quanto tempo.
 *
 * **Perché serve.** Senza un limite, una password si prova all'infinito. Un
 * attacco automatico ne tenta migliaia al minuto, e contro una password
 * debole vince sempre — non per bravura, ma per numero. Lo stesso vale per i
 * codici a sei cifre del secondo fattore: un milione di combinazioni sembra
 * tanto, ma a mille tentativi al secondo sono venti minuti.
 *
 * **Perché nel database e non in memoria.** Il sito gira su funzioni che
 * nascono e muoiono a ogni richiesta, spesso su macchine diverse: un
 * contatore in memoria verrebbe azzerato di continuo, e sarebbe una
 * protezione solo apparente — peggio di nessuna, perché smette di far
 * cercare quella vera.
 *
 * **Cosa NON è.** Non ferma un attacco distribuito su migliaia di indirizzi.
 * Ferma il caso comune: qualcuno che martella un account solo.
 */
import { getPool } from '@/lib/pg';

export type EsitoLimite = {
  ok: boolean;
  rimasti: number;
  riprovaTraSecondi?: number;
};

/**
 * Registra un tentativo e dice se si può procedere.
 *
 * `chiave` identifica cosa si sta limitando: `login:mario@x.it`,
 * `2fa:<uid>`. Va scelta sul BERSAGLIO, non su chi chiede: limitare per
 * indirizzo IP protegge poco, perché gli indirizzi si cambiano, e penalizza
 * chi condivide una connessione.
 */
export async function consentito(
  chiave: string, massimo = 8, finestraSecondi = 900,
): Promise<EsitoLimite> {
  const pool = getPool();
  try {
    // Una riga per chiave. `expiresAt` fa da finestra scorrevole: passata
    // quella, il contatore riparte.
    const r = await pool.query(
      `INSERT INTO "RateLimit"(chiave, tentativi, "expiresAt")
       VALUES ($1, 1, NOW() + ($2 || ' seconds')::interval)
       ON CONFLICT (chiave) DO UPDATE SET
         tentativi = CASE
           WHEN "RateLimit"."expiresAt" < NOW() THEN 1
           ELSE "RateLimit".tentativi + 1 END,
         "expiresAt" = CASE
           WHEN "RateLimit"."expiresAt" < NOW()
             THEN NOW() + ($2 || ' seconds')::interval
           ELSE "RateLimit"."expiresAt" END
       RETURNING tentativi,
                 EXTRACT(EPOCH FROM ("expiresAt" - NOW()))::int AS mancano`,
      [chiave, String(finestraSecondi)]);

    const riga = r.rows[0];
    const n = Number(riga?.tentativi || 1);
    if (n > massimo) {
      return { ok: false, rimasti: 0,
               riprovaTraSecondi: Math.max(Number(riga?.mancano || 0), 1) };
    }
    return { ok: true, rimasti: Math.max(massimo - n, 0) };
  } catch {
    // La tabella puo' non esistere ancora. Si LASCIA PASSARE: un limite che
    // non si puo' applicare non deve impedire l'accesso a tutti. Il rischio
    // e' minore del blocco totale, ed e' visibile nei log dello schema.
    return { ok: true, rimasti: massimo };
  }
}

/** Azzera il contatore: si chiama dopo un tentativo RIUSCITO. */
export async function azzera(chiave: string): Promise<void> {
  try {
    await getPool().query('DELETE FROM "RateLimit" WHERE chiave = $1', [chiave]);
  } catch { /* niente: il contatore scade da solo */ }
}

/** Messaggio per chi ha esaurito i tentativi. */
export function messaggioLimite(e: EsitoLimite): string {
  const s = e.riprovaTraSecondi || 0;
  const minuti = Math.ceil(s / 60);
  return 'Troppi tentativi. Riprova fra '
    + (minuti > 1 ? `${minuti} minuti` : 'un minuto') + '.';
}
