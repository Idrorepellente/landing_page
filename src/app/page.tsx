import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/landing';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Lyra — Il workbench quantitativo",
  description: "Dall’idea al live. Se regge, va.",
  keywords: ['workbench quantitativo', 'trading quantitativo', 'backtest', 'walk-forward', 'strategie no-code', 'live trading', 'broker', 'ensemble', 'quant'],
  openGraph: { title: "Lyra — Il workbench quantitativo", description: "Dall’idea al live. Se regge, va." },
  twitter: { title: "Lyra — Il workbench quantitativo", description: "Dall’idea al live. Se regge, va." },
};

// Pagina STATICA: nessun I/O a runtime, così si genera staticamente su Vercel
// (il refactor legge gli .html via fs a BUILD-time). Il conteggio reale degli
// iscritti beta viene recuperato lato client da behaviors.js (GET /api/beta) e
// aggiorna il contatore; "500+" resta come fallback nell'HTML statico.
export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
