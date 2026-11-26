import type { Metadata } from 'next';

/**
 * Pagina di ritorno dalla registrazione del venditore.
 *
 * Stripe rimanda qui (`return_url`) quando l'utente esce dal proprio modulo.
 * Mancava, e chi completava la registrazione si trovava un 404: sembrava che
 * qualcosa fosse andato storto proprio nel momento in cui era andato bene.
 *
 * ATTENZIONE al testo: essere reindirizzati qui NON significa che la
 * verifica sia conclusa. Stripe lo dice esplicitamente — il ritorno prova
 * solo che il modulo e' stato aperto e chiuso correttamente, non che tutti i
 * dati siano stati raccolti. Lo stato vero arriva dopo, con l'evento
 * `account.updated`, e si legge nell'applicazione. Scrivere "sei verificato"
 * qui sarebbe una bugia comoda che poi si scopre da soli.
 */
export const metadata: Metadata = {
  title: 'Registrazione venditore — Lyra',
  description: 'Registrazione del conto per gli incassi completata.',
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
          Registrazione inviata a Stripe
        </h1>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 14px' }}>
          Hai completato il modulo. Da qui in avanti se ne occupa Stripe: i dati
          che hai inserito vengono verificati, e quando il conto è abilitato a
          incassare lo stato si aggiorna da solo.
        </p>

        <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#c3ccd8',
                    margin: '0 0 22px' }}>
          <strong style={{ color: '#e6ebf2' }}>Torna nell&apos;applicazione</strong>,
          apri il Marketplace e premi <em>Incassi</em>: lì vedi lo stato reale del
          tuo conto. Se risulta ancora in corso, la verifica non è finita —
          richiede qualche minuto, e in alcuni casi Stripe chiede altri
          documenti.
        </p>

        <div style={{
          padding: '13px 15px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          fontSize: '13.5px', lineHeight: 1.6, color: '#a9b4c2',
        }}>
          Puoi chiudere questa pagina. Le tue coordinate bancarie e i documenti
          restano su Stripe: non passano da Lyra e non vengono conservati qui.
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
