import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

async function isParticipant(conversationId: string, uid: string) {
  return !!(await prisma.conversationParticipant.findFirst({ where: { conversationId, userId: uid } }));
}

export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId mancante" }, { status: 400 });
  if (!(await isParticipant(conversationId, uid))) return NextResponse.json({ error: "non autorizzato" }, { status: 403 });
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, username: true } } },
    orderBy: { createdAt: "asc" }, take: 200,
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const conversationId = String(body.conversationId || "").trim();
  const text = String(body.body || "").trim();
  if (!conversationId || !text) return NextResponse.json({ error: "dati mancanti" }, { status: 400 });
  if (!(await isParticipant(conversationId, uid))) return NextResponse.json({ error: "non autorizzato" }, { status: 403 });
  const msg = await prisma.message.create({ data: { conversationId, senderId: uid, body: text } });
  return NextResponse.json(msg);
}
