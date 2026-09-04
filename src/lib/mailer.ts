import nodemailer from 'nodemailer';

/**
 * Posta del sito.
 *
 * Le credenziali sono le stesse gia' usate da /api/dashboard/email
 * (SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, EMAIL_FROM): qui pero' si
 * spedisce direttamente, senza passare per una chiamata HTTP al proprio sito.
 * Il webhook di Stripe deve rispondere in fretta e non puo' permettersi un
 * viaggio in piu' verso se stesso.
 */

const REGISTER_SMTP_HOST = 'authsmtp.securemail.pro';
const REGISTER_SMTP_PORT = 465;

export function postaConfigurata(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function trasporto() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS non configurati');

  const host = process.env.SMTP_HOST || REGISTER_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT)
    || (host === REGISTER_SMTP_HOST ? REGISTER_SMTP_PORT : 587);

  return nodemailer.createTransport({
    host, port,
    secure: port === 465,          // 465 = SSL implicito, 587 = STARTTLS
    auth: { user, pass },
  });
}

/**
 * Spedisce. Non solleva mai: un guasto della posta non deve far fallire il
 * webhook, altrimenti Stripe ritenta e si rischia di rielaborare un pagamento
 * gia' registrato. L'acquisto vale, la ricevuta e' un di piu'.
 */
export async function inviaEmail(
  a: string, oggetto: string, testo: string, html?: string,
): Promise<boolean> {
  if (!a || !postaConfigurata()) return false;
  try {
    const t = trasporto();
    await t.sendMail({
      from: process.env.EMAIL_FROM || `Lyra <${process.env.SMTP_USER}>`,
      to: a,
      subject: oggetto,
      text: testo,
      html,
    });
    return true;
  } catch (e) {
    console.error('[posta] invio fallito:', e);
    return false;
  }
}

// ─────────────────────────── ricevuta d'acquisto ───────────────────────────

function soldi(cents: number, valuta = 'EUR'): string {
  const s: Record<string, string> = { EUR: '\u20ac', USD: '$', GBP: '\u00a3' };
  return (Number(cents || 0) / 100).toFixed(2).replace('.', ',') + ' ' + (s[valuta] || valuta);
}

export type DatiRicevuta = {
  email: string;
  artefatto: string;
  importoCents: number;
  valuta: string;
  consegna: string;          // 'local' | 'streamed'
  purchaseId: string;
  data: Date;
};

export async function inviaRicevuta(d: DatiRicevuta): Promise<boolean> {
  const importo = soldi(d.importoCents, d.valuta);
  const quando = d.data.toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' });

  const comeSiUsa = d.consegna === 'streamed'
    ? 'Questo artefatto si esegue senza installazione: non viene salvato sul tuo '
      + 'computer, si carica al momento dell\'uso. Serve una connessione a internet.'
    : 'Puoi installarlo dalla pagina Marketplace dell\'app: i file vengono scritti '
      + 'nella cartella del progetto.';

  const testo = [
    `Grazie per l'acquisto.`,
    ``,
    `Artefatto : ${d.artefatto}`,
    `Importo   : ${importo}`,
    `Data      : ${quando}`,
    `Riferimento: ${d.purchaseId}`,
    ``,
    comeSiUsa,
    ``,
    `Lo trovi gia' disponibile nella pagina Marketplace dell'app.`,
    ``,
    `Se non hai effettuato tu questo acquisto, rispondi a questa email.`,
  ].join('\n');

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
            max-width:520px;margin:0 auto;color:#1f2328;line-height:1.55">
  <h2 style="margin:0 0 4px;font-size:20px">Acquisto confermato</h2>
  <p style="margin:0 0 20px;color:#6e7681;font-size:14px">
    Il pagamento è andato a buon fine.</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
    <tr><td style="padding:8px 0;color:#6e7681">Artefatto</td>
        <td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(d.artefatto)}</td></tr>
    <tr><td style="padding:8px 0;color:#6e7681;border-top:1px solid #e5e7eb">Importo</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #e5e7eb">${importo}</td></tr>
    <tr><td style="padding:8px 0;color:#6e7681;border-top:1px solid #e5e7eb">Data</td>
        <td style="padding:8px 0;text-align:right;border-top:1px solid #e5e7eb">${escapeHtml(quando)}</td></tr>
    <tr><td style="padding:8px 0;color:#6e7681;border-top:1px solid #e5e7eb">Riferimento</td>
        <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;border-top:1px solid #e5e7eb">${escapeHtml(d.purchaseId)}</td></tr>
  </table>

  <p style="margin:0 0 16px;font-size:14px">${escapeHtml(comeSiUsa)}</p>
  <p style="margin:0 0 20px;font-size:14px">
    Lo trovi già disponibile nella pagina <b>Marketplace</b> dell'app.</p>
  <p style="margin:0;font-size:12px;color:#6e7681;border-top:1px solid #e5e7eb;padding-top:14px">
    Se non hai effettuato tu questo acquisto, rispondi a questa email.</p>
