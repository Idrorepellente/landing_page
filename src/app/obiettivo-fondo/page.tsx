import { FONDO_HTML, FONDO_CSS } from "@/lib/landingContent";
import { LandingClient } from "@/components/LandingClient";

const BEHAVIORS = ["neural", "nav", "reveal", "hover"];

export default function ObiettivoFondo() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONDO_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: FONDO_HTML }} />
      <LandingClient behaviors={BEHAVIORS} />
    </>
  );
}
