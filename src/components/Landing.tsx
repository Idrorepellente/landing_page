"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Artifact = { id: string; name: string; kind: string; description: string | null; owner: { username: string } };
type Stats = { strategies: number; members: number };

const KIND_LABEL: Record<string, string> = { STRATEGY: "Strategia", APPROACH: "Approccio", INDICATOR: "Indicatore", OVERLAY: "Overlay", WEIGHT_MODE: "Weight mode" };

// ---- reveal-on-scroll: aggiunge .is-in agli elementi [data-reveal] quando entrano in viewport ----
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => {
        if (e.isIntersecting) {
          const d = parseInt(e.target.getAttribute("data-reveal-d") || "0", 10);
          (e.target as HTMLElement).style.transitionDelay = d / 1000 + "s";
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ---- count-up ----
function CountUp({ to, suffix = "", decimals = 0, prefix = "" }: { to: number; suffix?: string; decimals?: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          const t0 = performance.now();
          const dur = 1400;
          const frame = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  const fmt = val.toLocaleString("it-IT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref}>{prefix}{fmt}{suffix}</span>;
}

function Stat({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div data-reveal className="text-center">
      <div className="display text-3xl font-extrabold" style={{ color: "var(--text)" }}>{children}</div>
      <div className="muted mt-1 text-xs font-semibold">{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc, tone = "accent" }: { icon: React.ReactNode; title: string; desc: string; tone?: "accent" | "accent2" }) {
  return (
    <div data-reveal className="card card-hover">
      <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: tone === "accent2" ? "var(--accent-2-soft)" : "var(--accent-soft)", color: tone === "accent2" ? "var(--accent-2)" : "var(--accent)" }}>
        {icon}
      </div>
      <div className="display mt-3 font-bold" style={{ color: "var(--text)" }}>{title}</div>
      <p className="muted mt-1 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// mini icone (currentColor)
const I = {
  spark: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6.3 6.3 4.2 4.2M19.8 19.8l-2.1-2.1M17.7 6.3l2.1-2.1M4.2 19.8l2.1-2.1" /><circle cx="12" cy="12" r="3.2" /></svg>,
  layers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>,
  chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  grid: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></svg>,
};

export function Landing({ recent, stats }: { recent: Artifact[]; stats: Stats }) {
  useReveal();
  return (
    <div className="space-y-20 pb-10">
      {/* ============ HERO ============ */}
      <section className="grid items-center gap-10 pt-6 md:grid-cols-2">
        <div data-reveal>
          <span className="pill-2">Community QuantSys</span>
          <h1 className="display mt-4 text-4xl font-extrabold leading-tight md:text-5xl" style={{ color: "var(--text)" }}>
            La miglior community per <span className="grad-text">trader quant</span>
          </h1>
          <p className="muted mt-4 max-w-xl text-base leading-relaxed">
            Costruisci, valida e automatizza le tue strategie — con test onesti, accanto alla community e al tuo capitale.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="btn-cta">Entra nella community</Link>
            <Link href="/marketplace" className="btn">Esplora il marketplace</Link>
          </div>
          <div className="muted mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5"><Dot /> Validazione walk-forward OOS</span>
            <span className="inline-flex items-center gap-1.5"><Dot /> Ensemble multi-strategia</span>
            <span className="inline-flex items-center gap-1.5"><Dot /> Overlay per regime</span>
          </div>
        </div>

        {/* visual: card segnali */}
        <div data-reveal data-reveal-d="120" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: "var(--grad-accent)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              </span>
              <span className="display text-sm font-bold">Live board</span>
            </div>
            <span className="pill">Sharpe 1.6</span>
          </div>
          <div className="p-4">
            <Sparkline />
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Chip label="12 nuovi segnali" tone="accent" />
              <Chip label="Backtest OK" tone="accent2" />
              <Chip label="+2,1% oggi" tone="pos" />
              <Chip label="Watchlist · 12" tone="accent" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STAT BAND ============ */}
      <section data-reveal className="card">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Strategie condivise"><CountUp to={stats.strategies} suffix="+" /></Stat>
          <Stat label="Membri della community"><CountUp to={stats.members} suffix="+" /></Stat>
          <Stat label="Broker & exchange"><CountUp to={10} suffix="+" /></Stat>
          <Stat label="Mercati & classi"><CountUp to={5} suffix="+" /></Stat>
          <Stat label="Metodi di pesatura"><CountUp to={8} suffix="+" /></Stat>
          <Stat label="Overlay per regime"><CountUp to={6} suffix="+" /></Stat>
        </div>
      </section>

      {/* ============ PROBLEMA → SOLUZIONE ============ */}
      <section>
        <SectionHead eyebrow="Dai problemi alle soluzioni" title="Una piattaforma che risolve ogni frizione"
          sub="Dall'intuizione al reddito reale: l'AI, la validazione onesta e l'automazione che ti tolgono ogni attrito." />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={I.spark} title="Il copilota AI al tuo fianco" desc="Descrivi l'idea in linguaggio naturale: l'AI capisce mercato, rischio e stile e propone regole, indicatori e filtri su misura. Niente più pagine bianche." />
          <Feature icon={I.chart} tone="accent2" title="Tutto in un'unica dashboard" desc="Editor, backtest, broker e portafoglio allineati in un solo posto. Basta rincorrere dieci tab, chat e fogli di calcolo." />
          <Feature icon={I.shield} title="Backtest onesti, go-live immediato" desc="Validazione walk-forward fuori campione (OOS): distingue l'edge reale dall'illusione da backtest. Numeri trasparenti e conferma in un clic." />
          <Feature icon={I.layers} tone="accent2" title="Ensemble multi-strategia" desc="Combina più strategie in un unico portafoglio con metodi professionali: risk parity, HRP, Black–Litterman, CVaR, Kelly, ERC e altri." />
          <Feature icon={I.grid} title="Overlay per regime" desc="Gate che riducono l'esposizione quando il contesto cambia: impennate di volatilità, salti, correlazioni che esplodono, stress multivariato, risk-off macro." />
          <Feature icon={I.users} tone="accent2" title="Tre modi per creare" desc="A parole (AI), a blocchi (editor a nodi) o a codice. La stessa piattaforma serve il novizio e l'esperto — e ogni output passa dal controllo di sicurezza." />
        </div>
      </section>

      {/* ============ COME FUNZIONA ============ */}
      <section>
        <SectionHead eyebrow="Come funziona" title="Dall'idea al runner live in tre passi"
          sub="Un flusso lineare che mette la disciplina istituzionale dentro lo strumento, non come opzione avanzata." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Descrivi" desc="Racconta l'idea a parole, disegnala a nodi o scrivila a codice. Il sistema genera la strategia e la valida." />
          <Step n={2} title="Valida (OOS)" desc="Walk-forward fuori campione, ensemble e overlay per regime: vedi l'edge reale, non l'illusione da backtest." />
          <Step n={3} title="Automatizza" desc="Configura un runner — strategie, approcci, overlay, pesatura e broker — e portalo in live in dry-run o demo." />
        </div>
      </section>

      {/* ============ COSA CI RENDE DIVERSI ============ */}
      <section>
        <SectionHead eyebrow="Il cuneo competitivo" title="Cosa ci rende diversi"
          sub="La serietà di una piattaforma professionale con l'accessibilità e la community che hanno reso enormi gli strumenti di massa." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Pillar title="Ti incontriamo al tuo livello" desc="Parole, blocchi o codice: copriamo entrambi gli estremi e tutto il mezzo. La stessa piattaforma serve il principiante e il semi-professionista." />
          <Pillar title="La disciplina è dentro lo strumento" desc="Validazione OOS, ensemble e difesa per regime fanno parte del flusso normale — non un privilegio per chi già sa cosa sono." />
          <Pillar title="Motore + community" desc="Il rigore di una piattaforma professionale unito a marketplace, forum e fondo collettivo: si impara dagli altri e dagli esempi reali." />
        </div>
      </section>

      {/* ============ COMMUNITY & FONDO ============ */}
      <section data-reveal className="card overflow-hidden">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div>
            <span className="pill-2">Community &amp; Fondo</span>
            <h3 className="display mt-3 text-2xl font-bold" style={{ color: "var(--text)" }}>Impara dagli altri, cresci col tuo capitale</h3>
            <p className="muted mt-2 text-sm leading-relaxed">
              Pubblica e scopri strategie, approcci, overlay e metodi di pesatura fatti da altri. Confrontati nel forum,
              segui esempi reali con performance verificabili e abbassa la curva di apprendimento.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/forum" className="btn-cta">Vai al forum</Link>
              <Link href="/marketplace" className="btn">Scopri le strategie</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat big="OOS" small="Validazione onesta" />
            <MiniStat big="8+" small="Metodi di pesatura" />
            <MiniStat big="24/7" small="Runner in demo" />
            <MiniStat big="0€" small="Per iniziare" />
          </div>
        </div>
      </section>

      {/* ============ ULTIMI PUBBLICATI (dati reali) ============ */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <SectionHead eyebrow="Dalla community" title="Ultimi pubblicati" compact />
          <Link href="/marketplace" className="link text-sm font-semibold">Tutti gli artefatti →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card muted text-sm">Nessun artefatto pubblico ancora. Pubblica il primo dal marketplace o dall&#39;app.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((a) => (
              <Link key={a.id} href={`/marketplace/${a.id}`} className="card card-hover" data-reveal>
                <div className="flex items-center justify-between">
                  <span className="pill">{KIND_LABEL[a.kind] ?? a.kind}</span>
                  <span className="muted text-xs">@{a.owner.username}</span>
                </div>
                <div className="mt-2 font-semibold" style={{ color: "var(--text)" }}>{a.name}</div>
                <div className="muted line-clamp-2 text-sm">{a.description}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ============ CTA FINALE ============ */}
      <section data-reveal className="card text-center" style={{ background: "var(--grad-accent)", borderColor: "transparent" }}>
        <h3 className="display text-2xl font-extrabold md:text-3xl" style={{ color: "#fff" }}>Pronto a fare sul serio con il quant?</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>
          Unisciti alla community, valida le tue idee con test onesti e automatizza ciò che funziona.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/register" className="btn" style={{ background: "#fff", color: "var(--accent-strong)", borderColor: "#fff" }}>Crea un account</Link>
          <Link href="/marketplace" className="btn" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>Esplora</Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t pt-8" style={{ borderColor: "var(--border)" }}>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: "var(--grad-accent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              </span>
              <span className="display font-bold" style={{ color: "var(--text)" }}>Quant<span style={{ color: "var(--accent)" }}>Sys</span></span>
            </div>
            <p className="muted mt-2 max-w-xs text-sm">Il quant sistematico, per ogni trader: accessibilità, disciplina e community.</p>
          </div>
          <FooterCol title="Piattaforma" links={[["/marketplace", "Marketplace"], ["/runners", "Runner live"], ["/forum", "Forum"]]} />
          <FooterCol title="Community" links={[["/messages", "Messaggi"], ["/feedback", "Feedback"], ["/register", "Registrati"]]} />
          <FooterCol title="Account" links={[["/profile", "Profilo"], ["/login", "Accedi"]]} />
        </div>
        <div className="muted mt-8 text-xs">© {new Date().getFullYear()} QuantSys · Il trading comporta rischi. Nessun contenuto è consulenza finanziaria.</div>
      </footer>
    </div>
  );
}

/* ---- sotto-componenti ---- */
function Dot() { return <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-2)" }} />; }

function SectionHead({ eyebrow, title, sub, compact }: { eyebrow: string; title: string; sub?: string; compact?: boolean }) {
  return (
    <div data-reveal className={compact ? "" : "mx-auto max-w-2xl text-center"}>
      <span className="pill">{eyebrow}</span>
      <h2 className="display mt-3 text-2xl font-bold md:text-3xl" style={{ color: "var(--text)" }}>{title}</h2>
      {sub && <p className="muted mt-2 text-sm leading-relaxed">{sub}</p>}
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div data-reveal className="card card-hover">
      <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{n}</div>
      <div className="display mt-3 font-bold" style={{ color: "var(--text)" }}>{title}</div>
      <p className="muted mt-1 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Pillar({ title, desc }: { title: string; desc: string }) {
  return (
    <div data-reveal className="card card-hover">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
      <div className="display mt-3 font-bold" style={{ color: "var(--text)" }}>{title}</div>
      <p className="muted mt-1 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function MiniStat({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <div className="display text-xl font-extrabold" style={{ color: "var(--text)" }}>{big}</div>
      <div className="muted text-xs">{small}</div>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "accent" | "accent2" | "pos" }) {
  const map = {
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    accent2: { bg: "var(--accent-2-soft)", fg: "var(--accent-2)" },
    pos: { bg: "var(--accent-2-soft)", fg: "var(--positive)" },
  }[tone];
  return <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: map.bg, color: map.fg }}>{label}</div>;
}

function Sparkline() {
  return (
    <svg viewBox="0 0 320 72" width="100%" height="72" preserveAspectRatio="none">
      <defs>
        <linearGradient id="qsSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 20 L240 26 L270 12 L300 16 L320 8" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0 58 L30 52 L60 55 L90 40 L120 44 L150 30 L180 34 L210 20 L240 26 L270 12 L300 16 L320 8 L320 72 L0 72 Z" fill="url(#qsSpark)" stroke="none" />
    </svg>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="display text-sm font-bold" style={{ color: "var(--text)" }}>{title}</div>
      <div className="mt-2 flex flex-col gap-1.5">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="muted text-sm hover:underline">{label}</Link>
        ))}
      </div>
    </div>
  );
}
