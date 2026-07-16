import { MOTORE_HTML, MOTORE_CSS } from "@/lib/landingContent";
import { LandingClient } from "@/components/LandingClient";

const BEHAVIORS = ["nav", "reveal", "map", "hover"];

export default function MotoreMappa() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOTORE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MOTORE_HTML }} />
      <LandingClient behaviors={BEHAVIORS} />
    </>
  );
}
