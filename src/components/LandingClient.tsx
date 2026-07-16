"use client";

import { useEffect, useRef } from "react";
import { run } from "@/lib/landingBehaviors";

// L'HTML/CSS della landing arriva dal server (bundle client leggero); qui si avviano
// solo i comportamenti (canvas, nav, reveal, tab, contatori, tema, mappa, modal…).
export function LandingClient({ behaviors }: { behaviors: string[] }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try { run(behaviors); } catch (e) { console.warn("run", e); }
  }, [behaviors]);
  return null;
}