</div>`;

  return inviaEmail(d.email, `Acquisto confermato — ${d.artefatto}`, testo, html);
}

function escapeHtml(t: string): string {
  return String(t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/* ═══════════════════════════════════════════════════════════════════════
   ESITO DI UNA RICHIESTA DI RIMBORSO

   Una richiesta si chiude in quattro modi, e ognuno merita parole diverse:
   chi si sente dire «pratica chiusa» senza sapere se ha avuto ragione o
   torto deve chiedere, e chiedere costa a entrambi.

   L'email si manda SEMPRE, anche quando l'esito e' negativo: il silenzio
   dopo una lamentela e' la cosa che fa perdere piu' fiducia.
   ═══════════════════════════════════════════════════════════════════════ */

export type EsitoRimborso = 'rimborsato' | 'respinto' | 'ritirato' | 'chiuso';

export type DatiEsitoRimborso = {
  email: string;
  artefatto: string;
  esito: EsitoRimborso;
  motivo?: string;
  importoCents?: number;    // solo se rimborsato
  valuta?: string;
  claimId: string;
  daAmministratore: boolean;
};

/** Titolo, riga d'apertura e spiegazione, per ciascun esito. */
function testiEsito(d: DatiEsitoRimborso) {
  const nome = d.artefatto || 'l\'artefatto';
  switch (d.esito) {
    case 'rimborsato':
      return {
        oggetto: `Rimborso approvato — ${nome}`,
        titolo: 'La tua richiesta è stata accolta',
        corpo: `Abbiamo esaminato la tua richiesta su <b>${nome}</b> e l'abbiamo `
             + 'accolta. L\'importo torna sul metodo di pagamento che hai usato: '
             + 'la tua banca lo accredita di norma entro cinque-dieci giorni '
             + 'lavorativi.',
      };
    case 'respinto':
      return {
        oggetto: `Richiesta di rimborso non accolta — ${nome}`,
        titolo: 'La tua richiesta non è stata accolta',
        corpo: `Abbiamo esaminato la tua richiesta su <b>${nome}</b>. Dalle `
             + 'verifiche non è emersa una difformità rispetto a quanto '
             + 'dichiarato dall\'autore, e l\'acquisto resta valido: '
             + 'l\'artefatto continua a essere tuo e utilizzabile.',
      };
    case 'ritirato':
      return {
        oggetto: `Richiesta di rimborso ritirata — ${nome}`,
        titolo: 'Hai ritirato la tua richiesta',
        corpo: `La richiesta su <b>${nome}</b> è stata chiusa su tua `
             + 'indicazione. Nessun rimborso è stato emesso e l\'acquisto '
             + 'resta valido. Se il problema si ripresenta puoi aprirne una '
             + 'nuova.',
      };
    default:
      return {
        oggetto: `Richiesta di rimborso chiusa — ${nome}`,
        titolo: 'La tua richiesta è stata chiusa',
        corpo: `La richiesta su <b>${nome}</b> è stata chiusa senza emettere `
             + 'un rimborso.',
      };
  }
}

export async function inviaEsitoRimborso(d: DatiEsitoRimborso): Promise<boolean> {
  const t = testiEsito(d);
  const importo = (d.esito === 'rimborsato' && d.importoCents)
    ? soldi(d.importoCents, d.valuta || 'EUR') : null;

  const righe: string[] = [];
  righe.push(`<p style="margin:0 0 14px">${t.corpo}</p>`);
  if (importo) {
    righe.push(`<p style="margin:0 0 14px;font-size:20px"><b>${importo}</b></p>`);
  }
  if (d.motivo) {
    // Il motivo si riporta testualmente: riassumerlo cambierebbe cio' che
    // e' stato deciso, e questa email e' il documento che resta.
    righe.push('<p style="margin:0 0 6px;font-size:12px;color:#6b7280;'
      + 'text-transform:uppercase;letter-spacing:.08em">Motivo</p>'
      + `<p style="margin:0 0 14px;padding:10px 12px;background:#f6f7f9;`
      + `border-radius:6px">${d.motivo}</p>`);
  }
  righe.push('<p style="margin:14px 0 0;font-size:13px;color:#6b7280">'
    + 'La conversazione resta consultabile nell\'applicazione, sezione '
    + 'Rimborso. Se qualcosa non ti torna, rispondi a questa email.</p>');
  righe.push(`<p style="margin:18px 0 0;font-size:11px;color:#9aa1ab">`
    + `Riferimento richiesta: ${d.claimId}</p>`);

  const html = `<div style="font-family:system-ui,-apple-system,Roboto,sans-serif;`
    + `max-width:560px;margin:0 auto;padding:24px;color:#111827">`
    + `<h2 style="margin:0 0 16px;font-size:19px">${t.titolo}</h2>`
    + righe.join('') + '</div>';

  // Il testo semplice non e' un ripiego: alcuni client mostrano solo quello,
  // e una email vuota sarebbe peggio di nessuna email.
  const testo = [t.titolo, '', t.corpo.replace(/<[^>]+>/g, ''),
                 importo ? `Importo: ${importo}` : '',
                 d.motivo ? `Motivo: ${d.motivo}` : '',
                 `Riferimento: ${d.claimId}`].filter(Boolean).join('\n');

  return inviaEmail(d.email, t.oggetto, testo, html);
}
