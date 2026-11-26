'use client';

import { useEffect, useState } from 'react';

/**
 * Approdo dell'accesso con Google.
 *
 * Google rimanda al sito, non all'applicazione: il segreto del client deve
 * restare sul server. Qui si mostra il token perché l'utente lo riporti
 * nell'app — che gira in locale e non è raggiungibile da qui.
 *
 * Il token sta nel FRAMMENTO dell'indirizzo (dopo `#`): i frammenti non
 * vengono inviati al server, non finiscono nei log e non passano
 * nell'intestazione Referer verso terzi.
 */
export default function Page() {
  const [token, setToken] = useState('');
  const [errore, setErrore] = useState('');
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    const h = window.location.hash || '';
    const m = h.match(/token=([^&]+)/);
    if (m) {
      setToken(decodeURIComponent(m[1]));
      // si toglie dall'indirizzo: la cronologia del browser non deve
      // conservarlo
      history.replaceState(null, '', window.location.pathname);
      return;
    }
    const err = new URLSearchParams(window.location.search).get('err');
    if (err) {
      setErrore({
        config: 'L\u2019accesso con Google non è configurato sul sito.',
        state: 'Richiesta non riconosciuta: riprova dall\u2019applicazione.',
        token: 'Google non ha completato l\u2019accesso.',
        email: 'L\u2019indirizzo Google non risulta verificato.',
        scambio: 'Scambio con Google non riuscito.',
      }[err] || 'Accesso non riuscito.');
    }
  }, []);

  const S = {
    main: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '32px',
      background: '#0b0e13', color: '#e6ebf2',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    } as const,
    box: { maxWidth: '560px', width: '100%' } as const,
    occhiello: {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '11px',
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      color: '#8b97a8', marginBottom: '14px',
    },
    tok: {
      marginTop: '14px', padding: '12px 14px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px',
      wordBreak: 'break-all' as const, userSelect: 'all' as const,
    },
    btn: {
      marginTop: '14px', padding: '10px 18px', borderRadius: '9px',
      border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
      background: '#7f5cf0', color: '#fff',
    } as const,
  };

  return (
    <main style={S.main}>
      <div style={S.box}>
        <div style={S.occhiello}>Lyra · Accesso</div>

        {errore ? (
          <>
            <h1 style={{ fontSize: '24px', margin: '0 0 14px' }}>Accesso non riuscito</h1>
            <p style={{ color: '#c3ccd8', lineHeight: 1.6 }}>{errore}</p>
          </>
        ) : token ? (
          <>
            <h1 style={{ fontSize: '24px', margin: '0 0 14px' }}>Accesso completato</h1>
            <p style={{ color: '#c3ccd8', lineHeight: 1.6, margin: '0 0 6px' }}>
              Copia questo codice e incollalo nell&apos;applicazione, nel campo
              che ti sta aspettando.
            </p>
            <div style={S.tok}>{token}</div>
            <button
              style={S.btn}
              onClick={() => {
                navigator.clipboard?.writeText(token);
                setCopiato(true);
              }}
            >
              {copiato ? 'Copiato ✓' : 'Copia il codice'}
            </button>
            <p style={{ marginTop: '18px', fontSize: '12.5px', color: '#8b97a8',
                        lineHeight: 1.6 }}>
              Vale per questo accesso soltanto. Non condividerlo: chi lo ha
              entra nel tuo account.
            </p>
          </>
        ) : (
          <p style={{ color: '#c3ccd8' }}>Attendere…</p>
        )}
      </div>
    </main>
  );
}
