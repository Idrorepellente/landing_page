"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type RunnerCfg = { strategies?: string[]; approaches?: string[]; overlays?: string[]; weight_mode?: string; broker?: string; initial_cash?: number };
type Runner = { id: string; name: string; status: string; config: RunnerCfg };

// Sola lettura: i runner si creano e configurano dall'APP (dashboard) e vengono
// caricati sul server; qui si vedono soltanto, con avvio/arresto. Nessuna creazione da sito.
export default function Runners() {
  const { data: session } = useSession();
  const [runners, setRunners] = useState<Runner[]>([]);
  const [err, setErr] = useState("");

  async function loadRunners() {
    const r = await fetch("/api/runners");
    if (r.ok) setRunners(await r.json());
    else setRunners([]);
  }
  useEffect(() => { if (session?.user) loadRunners(); }, [session]);

  async function toggleRun(rn: Runner) {
    const status = rn.status === "running" ? "stopped" : "running";
    const r = await fetch("/api/runners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rn.id, status }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore"); }
    loadRunners();
  }

  async function deleteRunner(rn: Runner) {
    if (!confirm(`Eliminare il runner "${rn.name}"? L'operazione non è reversibile.`)) return;
    const r = await fetch(`/api/runners?id=${encodeURIComponent(rn.id)}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error || "Errore nell'eliminazione"); }
    loadRunners();
  }

  if (!session?.user)
    return (
      <div className="card mx-auto max-w-lg">
        <h1 className="h-title">Runner live</h1>
        <p className="muted mt-2">Accedi per vedere i tuoi runner.</p>
      </div>
    );

  return (
    <div className="space-y-5">
      <h1 className="h-title">Runner live</h1>
      <p className="muted text-sm">I runner si creano e configurano dall&#39;app (dashboard). Qui appaiono quelli caricati sul server; puoi avviarli, fermarli o eliminarli.</p>
      {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}
      <div className="space-y-2">
        {runners.map((rn) => (
          <div key={rn.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{rn.name}</div>
              <div className="muted text-xs">
                {(rn.config?.strategies?.length ?? 0)} strat &middot; {(rn.config?.approaches?.length ?? 0)} appr &middot; {(rn.config?.overlays?.length ?? 0)} overlay &middot; broker {rn.config?.broker ?? "?"} &middot; wm {rn.config?.weight_mode ?? "?"}
              </div>
              <div className="text-xs" style={{ color: rn.status === "running" ? "var(--positive)" : "var(--muted)" }}>{rn.status}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="btn" onClick={() => toggleRun(rn)}>{rn.status === "running" ? "Ferma" : "Avvia"}</button>
              <button className="btn" style={{ color: "var(--negative)" }} onClick={() => deleteRunner(rn)}>Elimina</button>
            </div>
          </div>
        ))}
        {runners.length === 0 && (
          <div className="card muted text-sm">Nessun runner caricato. Creane uno dall&#39;app e usa &ldquo;Carica sul server&rdquo; per farlo apparire qui.</div>
        )}
      </div>
    </div>
  );
}
