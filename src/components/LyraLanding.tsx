"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { run } from "@/lib/landingBehaviors";
import { LANDING_HTML, LANDING_CSS } from "@/lib/lyraLandingContent";

// Stessi comportamenti della landing originale, MENO "modal": i CTA "beta"
// non aprono un popup ma portano alla registrazione del sito.
const BEHAVIORS = [
  "neural", "nav", "typewriter", "ring", "reveal", "count", "tabs", "steps",
  "profiles", "glow", "dataBorders", "arc", "statFit", "hscroll",
  "mobileLoops", "tabArrows", "stepTrail", "theme", "lang", "hover",
];

export function LyraLanding() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // evita doppio avvio (Strict Mode in dev)
    started.current = true;

    // I pulsanti "Entra nella beta / Prenota una call / Diventa data partner"
    // della landing entrano nel flusso reale del sito: registrazione.
    const betas = Array.from(document.querySelectorAll<HTMLElement>("[data-beta-open]"));
    const onBeta = (e: Event) => { e.preventDefault(); router.push("/register"); };
    betas.forEach((b) => b.addEventListener("click", onBeta));

    // Avvia canvas neurale, nav sticky, reveal, tab, contatori, tema, ecc.
    run(BEHAVIORS);

    return () => { betas.forEach((b) => b.removeEventListener("click", onBeta)); };
  }, [router]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </>
  );
}
