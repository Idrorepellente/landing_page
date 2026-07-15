import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET() {
  const threads = await prisma.forumThread.findMany({
    include: { author: { select: { username: true, displayName: true } }, _count: { select: { posts: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json(threads);
}

const schema = z.object({ title: z.string().min(3).max(160), category: z.string().max(40).optional(), body: z.string().min(1) });

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const { title, category, body } = parsed.data;
  const thread = await prisma.forumThread.create({
    data: { title, category: category || "general", authorId: uid, posts: { create: { body, authorId: uid } } },
  });
  return NextResponse.json(thread);
}
