import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lyra — Il workbench quantitativo',
  description: 'Costruisci strategie senza codice, validale con backtest riproducibili e mandale live sul tuo broker. Validation-first, local-first.',
};

// Applica il tema PRIMA che il contenuto venga dipinto (niente flash). Le regole dark del
// design sono agganciate a body[data-theme="dark"], quindi impostiamo data-theme su <body>
// (e <html>) leggendo la scelta salvata in localStorage 'qs-theme' (default: chiaro).
const themeScript = "(function(){try{var t=localStorage.getItem('qs-theme')||'light';document.documentElement.setAttribute('data-theme',t);document.body.setAttribute('data-theme',t);}catch(e){}})();";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Mulish:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
