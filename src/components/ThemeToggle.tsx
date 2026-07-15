"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Toggle tema chiaro/scuro. Applica data-theme su <html>, persiste in
// localStorage ('qs-theme') e notifica lo sfondo neurale via evento.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(cur);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("qs-theme", next); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("qs-theme-change", { detail: next }));
  }

  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label="Cambia tema"
      title={dark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--muted)" }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        )}
      </svg>
    </button>
  );
}
