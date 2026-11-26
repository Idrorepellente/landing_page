'use client';

import { useEffect, useState } from 'react';

// Pulsante "torna in cima" fisso in basso a destra. Compare dopo un po' di scroll
// e riporta dolcemente all'inizio della pagina corrente.
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Torna in cima"
      title="Torna in cima"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483000,
        height: '44px', width: '44px', placeItems: 'center',
        display: show ? 'grid' : 'none',
        borderRadius: '999px', cursor: 'pointer', border: 'none',
        background: '#5B57D9', color: '#fff',
        boxShadow: '0 10px 26px -8px rgba(24,24,27,.5)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
