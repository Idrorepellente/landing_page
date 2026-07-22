import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Deve girare su runtime Node (l'invio SMTP non è possibile sul runtime Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Parametri della posta Register.it usati come default.
const REGISTER_SMTP_HOST = 'authsmtp.securemail.pro';
const REGISTER_SMTP_PORT = 465;

/**
 * Invio email per conto dell'app desktop.
 *
 * L'app chiama questo endpoint quando ha configurato BASE_URL + DASHBOARD_API_SECRET,
 * così le credenziali della casella restano SOLO qui sul server e non vengono
 * distribuite con l'app.
 *
 * Richiesta:  POST /api/dashboard/email
 *   header    x-dashboard-secret: <DASHBOARD_API_SECRET>
 *   body      { to, subject, text, html }
 * Risposta:   { sent: true } | { sent: false, error }
 *
 * Variabili d'ambiente da impostare su Vercel:
 *   DASHBOARD_API_SECRET   stessa stringa configurata nell'app
 *   SMTP_USER              indirizzo completo della casella (es. noreply@lyra-capital.it)
 *   SMTP_PASS              password della casella
 *   EMAIL_FROM             mittente mostrato (facoltativo, default = SMTP_USER)
 *   SMTP_HOST / SMTP_PORT  facoltativi (default: Register.it, 465 SSL)
 */
export async function POST(req: Request) {
  const secret = (process.env.DASHBOARD_API_SECRET || '').trim();
  if (!secret) {
    return NextResponse.json(
      { sent: false, error: 'DASHBOARD_API_SECRET non configurato sul sito' },
      { status: 500 },
    );
  }
  if ((req.headers.get('x-dashboard-secret') || '').trim() !== secret) {
    return NextResponse.json({ sent: false, error: 'segreto non valido' }, { status: 401 });
  }

  let body: { to?: string; subject?: string; text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ sent: false, error: 'JSON non valido' }, { status: 400 });
  }

  const to = (body.to || '').trim();
  const subject = (body.subject || '').trim();
  if (!to || !subject || (!body.text && !body.html)) {
    return NextResponse.json(
      { sent: false, error: 'campi obbligatori: to, subject, text/html' },
      { status: 400 },
    );
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return NextResponse.json(
      { sent: false, error: 'SMTP_USER / SMTP_PASS non configurati sul sito' },
      { status: 500 },
    );
  }

  const host = process.env.SMTP_HOST || REGISTER_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || (host === REGISTER_SMTP_HOST ? REGISTER_SMTP_PORT : 587);

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL implicito; 587 = STARTTLS
      auth: { user, pass },
    });

    await transport.sendMail({
      from: process.env.EMAIL_FROM || `Lyra <${user}>`,
      to,
      subject,
      text: body.text || undefined,
      html: body.html || undefined,
    });

    return NextResponse.json({ sent: true });
  } catch (e) {
    console.error('[dashboard/email] invio fallito:', e);
    return NextResponse.json(
      { sent: false, error: e instanceof Error ? e.message : 'invio fallito' },
      { status: 502 },
    );
  }
}
