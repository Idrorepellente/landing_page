import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const schema = z.object({
  subject: z.string().min(1).max(160),
  message: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const uid = await getUserId();
  const fb = await prisma.feedback.create({ data: { ...parsed.data, userId: uid ?? undefined } });
  return NextResponse.json({ id: fb.id });
}
