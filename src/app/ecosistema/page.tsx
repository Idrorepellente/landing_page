import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/ecosistema';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Il motore — Lyra",
  description: "Il motore quantitativo di Lyra, area per area.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
