import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const thread = await prisma.forumThread.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { username: true } },
      posts: { include: { author: { select: { username: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) return NextResponse.json({ error: "non trovato" }, { status: 404 });
  return NextResponse.json(thread);
}

const schema = z.object({ body: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const post = await prisma.forumPost.create({ data: { threadId: params.id, authorId: uid, body: parsed.data.body } });
  return NextResponse.json(post);
}
