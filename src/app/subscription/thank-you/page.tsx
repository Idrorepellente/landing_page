import type { Metadata } from 'next';

/**
 * Pagina di ritorno dopo l'attivazione di un abbonamento (`success_url`).
 *
 * Il testo NON dichiara l'abbonamento attivo con certezza: essere qui
 * significa che Stripe ha riportato indietro il browser, ma il livello si
 * scrive quando arriva il webhook. Nella quasi totalita' dei casi e' gia'
 * successo; dire il contrario creerebbe un'attesa sbagliata nel momento
 * peggiore, cioe' subito dopo aver speso del denaro.
 */
export const metadata: Metadata = {
  title: 'Subscription active — Lyra',
  robots: { index: false, follow: false },
};

export default function Page() {
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
          Lyra · Subscription
        </div>

        <h1 style={{ fontSize: '26px', lineHeight: 1.25, margin: '0 0 16px',
                     fontWeight: 700 }}>
          Payment received
        </h1>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 14px' }}>
          Thank you. Your plan is activated as soon as Stripe confirms the
          payment, which is normally immediate.
        </p>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 22px' }}>
          <strong style={{ color: '#e6ebf2' }}>Go back to the application</strong>:
          the <em>My subscription</em> page updates by itself and shows your
          plan, and publishing to the marketplace unlocks with it. If it does
          not appear within a few minutes, reload the page — the level is
          re-checked every time.
        </p>

        <div style={{
          padding: '13px 15px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          fontSize: '13.5px', lineHeight: 1.6, color: '#a9b4c2',
        }}>
          The subscription renews on its own until you cancel it. You can
          cancel, change the payment method or download invoices at any time
          from <strong style={{ color: '#e6ebf2' }}>Manage subscription</strong>,
          in the same place.
        </div>
      </div>
    </main>
  );
}
