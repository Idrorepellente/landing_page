import type { Metadata } from 'next';
import StaticPage from '@/components/StaticPage';
import { html, css } from '@/content/landing';
import { DARK_CSS } from '@/content/darkTheme';

export const metadata: Metadata = {
  title: "Lyra — Il workbench quantitativo",
  description: "Dall’idea al live. Se regge, va.",
};

export default function Page() {
  return <StaticPage html={html} css={css + DARK_CSS} />;
}
