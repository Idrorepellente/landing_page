"use client";
import { useState } from "react";

export default function Feedback() {
  const [f, setF] = useState({ subject: "", message: "", rating: 5 });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) setSent(true);
    else setErr("Errore nell'invio");
  }
  if (sent)
    return (
      <div className="card mx-auto max-w-lg">
        <h1 className="h-title">Grazie!</h1>
        <p className="muted mt-2">Il tuo feedback e&#39; stato inviato.</p>
      </div>
    );
  return (
    <div className="card mx-auto max-w-lg">
      <h1 className="h-title mb-4">Feedback</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Oggetto</label><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
        <div><label className="label">Messaggio</label><textarea className="textarea" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
        <div><label className="label">Valutazione</label>
          <select className="select" value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
          </select>
        </div>
        {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}
        <button className="btn btn-primary">Invia feedback</button>
      </form>
    </div>
  );
}
