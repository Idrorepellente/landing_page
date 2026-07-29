import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/obiettivo-fondo';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Obiettivo · Fondo — Lyra",
  description: "Dove punta il capitale collettivo.",
  keywords: ['fondo collettivo', 'revenue share', 'fondo quant', 'investimento collettivo', 'trading sistematico'],
  openGraph: { title: "Obiettivo · Fondo — Lyra", description: "Dove punta il capitale collettivo." },
  twitter: { title: "Obiettivo · Fondo — Lyra", description: "Dove punta il capitale collettivo." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
