"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", username: "", password: "", displayName: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const upd = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Errore");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: f.email, password: f.password, redirect: false });
    setLoading(false);
    router.push("/marketplace");
  }
  return (
    <div className="card mx-auto max-w-sm">
      <h1 className="h-title mb-4">Registrati</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Username</label><input className="input" value={f.username} onChange={(e) => upd("username", e.target.value)} /></div>
        <div><label className="label">Nome visualizzato</label><input className="input" value={f.displayName} onChange={(e) => upd("displayName", e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={f.password} onChange={(e) => upd("password", e.target.value)} /></div>
        {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? "..." : "Crea account"}</button>
      </form>
      <div className="muted mt-3 text-sm">Hai gia&#39; un account? <Link href="/login" className="link">Accedi</Link></div>
    </div>
  );
}
