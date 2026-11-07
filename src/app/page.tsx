import type { Metadata } from 'next';
import { html, css } from '@/content/capital';

export const metadata: Metadata = {
  title: 'Lyra Capital — Se regge, va.',
  description:
    'Costruisci strategie senza codice, validale con backtest e walk-forward riproducibili, mandale live. Se superano il protocollo possono girare su conti certificati e andare in licenza ai gestori.',
  openGraph: { title: 'Lyra Capital — Se regge, va.', description: 'Dall’idea al capitale: strategie no-code, validazione, live e programma capitale.' },
  twitter: { title: 'Lyra Capital — Se regge, va.', description: 'Dall’idea al capitale: strategie no-code, validazione, live e programma capitale.' },
};

// Pagina STATICA: markup e CSS della landing sono letti a build-time da src/content
// e resi dal server, cosi' il testo e' tutto nell'HTML (indicizzabile) e non c'e'
// nessuna chiamata a runtime. Lo script in public/landing/landing.js fa partire
// loader, animazioni, lingua, tema e le pagine interne (#piattaforma, #prezzi…).
// E' un <script defer> normale, non next/script: deve partire appena il DOM e'
// pronto, prima dell'idratazione di React, altrimenti la pagina si vedrebbe per
// un istante senza il loader.
export default function Page() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Caveat:wght@700&family=Kaushan+Script&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="lyra-landing-live" dangerouslySetInnerHTML={{ __html: html }} />
      <script src="/landing/landing.js" defer />
    </>
  );
}
