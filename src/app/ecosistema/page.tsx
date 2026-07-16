import { ECO_HTML, ECO_CSS } from "@/lib/landingContent";
import { LandingClient } from "@/components/LandingClient";

const BEHAVIORS = ["neural", "nav", "reveal", "hover"];

export default function Ecosistema() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ECO_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: ECO_HTML }} />
      <LandingClient behaviors={BEHAVIORS} />
    </>
  );
}
