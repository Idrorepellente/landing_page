"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Post = { id: string; body: string; createdAt: string; author: { username: string } };
type Thread = { id: string; title: string; category: string; author: { username: string }; posts: Post[] };

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: session } = useSession();
  const [thread, setThread] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  async function load() {
    if (!id) return;
    const r = await fetch(`/api/forum/${id}`);
    if (r.ok) setThread(await r.json());
  }
  useEffect(() => { load(); }, [id]);
  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/forum/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    if (r.ok) { setBody(""); load(); }
  }
  if (!thread) return <div className="muted">Caricamento&hellip;</div>;
  return (
    <div className="space-y-4">
      <Link href="/forum" className="link text-sm">&larr; Forum</Link>
      <h1 className="h-title">{thread.title}</h1>
      <div className="muted text-xs">@{thread.author.username} &middot; {thread.category}</div>
      <div className="space-y-2">
        {thread.posts.map((p) => (
          <div key={p.id} className="card">
            <div className="muted mb-1 text-xs">@{p.author.username} &middot; {new Date(p.createdAt).toLocaleString()}</div>
            <div className="whitespace-pre-wrap text-sm">{p.body}</div>
          </div>
        ))}
      </div>
      {session?.user ? (
        <form onSubmit={reply} className="card space-y-2">
          <label className="label">Rispondi</label>
          <textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn btn-primary">Invia</button>
        </form>
      ) : (
        <div className="muted text-sm">Accedi per rispondere.</div>
      )}
    </div>
  );
}
