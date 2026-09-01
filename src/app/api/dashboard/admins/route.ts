import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSecret } from '@/lib/dashApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Restituisce alla dashboard l'elenco degli account abilitati alla sezione
// Admin. L'elenco vive SOLO qui, in ADMIN_EMAILS: la dashboard non lo conosce
// e non puo' modificarlo, coerentemente con la scelta di tenere le credenziali
// e le configurazioni sensibili nell'env del sito.
//
// Formato di ADMIN_EMAILS: indirizzi separati da virgola, punto e virgola o
// spazio. Il confronto e' case-insensitive.
//   ADMIN_EMAILS="io@example.com, altro@example.com"
export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const raw = process.env.ADMIN_EMAILS || '';
  const admins = raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  return NextResponse.json({ ok: true, admins, configured: admins.length > 0 });
}
