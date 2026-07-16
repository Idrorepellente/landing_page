'use client';

import { useEffect, useState } from 'react';

const MOON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);
const SUN = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

// Pulsante tema chiaro/scuro. Fisso in basso a destra: funziona su tutte le pagine,
// indipendentemente dalla struttura della nav. Applica data-theme su <html> e <body>
// (le regole dark del design sono agganciate a body[data-theme="dark"] e discendenti).
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    try { localStorage.setItem('qs-theme', next); } catch (e) {}
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={dark ? 'Tema chiaro' : 'Tema scuro'}
      suppressHydrationWarning
      style={{
        position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483000,
        height: '44px', width: '44px', display: 'grid', placeItems: 'center',
        borderRadius: '999px', cursor: 'pointer', border: '1px solid',
        borderColor: dark ? 'rgba(255,255,255,.16)' : 'rgba(15,23,42,.12)',
        background: dark ? '#1c1c1f' : '#ffffff',
        color: dark ? '#f4f4f5' : '#18181b',
        boxShadow: '0 8px 24px -8px rgba(0,0,0,.35)',
        transition: 'background .2s, color .2s, border-color .2s',
      }}
    >
      {mounted ? (dark ? SUN : MOON) : null}
    </button>
  );
}
