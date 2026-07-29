import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/rischi';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Avvertenza sui rischi — Lyra",
  description: "Informazioni sui rischi del trading e degli investimenti.",
  keywords: ['rischi trading', 'avvertenza sui rischi', 'rischio di perdita', 'leva finanziaria', 'volatilita'],
  openGraph: { title: "Avvertenza sui rischi — Lyra", description: "Informazioni sui rischi del trading e degli investimenti." },
  twitter: { title: "Avvertenza sui rischi — Lyra", description: "Informazioni sui rischi del trading e degli investimenti." },
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
