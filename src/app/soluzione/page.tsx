import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/soluzione';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "La nostra soluzione — Lyra",
  description: "Il workbench quant completo, dall’idea al live.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
