/**
 * Avvisa chi ha aperto una contestazione di come si è chiusa.
 *
 * Perché sta qui e non nell'applicazione: le credenziali della posta stanno
 * sul sito, e non devono finire sul computer di chi usa l'app. L'app dice
 * cosa è successo, il sito scrive.
 *
 * L'indirizzo NON arriva dal chiamante: si legge dal database a partire
 * dalla contestazione. Accettarlo dall'esterno significherebbe che chiunque
 * possa far recapitare una comunicazione dall'aspetto ufficiale a un
 * indirizzo qualsiasi.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkSecret } from '@/lib/dashApi';
import { getPool } from '@/lib/pg';
import { inviaEsitoRimborso, EsitoRimborso } from '@/lib/mailer';

export const runtime = 'nodejs';

const AMMESSI: EsitoRimborso[] = ['rimborsato', 'respinto', 'ritirato', 'chiuso'];

export async function POST(req: NextRequest) {
  try {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    let b: any = {};
    try { b = await req.json(); } catch { /* vuoto */ }

    const claimId = String(b?.claimId || '').trim();
    const esito = String(b?.esito || '') as EsitoRimborso;
    if (!claimId) {
      return NextResponse.json({ error: 'claimId mancante' }, { status: 400 });
    }
    if (!AMMESSI.includes(esito)) {
      return NextResponse.json({
        error: `esito '${esito}' sconosciuto`,
        detail: 'Ammessi: ' + AMMESSI.join(', '),
      }, { status: 400 });
    }

    const r = await getPool().query(
      `SELECT c.id, c."buyerId", u.email, a.name AS artefatto,
              p."amountCents", p.currency
         FROM "PerformanceClaim" c
         LEFT JOIN "User" u ON u.id = c."buyerId"
         LEFT JOIN "Artifact" a ON a.id = c."artifactId"
         LEFT JOIN "Purchase" p ON p.id = c."purchaseId"
        WHERE c.id = $1 LIMIT 1`, [claimId]);
    const c = r.rows[0];
    if (!c) {
      return NextResponse.json({ error: 'claim not found' },
                               { status: 404 });
    }
    if (!c.email) {
      // Non e' un errore da bloccare: la chiusura e' gia' avvenuta. Si dice
      // che l'avviso non e' partito, cosi' chi decide lo sa.
      return NextResponse.json({ ok: true, inviata: false,
                                 motivo: 'user has no email address' });
    }

    const inviata = await inviaEsitoRimborso({
      email: String(c.email),
      artefatto: String(c.artefatto || 'artefatto'),
      esito,
      motivo: String(b?.motivo || '').slice(0, 500) || undefined,
      importoCents: esito === 'rimborsato'
        ? Number(c.amountCents || 0) : undefined,
      valuta: String(c.currency || 'EUR'),
      claimId,
      daAmministratore: !!b?.daAmministratore,
    });

    return NextResponse.json({
      ok: true, inviata,
      // Se la posta non e' configurata `inviaEmail` risponde false senza
      // errore: va distinto da un invio riuscito, altrimenti si crede di
      // aver avvisato qualcuno che non ha ricevuto niente.
      motivo: inviata ? undefined : 'mail not configured, or sending failed',
      destinatario: String(c.email),
    });
  } catch (e: any) {
    const testo = String(e?.message || e);
    return NextResponse.json({ error: testo, raw: testo }, { status: 500 });
  }
}
