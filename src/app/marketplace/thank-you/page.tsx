import type { Metadata } from 'next';

/**
 * Pagina di ritorno dopo un acquisto riuscito (`success_url` del checkout).
 *
 * Mancava, come quella del venditore: chi pagava si trovava un 404 subito
 * dopo aver speso del denaro — il momento peggiore per far credere che
 * qualcosa sia andato storto.
 *
 * Il testo NON dice "acquisto completato" con certezza assoluta: essere qui
 * significa che Stripe ha riportato indietro il browser, ma la licenza si apre
 * quando arriva il webhook `checkout.session.completed`. Nella quasi totalita'
 * dei casi e' gia' successo; se cosi' non fosse, dire il contrario creerebbe
 * un'attesa sbagliata.
 */
export const metadata: Metadata = {
  title: 'Acquisto completato — Lyra',
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
          Lyra · Marketplace
        </div>

        <h1 style={{ fontSize: '26px', lineHeight: 1.25, margin: '0 0 16px',
                     fontWeight: 700 }}>
          Pagamento ricevuto
        </h1>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 14px' }}>
          Grazie. L&apos;accesso all&apos;artefatto viene attivato appena Stripe
          conferma il pagamento: di norma è immediato.
        </p>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 22px' }}>
          <strong style={{ color: '#e6ebf2' }}>Torna nell&apos;applicazione</strong> e
          apri il Marketplace: troverai l&apos;artefatto fra i tuoi acquisti,
          pronto da installare. Se non compare entro qualche minuto, riapri la
          pagina del prodotto — l&apos;accesso viene ricontrollato ogni volta.
        </p>

        <div style={{
          padding: '13px 15px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          fontSize: '13.5px', lineHeight: 1.6, color: '#a9b4c2',
        }}>
          La ricevuta arriva via email da Stripe. Il pagamento è stato diviso
          alla fonte: la quota del marketplace resta alla piattaforma, il resto
          va all&apos;autore.
        </div>

        <p style={{ marginTop: '26px', fontSize: '13px' }}>
          <a href="/" style={{ color: '#7fb2ff', textDecoration: 'none' }}>
            ← Torna al sito
          </a>
        </p>
      </div>
    </main>
  );
}
