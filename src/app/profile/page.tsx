"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type Cfg = {
  strategies?: string[]; approaches?: string[]; overlays?: string[];
  weight_mode?: string; brokers?: { kind?: string }[]; broker?: string; initial_cash?: number;
};
type Runner = { id: string; name: string; status: string; config: Cfg; createdAt: string; updatedAt: string };
type Artifact = { id: string; name: string; kind: string; slug: string; isPublic: boolean; likes: number; description?: string | null; updatedAt: string };
type User = { id: string; email: string; username: string; displayName?: string | null; bio?: string | null; image?: string | null; createdAt: string };
type Stats = {
  runners: number; runnersRunning: number;
  artifacts: { total: number; public: number; private: number; byKind: Record<string, number> };
  forumPosts: number; forumThreads: number;
};
type Profile = { user: User; stats: Stats; runners: Runner[]; artifacts: Artifact[] };

const KIND_LABEL: Record<string, string> = { STRATEGY: "Strategia", APPROACH: "Approccio", INDICATOR: "Indicatore", OVERLAY: "Overlay", WEIGHT_MODE: "Weight mode" };
const KIND_ORDER = ["STRATEGY", "APPROACH", "OVERLAY", "WEIGHT_MODE", "INDICATOR"];

function fmtDate(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return s; }
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", bio: "" });

  async function load() {
    setErr("");
    const r = await fetch("/api/profile");
    if (r.ok) {
      const d: Profile = await r.json();
      setP(d);
      setForm({ displayName: d.user.displayName ?? "", bio: d.user.bio ?? "" });
    } else {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Errore nel caricamento del profilo");
      setP(null);
    }
  }
  useEffect(() => { if (session?.user) load(); }, [session]);

  async function saveProfile() {
    const r = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) { setEditing(false); load(); }
    else { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore nel salvataggio"); }
  }

  async function toggleRun(rn: Runner) {
    const status = rn.status === "running" ? "stopped" : "running";
    const r = await fetch("/api/runners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rn.id, status }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore"); }
    load();
  }
  async function deleteRunner(rn: Runner) {
    if (!confirm(`Eliminare il runner "${rn.name}"? L'operazione non è reversibile.`)) return;
    const r = await fetch(`/api/runners?id=${encodeURIComponent(rn.id)}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore nell'eliminazione"); }
    load();
  }
  async function toggleArtifactPublic(a: Artifact) {
    const r = await fetch(`/api/artifacts/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic: !a.isPublic }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore"); }
    load();
  }
  async function deleteArtifact(a: Artifact) {
    if (!confirm(`Eliminare "${a.name}" dal tuo account sul sito? L'operazione non è reversibile.`)) return;
    const r = await fetch(`/api/artifacts/${a.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore nell'eliminazione"); }
    load();
  }

  if (!session?.user)
    return (
      <div className="card mx-auto max-w-lg">
        <h1 className="h-title">Profilo</h1>
        <p className="muted mt-2">Accedi per vedere il tuo profilo, i runner caricati e i tuoi artefatti.</p>
        <div className="mt-3 flex gap-2"><Link href="/login" className="btn">Accedi</Link><Link href="/register" className="btn btn-primary">Registrati</Link></div>
      </div>
    );

  if (!p) return <div className="muted text-sm">{err || "Caricamento…"}</div>;

  const u = p.user;
  const byKind = p.stats.artifacts.byKind;

  return (
    <div className="space-y-5">
      {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}

      {/* Header account */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {(u.displayName || u.username || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="h-title">{u.displayName || u.username}</h1>
              <div className="muted text-sm">@{u.username} · {u.email}</div>
              <div className="muted text-xs mt-0.5">Membro dal {fmtDate(u.createdAt)}</div>
            </div>
          </div>
          {!editing && (
            <div className="flex shrink-0 items-center gap-2">
              <button className="btn" onClick={() => setEditing(true)}>Modifica</button>
              <button className="btn" onClick={() => signOut({ callbackUrl: "/" })} title="Esci dall'account"
                style={{ borderColor: "var(--border-strong)", color: "var(--negative)" }}>Esci</button>
            </div>
          )}
        </div>

        {u.bio && !editing && <p className="mt-3 text-sm" style={{ color: "var(--text)" }}>{u.bio}</p>}

        {editing && (
          <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div><label className="label">Nome visualizzato</label><input className="input" value={form.displayName} onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))} /></div>
            <div><label className="label">Bio</label><textarea className="textarea" rows={3} value={form.bio} onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))} placeholder="Due righe su di te, il tuo stile di trading, i mercati che segui…" /></div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={saveProfile}>Salva</button>
              <button className="btn" onClick={() => { setEditing(false); setForm({ displayName: u.displayName ?? "", bio: u.bio ?? "" }); }}>Annulla</button>
            </div>
          </div>
        )}
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Runner" value={p.stats.runners} sub={`${p.stats.runnersRunning} in esecuzione`} />
        <Stat label="Artefatti" value={p.stats.artifacts.total} sub={`${p.stats.artifacts.public} pubblici · ${p.stats.artifacts.private} privati`} />
        <Stat label="Post nel forum" value={p.stats.forumPosts} sub={`${p.stats.forumThreads} discussioni`} />
        <Stat label="Like ricevuti" value={p.artifacts.reduce((n, a) => n + (a.likes || 0), 0)} sub="sugli artefatti" />
      </div>

      {/* Runner caricati */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Runner caricati</h2>
          <Link href="/runners" className="link text-sm">Vai ai runner →</Link>
        </div>
        <div className="space-y-2">
          {p.runners.map((rn) => {
            const c = rn.config || {};
            const broker = c.brokers?.[0]?.kind ?? c.broker ?? "?";
            return (
              <div key={rn.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{rn.name}</div>
                  <div className="muted text-xs">
                    {(c.strategies?.length ?? 0)} strat · {(c.approaches?.length ?? 0)} appr · {(c.overlays?.length ?? 0)} overlay · broker {broker} · wm {c.weight_mode ?? "?"}
                  </div>
                  <div className="text-xs" style={{ color: rn.status === "running" ? "var(--positive)" : "var(--muted)" }}>{rn.status} · agg. {fmtDate(rn.updatedAt)}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn" onClick={() => toggleRun(rn)}>{rn.status === "running" ? "Ferma" : "Avvia"}</button>
                  <button className="btn" style={{ color: "var(--negative)" }} onClick={() => deleteRunner(rn)}>Elimina</button>
                </div>
              </div>
            );
          })}
          {p.runners.length === 0 && <div className="card muted text-sm">Nessun runner caricato. Creane uno dall&#39;app e usa &ldquo;Carica sul server&rdquo;.</div>}
        </div>
      </div>

      {/* Artefatti */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">I miei artefatti</h2>
          <Link href="/marketplace/new" className="link text-sm">Pubblica →</Link>
        </div>
        {p.artifacts.length === 0 ? (
          <div className="card muted text-sm">Nessun artefatto nel tuo account. Pubblicali dal sito o caricali dall&#39;app (Studio → Sito).</div>
        ) : (
          <div className="space-y-4">
            {KIND_ORDER.filter((k) => byKind[k]).map((k) => (
              <div key={k}>
                <div className="muted mb-1 text-xs uppercase tracking-wide">{KIND_LABEL[k]} ({byKind[k]})</div>
                <div className="space-y-2">
                  {p.artifacts.filter((a) => a.kind === k).map((a) => (
                    <div key={a.id} className="card flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          <span className="pill" style={a.isPublic ? {} : { background: "var(--surface-2)", color: "var(--muted)" }}>{a.isPublic ? "pubblico" : "privato"}</span>
                        </div>
                        {a.description && <div className="muted line-clamp-1 text-sm">{a.description}</div>}
                        <div className="muted text-xs">agg. {fmtDate(a.updatedAt)}{a.likes ? ` · ${a.likes} like` : ""}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.isPublic && <Link href={`/marketplace/${a.id}`} className="btn btn-ghost link">Apri</Link>}
                        <button className="btn" onClick={() => toggleArtifactPublic(a)}>{a.isPublic ? "Rendi privato" : "Rendi pubblico"}</button>
                        <button className="btn" style={{ color: "var(--negative)" }} onClick={() => deleteArtifact(a)}>Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card">
      <div className="muted text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="muted text-xs">{sub}</div>}
    </div>
  );
}
