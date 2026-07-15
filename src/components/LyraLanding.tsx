"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { run } from "@/lib/landingBehaviors";
import { LANDING_HTML, LANDING_CSS } from "@/lib/lyraLandingContent";

// Comportamenti della landing (meno "modal": i CTA "beta" portano alla registrazione).
const BEHAVIORS = [
  "neural", "nav", "typewriter", "ring", "reveal", "count", "tabs", "steps",
  "profiles", "glow", "dataBorders", "arc", "statFit", "hscroll",
  "mobileLoops", "tabArrows", "stepTrail", "theme", "lang", "hover",
];

// Voci del sito mostrate direttamente nell'header della home.
// (Runner e Messaggi NON stanno qui: sono nel profilo.)
const NAV: [string, string][] = [
  ["/marketplace", "Marketplace"],
  ["/forum", "Forum"],
  ["/feedback", "Feedback"],
];

const NAV_LINK_CSS = "color: rgb(71, 85, 105); text-decoration:none;";
const MOB_LINK_CSS = "padding:9px 12px;border-radius:9px;font:600 13.5px Mulish,sans-serif;color: rgb(51, 65, 85);display:block;text-decoration:none;";

// Aggiunta UNA VOLTA: link diretti (Marketplace/Forum/Feedback) nell'header,
// e via il menu a tendina "Il motore/App" (non più usato).
function setupNavOnce() {
  const motore = document.querySelector<HTMLElement>("[data-motore-wrap]");
  if (motore) motore.style.display = "none";

  const navLinks = document.querySelector<HTMLElement>("[data-nav-links]");
  if (navLinks && !navLinks.querySelector("[data-site-nav]")) {
    NAV.forEach(([href, label]) => {
      const a = document.createElement("a");
      a.href = href; a.textContent = label;
      a.setAttribute("data-site-nav", "");
      a.style.cssText = NAV_LINK_CSS;
      navLinks.appendChild(a);
    });
  }

  const mob = document.querySelector<HTMLElement>("[data-nav-menu]");
  if (mob && !mob.querySelector("[data-site-nav]")) {
    // via i link alle sotto-pagine della landing originale (neutralizzati a #top)
    Array.from(mob.querySelectorAll('a[href="#top"]')).forEach((el) => el.remove());
    const divider = mob.querySelector("span");
    const ref = divider || mob.querySelector("[data-beta-open]");
    NAV.forEach(([href, label]) => {
      const a = document.createElement("a");
      a.href = href; a.textContent = label;
      a.setAttribute("data-site-nav", "");
      a.setAttribute("data-hover", "background:#F1F4F9");
      a.style.cssText = MOB_LINK_CSS;
      if (ref) mob.insertBefore(a, ref); else mob.appendChild(a);
    });
  }
}

// Aggiornata a OGNI cambio di sessione: se loggato mostra l'avatar del profilo
// (e nasconde "Registrati"), altrimenti mostra "Accedi" + il CTA di registrazione.
function updateAuth(user: { name?: string | null; email?: string | null } | null) {
  const cta = document.querySelector<HTMLElement>("[data-nav-cta]");
  const actions = cta?.parentElement || null;
  const mobBtn = document.querySelector<HTMLElement>("[data-nav-menu] [data-beta-open]");
  const mob = document.querySelector<HTMLElement>("[data-nav-menu]");

  // pulisci gli elementi auth precedenti
  document.querySelectorAll("[data-site-auth]").forEach((el) => el.remove());
  document.querySelectorAll("[data-site-auth-mobile]").forEach((el) => el.remove());

  if (user) {
    // loggato → avatar profilo, niente "Registrati"
    if (cta) cta.style.display = "none";
    if (mobBtn) mobBtn.style.display = "none";
    const initial = ((user.name || user.email || "?").trim().charAt(0) || "?").toUpperCase();
    if (actions && cta) {
      const a = document.createElement("a");
      a.href = "/profile"; a.textContent = initial;
      a.title = "Profilo — " + (user.name || user.email || "");
      a.setAttribute("data-site-auth", "");
      a.style.cssText = "display:grid;place-items:center;height:36px;width:36px;border-radius:999px;background: rgb(238, 241, 255);color: rgb(79, 70, 229);font:700 14px Mulish,sans-serif;text-decoration:none;flex:0 0 auto;";
      actions.insertBefore(a, cta);
    }
    if (mob) {
      const a = document.createElement("a");
      a.href = "/profile"; a.textContent = "Profilo";
      a.setAttribute("data-site-auth-mobile", "");
      a.setAttribute("data-hover", "background:#F1F4F9");
      a.style.cssText = MOB_LINK_CSS;
      const divider = mob.querySelector("span"); const ref = divider || mobBtn;
      if (ref) mob.insertBefore(a, ref); else mob.appendChild(a);
    }
  } else {
    // non loggato → "Accedi" + CTA "Registrati"
    if (cta) cta.style.display = "inline-flex";
    if (mobBtn) mobBtn.style.display = "inline-flex";
    if (actions && cta) {
      const a = document.createElement("a");
      a.href = "/login"; a.textContent = "Accedi";
      a.setAttribute("data-site-auth", "");
      a.style.cssText = "display:inline-flex;align-items:center;height:38px;padding:0 14px;border-radius:10px;font:700 13.5px Mulish,sans-serif;color: rgb(51, 65, 85);cursor:pointer;white-space:nowrap;text-decoration:none;";
      actions.insertBefore(a, cta);
    }
    if (mob) {
      const a = document.createElement("a");
      a.href = "/login"; a.textContent = "Accedi";
      a.setAttribute("data-site-auth-mobile", "");
      a.setAttribute("data-hover", "background:#F1F4F9");
      a.style.cssText = MOB_LINK_CSS;
      const divider = mob.querySelector("span"); const ref = divider || mobBtn;
      if (ref) mob.insertBefore(a, ref); else mob.appendChild(a);
    }
  }
}

export function LyraLanding() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const started = useRef(false);

  // Una volta: nav statica + avvio comportamenti + CTA beta → registrazione.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try { setupNavOnce(); } catch (e) { console.warn("setupNav", e); }
    const betas = Array.from(document.querySelectorAll<HTMLElement>("[data-beta-open]"));
    const onBeta = (e: Event) => { e.preventDefault(); router.push("/register"); };
    betas.forEach((b) => b.addEventListener("click", onBeta));
    run(BEHAVIORS);
    return () => { betas.forEach((b) => b.removeEventListener("click", onBeta)); };
  }, [router]);

  // A ogni cambio di stato sessione: aggiorna l'area login/profilo.
  useEffect(() => {
    if (status === "loading") return;
    try { updateAuth((session?.user as { name?: string | null; email?: string | null } | undefined) || null); }
    catch (e) { console.warn("updateAuth", e); }
  }, [status, session]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </>
  );
}
