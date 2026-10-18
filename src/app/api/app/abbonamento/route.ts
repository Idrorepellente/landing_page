/**
 * Stato dell'abbonamento dell'utente collegato, e catalogo dei tre piani.
 *
 * Risponde a due domande in una chiamata, perche' l'app le fa sempre
 * insieme: «a che livello sono?» e «cosa posso prendere?». Separarle
 * significherebbe due richieste per disegnare una schermata.
 *
 * Il campo `attivo` resta primo nella risposta e con lo stesso significato di
 * prima — «questa persona puo' pubblicare?» — cosi' una copia dell'app non
 * aggiornata continua a funzionare. Quello che si aggiunge e' il LIVELLO
 * (quattro categorie, zero compresa), il periodo, la scadenza e i piani.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { tokenFromRequest, isAdminCompleto } from '@/lib/appToken';
import { getPool } from '@/lib/pg';
import { marketplaceBloccato } from '@/lib/impostazioni';
import { statoAbbonamento, piani, puoPubblicare } from '@/lib/abbonamenti';
import { configurato, ambienteStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = tokenFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'token missing or expired' }, { status: 401 });
  }
  const pool = getPool();

  const [st, listaPiani, bloccato, admin] = await Promise.all([
    statoAbbonamento(auth.uid, pool),
    piani(pool),
    marketplaceBloccato(pool),
    isAdminCompleto(auth.email, pool),
  ]);

  // Il permesso si calcola con la STESSA funzione che lo impone sulle rotte
  // di scrittura. Se l'app lo ricavasse da sola da `attivo` e `bloccato`,
  // mostrerebbe «puoi pubblicare» in casi in cui il server poi rifiuta.
  const permesso = await puoPubblicare(auth.uid, auth.email, pool);

  return NextResponse.json({
    ok: true,
    // ── compatibilita': stesso nome, stesso significato di prima ──
    attivo: permesso.ok,
    stato: st.stato,
    fino: st.fino,
    // ── le quattro categorie ──
    tier: admin ? 3 : st.tier,
    admin,
    abbonamentoAttivo: st.attivo,
    periodo: st.periodo,
    disdettaDal: st.disdettaDal,
    features: st.features,
    // ── contesto ──
    bloccato,
    puoPubblicare: permesso.ok,
    motivo: permesso.ok ? null : permesso.codice,
    error: permesso.ok ? undefined : permesso.error,
    detail: permesso.ok ? undefined : permesso.detail,
    // ── catalogo ──
    piani: listaPiani,
    pagamentiPronti: configurato(),
    ambiente: ambienteStripe(),
    schemaMancante: st.schemaMancante || undefined,
  });
}
