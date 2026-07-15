"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/forum", label: "Forum" },
  { href: "/runners", label: "Runner" },
  { href: "/messages", label: "Messaggi" },
  { href: "/feedback", label: "Feedback" },
];

export function Nav() {
  const path = usePathname() || "/";
  const { data: session } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;
  // L'icona del profilo sta a DESTRA; il logout ("Esci") è dentro la pagina Profilo.
  const initial = ((user?.name || user?.email || "?").trim().slice(0, 1) || "?").toUpperCase();
  const onProfile = path.startsWith("/profile");
  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ borderColor: "var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ background: "var(--grad-accent)", boxShadow: "0 6px 16px -6px var(--accent)" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </span>
          <span className="display text-lg font-bold" style={{ color: "var(--text)" }}>
            LY<span style={{ color: "var(--accent)" }}>RA</span>
          </span>
        </Link>
        <nav className="hidden gap-1 text-sm md:flex">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 font-semibold"
                style={{ color: active ? "var(--text)" : "var(--muted)", background: active ? "var(--surface-2)" : "transparent" }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <ThemeToggle />
          {user ? (
            <Link
              href="/profile"
              aria-label="Profilo"
              title={`Profilo — ${user.name || user.email}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", boxShadow: onProfile ? "0 0 0 2px var(--accent)" : "none" }}
            >
              {initial}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn">Accedi</Link>
              <Link href="/register" className="btn-cta">Registrati</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
