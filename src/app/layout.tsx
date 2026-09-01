import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lyra-capital.it'),
  // Icone dichiarate esplicitamente: non ci si affida al solo rilevamento dei
  // file in app/. L'.ico serve i browser che chiedono /favicon.ico da soli e
  // che tengono quel file in cache molto a lungo; l'SVG e' la versione buona
  // per gli schermi ad alta densita' e si adatta al tema chiaro/scuro.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  title: 'Lyra — Il workbench quantitativo',
  description: 'Costruisci strategie senza codice, validale con backtest riproducibili e mandale live sul tuo broker. Validation-first, local-first.',
  keywords: ['trading quantitativo', 'trading algoritmico', 'backtest', 'walk-forward', 'strategie di trading', 'no-code trading', 'ensemble', 'quant', 'automazione trading', 'validazione strategie', 'Lyra'],
  applicationName: 'Lyra',
  authors: [{ name: 'Lyra' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'Lyra',
    url: 'https://www.lyra-capital.it',
    title: 'Lyra — Il workbench quantitativo',
    description: 'Costruisci strategie senza codice, validale con backtest riproducibili e mandale live sul tuo broker.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyra — Il workbench quantitativo',
    description: 'Costruisci strategie senza codice, validale con backtest riproducibili e mandale live sul tuo broker.',
  },
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
