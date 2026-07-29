import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/termini';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Termini e Condizioni — Lyra",
  description: "Termini e condizioni d'uso della piattaforma Lyra.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
