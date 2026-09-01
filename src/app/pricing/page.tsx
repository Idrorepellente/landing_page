import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/pricing';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Pricing — Lyra",
  description: "Il primo anno è gratis. Poi paghi la capacità, mai i profitti.",
  keywords: ['prezzi', 'piani', 'abbonamento', 'costi', 'freemium', 'quant'],
  openGraph: { title: "Pricing — Lyra", description: "Il primo anno è gratis. Poi paghi la capacità, mai i profitti." },
  twitter: { title: "Pricing — Lyra", description: "Il primo anno è gratis. Poi paghi la capacità, mai i profitti." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
