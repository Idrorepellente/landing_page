/**
 * La beta, dal pannello di amministrazione dell'app: interruttore, account,
 * limite, link di download e inviti.
 *
 * Perché sta sul sito e non nell'applicazione: l'accesso si decide qui,
 * dove le credenziali vengono verificate, e qui stanno la posta e le prime
 * password (cifrate). Un controllo fatto nell'app sarebbe aggirabile da
 * chiunque ne modifichi una copia.
 *
 * Solo gli amministratori: la rotta vuole il segreto della dashboard, che non
 * viene distribuito con l'app (build/README.md). L'elenco contiene indirizzi
 * email di persone reali; le password non escono MAI da qui (solo dentro gli
 * inviti).
 *
 *   GET                                   stato, numeri, elenco
 *   POST { azione: 'interruttore', attiva }
 *   POST { azione: 'aggiungi', email }    crea l'account (anche oltre il limite)
 *   POST { azione: 'rimuovi', email }
 *   POST { azione: 'impostazioni', limite?, link? }
 *   POST { azione: 'invita', lotto?, riprova?, inizio? }   un lotto di inviti
 *   POST { azione: 'reinvia', email }
 *   POST { azione: 'anteprima' }          l'invito, con dati finti, a chi lo chiede
 *
 * Il meccanismo sta in lib/betaAccount.ts.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { isAdminCompleto } from '@/lib/appToken';
import {
  betaAttiva, ammessoInBeta, tabellaBetaEsiste, conteggiBeta,
} from '@/lib/beta';
import {
  aggiungiDaPannello, anteprimaInvito, invitaLotto, invitaUno, linkValido,
  salvaImpostazione, statoBeta, togliDalPannello,
} from '@/lib/betaAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Un lotto di inviti apre una connessione SMTP e spedisce qualche messaggio:
// il tempo predefinito di una funzione non basterebbe.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const pool = getPool();
    const st = await statoBeta(pool);
    const conteggi = await conteggiBeta(pool);
    return NextResponse.json({
      ok: true,
      attiva: st.impostazioni.attiva,
      limite: st.impostazioni.limite,
      link: st.impostazioni.link,
      iniziataIl: st.impostazioni.iniziataIl,
      posta: st.posta,
      numeri: st.conteggi,
      elenco: st.elenco,
      // Per i pannelli delle versioni precedenti: gli inviti, gli iscritti e
      // i due conteggi come prima.
      emails: st.elenco.filter((v) => v.dalPannello).map((v) => v.email),
      iscritti: st.elenco.filter((v) => v.richiestaIl).map((v) => ({
        email: v.email, profile: v.profilo, created_at: v.richiestaIl,
      })),
      conteggi,
      schema: await tabellaBetaEsiste(pool),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    const azione = String(b?.azione || '').trim();
    const chiede = String(b?.richiedente || '').trim().toLowerCase();
    const pool = getPool();

    if (azione === 'interruttore') {
      const acceso = !!b?.attiva;

      // ── NON CI SI CHIUDE FUORI DA SOLI ────────────────────────────────
      // Si controlla la cosa vera, con la stessa funzione che decide
      // l'accesso: c'e' qualcuno di ammesso, e fra questi ci sei tu?
      if (acceso) {
        const conteggi = await conteggiBeta(pool);
        if (!conteggi.iscrizioni && !conteggi.inviti) {
          return NextResponse.json({
            error: 'Nessun indirizzo è ammesso: aggiungine almeno uno prima '
                 + 'di attivare la beta.',
            detail: 'Valgono sia le richieste raccolte dal form del sito sia '
                  + 'gli account aggiunti qui. Con la beta attiva e nessuno '
                  + 'ammesso, nessuno potrebbe più entrare.',
          }, { status: 409 });
        }
        if (chiede && !(await ammessoInBeta(pool, chiede))) {
          return NextResponse.json({
            error: 'Il tuo indirizzo non risulta ammesso: aggiungilo prima di '
                 + 'attivare la beta.',
            detail: 'Altrimenti resteresti chiuso fuori dall\'applicazione '
                  + 'senza modo di riaprirla.',
          }, { status: 409 });
        }
      }
      await salvaImpostazione(pool, 'beta_enabled', acceso ? 'true' : 'false',
                              chiede || 'admin');
      return NextResponse.json({ ok: true, attiva: acceso });
    }

    if (azione === 'impostazioni') {
      const fatto: Record<string, any> = {};
      if (b?.limite !== undefined && b?.limite !== null && b?.limite !== '') {
        const n = Number(b.limite);
        if (!Number.isInteger(n) || n < 1 || n > 1000000) {
          return NextResponse.json({
            error: 'The limit must be a whole number of accounts, at least 1.',
          }, { status: 400 });
        }
        await salvaImpostazione(pool, 'beta_account_limit', String(n), chiede || 'admin');
        fatto.limite = n;
      }
      if (b?.link !== undefined) {
        const link = String(b.link || '').trim();
        if (link && !linkValido(link)) {
          return NextResponse.json({
            error: 'This is not a valid download link.',
            detail: 'Write the full address, starting with https://',
          }, { status: 400 });
        }
        await salvaImpostazione(pool, 'beta_download_url', link, chiede || 'admin');
        fatto.link = link;
      }
      return NextResponse.json({ ok: true, ...fatto });
    }

    if (azione === 'invita') {
      const r = await invitaLotto({
        lotto: Number(b?.lotto) || undefined,
        riprova: !!b?.riprova,
        inizio: typeof b?.inizio === 'string' ? b.inizio : undefined,
        chi: chiede || 'admin',
      }, pool);
      return NextResponse.json(r, { status: r.ok ? 200 : 409 });
    }

    if (azione === 'anteprima') {
      if (!chiede.includes('@')) {
        return NextResponse.json({ error: 'the preview goes to your address, which is missing' },
                                 { status: 400 });
      }
      const r = await anteprimaInvito(chiede, pool);
      return NextResponse.json(r.ok ? { ok: true, a: chiede }
                                    : { error: 'preview not sent', detail: r.errore },
                               { status: r.ok ? 200 : 502 });
    }

    const email = String(b?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 });
    }

    if (azione === 'aggiungi') {
      const r = await aggiungiDaPannello(email, chiede || 'admin', pool);
      return NextResponse.json({ ok: true, email, azione, esito: r.esito, invito: r.invito });
    }

    if (azione === 'reinvia') {
      const r = await invitaUno(email, pool);
      return NextResponse.json(r.ok ? r
                                    : { error: 'invitation not sent', detail: r.errore },
                               { status: r.ok ? 200 : 502 });
    }

    if (azione === 'rimuovi') {
      // Togliere se stessi mentre la beta e' attiva: si controlla PRIMA, sulla
      // domanda vera — resteresti ammesso per qualche altra via? Un
      // amministratore si', sempre; chi e' fra le richieste del sito anche.
      if (chiede && email === chiede && await betaAttiva(pool)) {
        const admin = await isAdminCompleto(chiede, pool).catch(() => false);
        const richiesta = await pool.query(
          'SELECT 1 FROM beta_signups WHERE lower(email) = $1 LIMIT 1', [chiede])
          .then((r: any) => !!r.rows[0]).catch(() => false);
        if (!admin && !richiesta) {
          return NextResponse.json({
            error: 'Non puoi togliere te stesso mentre la beta è attiva.',
            detail: 'Resteresti chiuso fuori, perché questo indirizzo non è '
                  + 'ammesso per nessun\'altra via. Spegni prima la beta, '
                  + 'oppure togli un altro indirizzo.',
          }, { status: 409 });
        }
      }
      const r = await togliDalPannello(email, pool);
      if (!r.tolto) {
        // Non era fra quelli aggiunti qui. Puo' comunque essere ammesso dal
        // form del sito, e dirlo evita di credere di averlo escluso.
        const anche = await ammessoInBeta(pool, email);
        return NextResponse.json({
          error: 'non era fra gli indirizzi aggiunti qui',
          detail: anche
            ? 'Questo indirizzo resta però ammesso: ha chiesto l\'accesso dal '
              + 'form del sito, oppure è un amministratore.'
            : undefined,
        }, { status: 404 });
      }
      return NextResponse.json({ ok: true, email, azione, accountTolto: r.accountTolto });
    }

    return NextResponse.json({
      error: 'azione sconosciuta',
      detail: 'interruttore, aggiungi, rimuovi, impostazioni, invita, reinvia, anteprima',
    }, { status: 400 });
  } catch (e: any) {
    const testo = String(e?.message || e);
    return NextResponse.json({ error: testo }, { status: 500 });
  }
}
