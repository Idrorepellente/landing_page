"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setErr("Credenziali non valide");
    else router.push("/marketplace");
  }
  return (
    <div className="card mx-auto max-w-sm">
      <h1 className="h-title mb-4">Accedi</h1>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {err && <div className="text-sm" style={{ color: "var(--negative)" }}>{err}</div>}
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? "..." : "Accedi"}</button>
      </form>
      <div className="muted mt-3 text-sm">Non hai un account? <Link href="/register" className="link">Registrati</Link></div>
    </div>
  );
}
