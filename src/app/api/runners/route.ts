import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const runners = await prisma.runner.findMany({ where: { ownerId: uid }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(runners);
}

const schema = z.object({ name: z.string().min(1).max(80), config: z.record(z.any()).optional() });

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const config = (parsed.data.config ?? {}) as { broker?: string };
  // I runner creati da sito non possono usare MT5 (richiede il PC dell'utente).
  if (config.broker === "mt5") {
    return NextResponse.json({ error: "broker MT5 non ammesso da sito (richiede il terminale MetaTrader sul PC dell'utente)" }, { status: 400 });
  }
  const r = await prisma.runner.create({ data: { ownerId: uid, name: parsed.data.name, config: parsed.data.config ?? {} } });
  return NextResponse.json(r);
}

export async function PATCH(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!body.id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  const r = await prisma.runner.findUnique({ where: { id: String(body.id) } });
  if (!r || r.ownerId !== uid) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  const status = body.status === "running" ? "running" : "stopped";
  // Guardia: non avviare da sito un runner con broker MT5.
  if (status === "running") {
    const cfg = (r.config ?? {}) as { broker?: string };
    if (cfg.broker === "mt5") {
      return NextResponse.json({ error: "runner con broker MT5 non avviabile da sito (richiede il terminale MetaTrader sul PC dell'utente)" }, { status: 400 });
    }
  }
  const updated = await prisma.runner.update({ where: { id: r.id }, data: { status } });
  return NextResponse.json(updated);
}

// Elimina un runner dell'utente. L'id puo' arrivare da querystring (?id=...) o dal body JSON.
export async function DELETE(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  let id = searchParams.get("id") || "";
  if (!id) {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    id = String(body.id || "");
  }
  if (!id) return NextResponse.json({ error: "id mancante" }, { status: 400 });
  const r = await prisma.runner.findUnique({ where: { id } });
  if (!r || r.ownerId !== uid) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  await prisma.runner.delete({ where: { id: r.id } });
  return NextResponse.json({ ok: true, id: r.id });
}
