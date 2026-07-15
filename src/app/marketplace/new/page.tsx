"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const KINDS: [string, string][] = [["STRATEGY", "Strategia"], ["APPROACH", "Approccio"], ["INDICATOR", "Indicatore"], ["OVERLAY", "Overlay"], ["WEIGHT_MODE", "Weight mode"]];

export default function NewArtifact() {
  const router = useRouter();
  const [f, setF] = useState({ kind: "STRATEGY", name: "", description: "", code: "", tags: "", isPublic: true });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const upd = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/artifacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    setLoading(false);
    if (res.status === 401) { setErr("Devi accedere per pubblicare."); return; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error || "Errore"); return; }
    const a = await res.json();
    router.push(`/marketplace/${a.id}`);
  }
  return (
    <div className="card mx-auto max-w-2xl">
      <h1 className="h-title mb-4">Pubblica un artefatto</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Tipo</label>
          <select className="select" value={f.kind} onChange={(e) => upd("kind", e.target.value)}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label className="label">Nome</label><input className="input" value={f.name} onChange={(e) => upd("name", e.target.value)} /></div>
        <div><label className="label">Descrizione</label><textarea className="textarea" rows={2} value={f.description} onChange={(e) => upd("description", e.target.value)} /></div>
        <div><label className="label">Tag (separati da virgola)</label><input className="input" value={f.tags} onChange={(e) => upd("tags", e.target.value)} /></div>
        <div><label className="label">Codice</label><textarea className="textarea font-mono" rows={12} value={f.code} onChange={(e) => upd("code", e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPublic} onChange={(e) => upd("isPublic", e.target.checked)} /> Rendi pubblico (visibile a tutti)</label>
        {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}
        <button className="btn btn-primary" disabled={loading}>{loading ? "..." : "Pubblica"}</button>
      </form>
    </div>
  );
}
