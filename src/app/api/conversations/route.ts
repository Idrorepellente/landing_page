import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const convs = await prisma.conversation.findMany({
    where: { participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(convs);
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const username = String(body.username || "").trim();
  if (!username) return NextResponse.json({ error: "username mancante" }, { status: 400 });
  const other = await prisma.user.findUnique({ where: { username } });
  if (!other || other.id === uid) return NextResponse.json({ error: "utente non trovato" }, { status: 404 });
  const existing = await prisma.conversation.findFirst({
    where: { AND: [{ participants: { some: { userId: uid } } }, { participants: { some: { userId: other.id } } }] },
  });
  if (existing) return NextResponse.json(existing);
  const conv = await prisma.conversation.create({ data: { participants: { create: [{ userId: uid }, { userId: other.id }] } } });
  return NextResponse.json(conv);
}
