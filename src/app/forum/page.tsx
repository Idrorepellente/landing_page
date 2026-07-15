"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Thread = { id: string; title: string; category: string; author: { username: string }; _count: { posts: number } };

export default function Forum() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  async function load() {
    const r = await fetch("/api/forum");
    if (r.ok) setThreads(await r.json());
  }
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body }) });
    if (r.ok) { setTitle(""); setBody(""); setOpen(false); load(); }
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="h-title">Forum</h1>
        {session?.user && <button className="btn btn-primary" onClick={() => setOpen((v) => !v)}>Nuova discussione</button>}
      </div>
      {open && (
        <form onSubmit={create} className="card space-y-3">
          <div><label className="label">Titolo</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="label">Messaggio</label><textarea className="textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <button className="btn btn-primary">Pubblica</button>
        </form>
      )}
      <div className="space-y-2">
        {threads.map((t) => (
          <Link key={t.id} href={`/forum/${t.id}`} className="card card-hover flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="muted text-xs">@{t.author.username} &middot; {t.category}</div>
            </div>
            <span className="pill">{t._count.posts} post</span>
          </Link>
        ))}
        {threads.length === 0 && <div className="muted text-sm">Nessuna discussione.</div>}
      </div>
    </div>
  );
}
