import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lyra-capital.it'),
  // Icone: vengono dai file in src/app (favicon.ico, icon.svg, icon1.png 192x192, apple-icon.png).
  // Next le dichiara da solo nel <head> e, quando ci sono i file, ignora un eventuale campo `icons` qui.
  // Il PNG a 192 px (multiplo di 48) e' quello che Google preferisce per l'icona nei risultati di ricerca.
  title: 'Lyra Capital — il desk quant che gira sul tuo computer',
  description: 'Costruisci strategie con codice Python, blocchi o un copilota AI locale, validale fuori campione con walk-forward e Monte Carlo e portale verso il live. Gratis, con i tuoi dati.',
  keywords: ['trading quantitativo', 'trading algoritmico', 'backtest', 'walk-forward', 'strategie di trading', 'no-code trading', 'ensemble', 'quant', 'automazione trading', 'validazione strategie', 'Lyra'],
  applicationName: 'Lyra Capital',
  authors: [{ name: 'Lyra Capital' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'Lyra Capital',
    url: 'https://www.lyra-capital.it',
    title: 'Lyra Capital — il desk quant che gira sul tuo computer',
    description: 'Codice, blocchi o copilota AI locale; walk-forward, Monte Carlo e portafoglio; verso il live. Gratis, con i tuoi dati.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyra Capital — il desk quant che gira sul tuo computer',
    description: 'Codice, blocchi o copilota AI locale; walk-forward, Monte Carlo e portafoglio; verso il live. Gratis, con i tuoi dati.',
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
