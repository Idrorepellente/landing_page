import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Invia un'email (codici di conferma/reset) via Resend usando le chiavi del sito.
export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const to = body?.to;
  const subject = body?.subject;
  const text = body?.text || '';
  const html = body?.html || '';
  if (!to || !subject) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const from = process.env.EMAIL_FROM || 'Lira <onboarding@resend.dev>';
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ sent: false, error: 'RESEND_API_KEY non configurata sul sito' }, { status: 500 });
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ sent: false, error: t }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (e: any) {
    return NextResponse.json({ sent: false, error: String(e?.message || e) }, { status: 500 });
  }
}
