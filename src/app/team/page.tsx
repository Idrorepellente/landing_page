import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/team';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Team — Lyra",
  description: "Quattro fondatori, un metodo.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
