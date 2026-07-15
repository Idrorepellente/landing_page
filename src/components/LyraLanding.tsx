"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { run } from "@/lib/landingBehaviors";
import { LANDING_HTML, LANDING_CSS } from "@/lib/lyraLandingContent";

// Comportamenti della landing (meno "modal": i CTA "beta" portano alla registrazione).
const BEHAVIORS = [
  "neural", "nav", "typewriter", "ring", "reveal", "count", "tabs", "steps",
  "profiles", "glow", "dataBorders", "arc", "statFit", "hscroll",
  "mobileLoops", "tabArrows", "stepTrail", "theme", "lang", "hover",
];

// Le funzioni del sito, raggiungibili dall'header della landing.
const APP: [string, string, string][] = [
  ["/marketplace", "Marketplace", "Strategie, overlay e indicatori"],
  ["/forum", "Forum", "Discussioni e confronto"],
  ["/runners", "Runner", "I tuoi runner live"],
  ["/messages", "Messaggi", "Le tue conversazioni"],
  ["/feedback", "Feedback", "Segnala e proponi"],
];

// Inserisce la navigazione verso le pagine del sito dentro l'header della landing:
// - trasforma il menu a tendina "Il motore" in un menu "App" con tutte le funzioni;
// - aggiunge un link "Accedi" accanto al CTA (che porta a /register);
// - popola anche il menu mobile.
function wireSiteNav() {
  // ----- menu a tendina desktop -----
  const trigger = document.querySelector<HTMLElement>("[data-motore-wrap] > a");
  if (trigger && trigger.firstChild && trigger.firstChild.nodeType === 3) {
    trigger.firstChild.nodeValue = "App";
  }
  const menuInner = document.querySelector<HTMLElement>("[data-motore-menu] > div");
  if (menuInner) {
    menuInner.innerHTML = APP.map(
      ([href, title, sub]) => `
      <a href="${href}" style="display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:10px;color: rgb(15, 23, 42);">
        <span style="flex:0 0 auto;display:grid;place-items:center;height:34px;width:34px;border-radius:10px;background: rgb(238, 241, 255);color: rgb(79, 70, 229);font:700 14px 'Space Grotesk',sans-serif;">${title.charAt(0)}</span>
        <span style="display:flex;flex-direction:column;gap:1px;">
          <span style="font:700 13.5px Mulish,sans-serif;color: rgb(15, 23, 42);">${title}</span>
          <span style="font:500 11.5px Mulish,sans-serif;color: rgb(148, 163, 184);">${sub}</span>
        </span>
      </a>`
    ).join("");
  }

  // ----- link "Accedi" accanto al CTA (desktop) -----
  const cta = document.querySelector<HTMLElement>("[data-nav-cta]");
  if (cta && cta.parentElement && !cta.parentElement.querySelector("[data-site-login]")) {
    const a = document.createElement("a");
    a.href = "/login";
    a.textContent = "Accedi";
    a.setAttribute("data-site-login", "");
    a.style.cssText =
      "display:inline-flex;align-items:center;height:38px;padding:0 14px;border-radius:10px;font:700 13.5px Mulish,sans-serif;color: rgb(51, 65, 85);cursor:pointer;white-space:nowrap;";
    cta.parentElement.insertBefore(a, cta);
  }

  // ----- menu mobile -----
  const mob = document.querySelector<HTMLElement>("[data-nav-menu]");
  if (mob && !mob.querySelector("[data-site-applink]")) {
    // via i link alle sotto-pagine della landing originale (neutralizzati a #top)
    Array.from(mob.querySelectorAll('a[href="#top"]')).forEach((el) => el.remove());
    const linkStyle =
      "padding:9px 12px;border-radius:9px;font:600 13.5px Mulish,sans-serif;color: rgb(51, 65, 85);display:block;";
    const frag = document.createDocumentFragment();
    [...APP.map(([h, t]) => [h, t] as [string, string]), ["/login", "Accedi"] as [string, string]].forEach(
      ([href, label]) => {
        const a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        a.setAttribute("data-site-applink", "");
        a.setAttribute("data-hover", "background:#F1F4F9");
        a.style.cssText = linkStyle;
        frag.appendChild(a);
      }
    );
    const divider = mob.querySelector("span");
    const ref = divider || mob.querySelector("[data-beta-open]");
    if (ref) mob.insertBefore(frag, ref);
    else mob.appendChild(frag);
  }
}

export function LyraLanding() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 1) collega la navigazione del sito dentro l'header della landing
    try { wireSiteNav(); } catch (e) { console.warn("wireSiteNav", e); }

    // 2) i CTA "beta" della landing → registrazione del sito
    const betas = Array.from(document.querySelectorAll<HTMLElement>("[data-beta-open]"));
    const onBeta = (e: Event) => { e.preventDefault(); router.push("/register"); };
    betas.forEach((b) => b.addEventListener("click", onBeta));

    // 3) avvia canvas, nav sticky, reveal, tab, contatori, tema, ecc.
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
