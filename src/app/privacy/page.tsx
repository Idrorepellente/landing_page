import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/privacy';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Privacy Policy — Lyra",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR.",
  keywords: ['privacy policy', 'GDPR', 'trattamento dati', 'protezione dati personali'],
  openGraph: { title: "Privacy Policy — Lyra", description: "Informativa sul trattamento dei dati personali ai sensi del GDPR." },
  twitter: { title: "Privacy Policy — Lyra", description: "Informativa sul trattamento dei dati personali ai sensi del GDPR." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
