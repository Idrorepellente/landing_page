import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/disclaimer';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Disclaimer — Lyra",
  description: "Avvertenze, finalità informativa e limitazioni di responsabilità.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
