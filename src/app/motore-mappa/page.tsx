import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/motore-mappa';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Mappa del motore — Lyra",
  description: "Il flusso del motore, nodo per nodo.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
