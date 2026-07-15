import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const q = searchParams.get("q");
  const artifacts = await prisma.artifact.findMany({
    where: {
      isPublic: true,
      ...(kind ? { kind: kind as never } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { owner: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(artifacts);
}

const schema = z.object({
  kind: z.enum(["STRATEGY", "APPROACH", "INDICATOR", "OVERLAY", "WEIGHT_MODE"]),
  name: z.string().min(1).max(80),
  description: z.string().max(1000).optional(),
  code: z.string().min(1),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "artifact";
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const d = parsed.data;
  const slug = slugify(d.name);
  const artifact = await prisma.artifact.upsert({
    where: { ownerId_kind_slug: { ownerId: uid, kind: d.kind, slug } },
    update: { name: d.name, description: d.description, code: d.code, tags: d.tags ?? [], isPublic: d.isPublic ?? false },
    create: { ownerId: uid, kind: d.kind, name: d.name, slug, description: d.description, code: d.code, tags: d.tags ?? [], isPublic: d.isPublic ?? false },
  });
  return NextResponse.json(artifact);
}
