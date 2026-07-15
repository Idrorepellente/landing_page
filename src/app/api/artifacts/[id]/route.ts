import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await prisma.artifact.findUnique({
    where: { id: params.id },
    include: { owner: { select: { username: true, displayName: true } } },
  });
  if (!a) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  const uid = await getUserId();
  if (!a.isPublic && a.ownerId !== uid) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  return NextResponse.json(a);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const a = await prisma.artifact.findUnique({ where: { id: params.id } });
  if (!a || a.ownerId !== uid) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const updated = await prisma.artifact.update({
    where: { id: params.id },
    data: { isPublic: typeof body.isPublic === "boolean" ? body.isPublic : a.isPublic },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const a = await prisma.artifact.findUnique({ where: { id: params.id } });
  if (!a || a.ownerId !== uid) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  await prisma.artifact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
