import Behaviors from '@/components/Behaviors';
import HeaderControls from '@/components/HeaderControls';
import BackToTop from '@/components/BackToTop';

/** Renders a design-component page: injects scoped CSS + markup, mounts the shared
 *  behaviors, the header controls (logo→home + theme toggle) and the back-to-top button. */
export default function StaticPage({ html, css }: { html: string; css: string }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div id="lyra-root" dangerouslySetInnerHTML={{ __html: html }} />
      <Behaviors />
      <HeaderControls />
      <BackToTop />
    </>
  );
}
