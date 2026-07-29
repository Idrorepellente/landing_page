import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/cookie';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Cookie Policy — Lyra",
  description: "Informativa sull'uso dei cookie e delle tecnologie analoghe.",
  keywords: ['cookie policy', 'cookie', 'tecnologie di tracciamento', 'privacy'],
  openGraph: { title: "Cookie Policy — Lyra", description: "Informativa sull'uso dei cookie e delle tecnologie analoghe." },
  twitter: { title: "Cookie Policy — Lyra", description: "Informativa sull'uso dei cookie e delle tecnologie analoghe." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
