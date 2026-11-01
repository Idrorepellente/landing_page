import type { Metadata } from 'next';

/**
 * Pagina del marketplace sul SITO.
 *
 * Il checkout la usa come `cancel_url`: chi annulla il pagamento finisce qui,
 * e prima trovava un 404 — cioe' l'impressione di aver rotto qualcosa proprio
 * mentre faceva la cosa piu' innocua possibile, cambiare idea.
 *
 * La vetrina vera sta nell'applicazione, non qui: questa pagina serve solo
 * come approdo dei ritorni da Stripe.
 */
export const metadata: Metadata = {
  title: 'Marketplace — Lyra',
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: { searchParams?: { [k: string]: string | string[] | undefined } }) {
  // `cancelled` e' il parametro attuale; `annullato` resta per i link gia' emessi.
  const annullato = searchParams?.cancelled === '1' || searchParams?.annullato === '1';

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '32px',
      background: '#0b0e13', color: '#e6ebf2',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>
        <div style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#8b97a8', marginBottom: '14px',
        }}>
          Lyra · Marketplace
        </div>

        <h1 style={{ fontSize: '26px', lineHeight: 1.25, margin: '0 0 16px',
                     fontWeight: 700 }}>
          {annullato ? 'Payment cancelled' : 'Marketplace'}
        </h1>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 22px' }}>
          {annullato
            ? 'Nothing was charged. Go back to the Lyra application and try again whenever you like.'
            : 'The artifact storefront lives in the Lyra application, where you can try and install them.'}
        </p>

        <p style={{ marginTop: '26px', fontSize: '13px' }}>
          <a href="/" style={{ color: '#7fb2ff', textDecoration: 'none' }}>
            ← Back to the site
          </a>
        </p>
      </div>
    </main>
  );
}
