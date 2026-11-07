import type { Metadata } from 'next';
import { html, css } from '@/content/capital';

export const metadata: Metadata = {
  title: 'Lyra Capital',
  description:
    'Costruisci strategie senza codice, validale con backtest e walk-forward riproducibili, mandale live. Se superano il protocollo possono girare su conti certificati e andare in licenza ai gestori.',
  openGraph: { title: 'Lyra Capital', description: 'Dall’idea al capitale: strategie no-code, validazione, live e programma capitale.' },
  twitter: { title: 'Lyra Capital', description: 'Dall’idea al capitale: strategie no-code, validazione, live e programma capitale.' },
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
      {/* Tema scelto prima di disegnare qualsiasi cosa, cosi' lo sfondo e' quello giusto fin dal primo frame */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            '(function(){var t=null;try{t=localStorage.getItem("lyra-tema")}catch(e){}if(t!=="chiaro"&&t!=="scuro"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"chiaro":"scuro"}document.documentElement.setAttribute("data-tema",t)})();',
        }}
      />
      {/* La landing resta invisibile finche' stile, script e caratteri non sono pronti (landing.js aggiunge .lyra-pronta) */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'html:not(.lyra-pronta) .lyra-landing-live{visibility:hidden}html:not(.lyra-pronta){background:#000}html[data-tema="chiaro"]:not(.lyra-pronta){background:#fff}',
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="lyra-landing-live" dangerouslySetInnerHTML={{ __html: html }} />
      <script src="/landing/landing.js" defer />
    </>
  );
}
