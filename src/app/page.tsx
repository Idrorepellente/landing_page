import { LANDING_HTML, LANDING_CSS } from "@/lib/lyraLandingContent";
import { LandingClient } from "@/components/LandingClient";

// La home è la landing LYRA. HTML e CSS sono resi DAL SERVER (bundle client leggero,
// pagina completa al primo paint); il piccolo componente client avvia i comportamenti.
export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
      <LandingClient />
    </>
  );
}
