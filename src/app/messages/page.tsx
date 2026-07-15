"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Conv = { id: string; participants: { user: { id: string; username: string } }[]; messages: { body: string }[] };
type Msg = { id: string; body: string; createdAt: string; sender: { id: string; username: string } };

export default function Messages() {
  const { data: session } = useSession();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [newUser, setNewUser] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function loadConvs() {
    const r = await fetch("/api/conversations");
    if (r.ok) setConvs(await r.json());
  }
  async function loadMsgs(id: string) {
    const r = await fetch(`/api/messages?conversationId=${id}`);
    if (r.ok) setMsgs(await r.json());
  }
  useEffect(() => { if (session?.user) loadConvs(); }, [session]);
  useEffect(() => {
    if (!active) return;
    loadMsgs(active);
    const t = setInterval(() => loadMsgs(active), 3000); // polling MVP (upgradabile a SSE/WebSocket)
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function startConv(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: newUser }) });
    if (r.ok) { const c = await r.json(); setNewUser(""); await loadConvs(); setActive(c.id); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    const body = text;
    setText("");
    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: active, body }) });
    loadMsgs(active);
  }
  const convName = (c: Conv) => {
    const other = c.participants.find((p) => p.user.id !== uid);
    return other ? `@${other.user.username}` : "conversazione";
  };

  if (!session?.user)
    return (
      <div className="card mx-auto max-w-lg">
        <h1 className="h-title">Messaggi</h1>
        <p className="muted mt-2">Accedi per usare la chat.</p>
      </div>
    );
  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="card space-y-3">
        <form onSubmit={startConv} className="flex gap-2">
          <input className="input" placeholder="username" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
          <button className="btn btn-primary">+</button>
        </form>
        <div className="space-y-1">
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className="w-full rounded-lg px-3 py-2 text-left"
              style={{ background: active === c.id ? "var(--surface-2)" : "transparent" }}>
              <div className="text-sm font-medium">{convName(c)}</div>
              <div className="muted truncate text-xs">{c.messages[0]?.body ?? "\u2014"}</div>
            </button>
          ))}
          {convs.length === 0 && <div className="muted text-sm">Nessuna conversazione.</div>}
        </div>
      </div>
      <div className="card flex flex-col" style={{ minHeight: 420 }}>
        {active ? (
          <>
            <div className="flex-1 space-y-2 overflow-auto pr-1">
              {msgs.map((m) => {
                const mine = m.sender.id === uid;
                return (
                  <div key={m.id} className={mine ? "text-right" : "text-left"}>
                    <div className="inline-block rounded-lg px-3 py-2 text-sm"
                      style={{ background: mine ? "var(--accent)" : "var(--surface-2)", color: mine ? "#fff" : "var(--text)", maxWidth: "80%" }}>
                      {m.body}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="mt-3 flex gap-2">
              <input className="input" placeholder="Messaggio&hellip;" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary">Invia</button>
            </form>
          </>
        ) : (
          <div className="muted m-auto">Seleziona o avvia una conversazione.</div>
        )}
      </div>
    </div>
  );
}
