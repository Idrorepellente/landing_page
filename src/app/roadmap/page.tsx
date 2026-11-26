import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/roadmap';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Roadmap — Lyra",
  description: "Costruiamo in pubblico: release trasparenti e milestone misurabili.",
  keywords: ['roadmap', 'release', 'sviluppo prodotto', 'milestone', 'opzioni', 'marketplace'],
  openGraph: { title: "Roadmap — Lyra", description: "Costruiamo in pubblico: release trasparenti e milestone misurabili." },
  twitter: { title: "Roadmap — Lyra", description: "Costruiamo in pubblico: release trasparenti e milestone misurabili." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
