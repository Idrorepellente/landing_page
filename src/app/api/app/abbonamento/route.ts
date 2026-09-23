/**
 * Stato dell'abbonamento dell'utente collegato.
 *
 * Serve a una sola domanda: questa persona puo' pubblicare sul
 * marketplace? Sfogliare, scaricare e comprare restano aperti a tutti;
 * mettere un artefatto in vetrina no, perche' chi pubblica mette il
 * proprio nome accanto a qualcosa che altri faranno girare sui propri
 * soldi.
 *
 * L'abbonamento non esiste ancora come prodotto: la colonna c'e' e la
 * si popola a mano per i primi autori. Quando ci sara' un pagamento
 * ricorrente, sara' quello a scriverla, e questa rotta non cambiera'.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { tokenFromRequest } from '@/lib/appToken';
import { getPool } from '@/lib/pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'token missing or expired' }, { status: 401 });
  }
  const pool = getPool();
  try {
    const r = await pool.query(
      `SELECT "subscriptionStatus"::text AS stato, "subscriptionUntil" AS fino
         FROM "User" WHERE id = $1 LIMIT 1`, [auth.uid]);
    const riga = r.rows[0] || {};
    const stato = String(riga.stato || 'none').toLowerCase();
    const fino = riga.fino ? new Date(riga.fino) : null;
    // Scaduto ieri non e' attivo. La data si controlla, non si assume.
    const attivo = stato === 'subscribed' && (!fino || fino.getTime() > Date.now());
    return NextResponse.json({ ok: true, attivo, stato, fino });
  } catch {
    // Colonna assente su schemi vecchi: NON si blocca chi gia' pubblicava.
    // Un errore di lettura non deve diventare un divieto silenzioso, ma la
    // risposta dice che non si e' potuto verificare.
    return NextResponse.json({ ok: true, attivo: false, stato: 'unknown',
                               detail: 'subscription column not installed' });
  }
}
