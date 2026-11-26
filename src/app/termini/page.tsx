import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/termini';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Termini e Condizioni — Lyra",
  description: "Termini e condizioni d'uso della piattaforma Lyra.",
  keywords: ['termini e condizioni', 'termini di utilizzo', 'condizioni contrattuali', 'regolamento'],
  openGraph: { title: "Termini e Condizioni — Lyra", description: "Termini e condizioni d'uso della piattaforma Lyra." },
  twitter: { title: "Termini e Condizioni — Lyra", description: "Termini e condizioni d'uso della piattaforma Lyra." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
