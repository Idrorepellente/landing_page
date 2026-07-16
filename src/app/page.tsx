import { HOME_HTML, HOME_CSS } from "@/lib/landingContent";
import { LandingClient } from "@/components/LandingClient";

const BEHAVIORS = [
  "neural", "nav", "typewriter", "ring", "reveal", "count", "tabs", "steps",
  "profiles", "glow", "dataBorders", "modal", "arc", "statFit", "hscroll",
  "mobileLoops", "tabArrows", "stepTrail", "theme", "lang", "hover",
];

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HOME_HTML }} />
      <LandingClient behaviors={BEHAVIORS} />
    </>
  );
}
