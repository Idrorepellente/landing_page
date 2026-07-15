import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ingest degli ARTEFATTI (strategie / approcci / overlay / weight mode / indicatori)
// caricati dall'APP verso il proprio account sul sito. Auth server-to-server:
// stesso schema dell'upload runner -> segreto condiviso (QUANTSYS_UPLOAD_SECRET)
// + username/email per associare l'artefatto all'account. L'app decide se
// pubblicarlo (isPublic=true, visibile nel marketplace) o tenerlo privato.
const schema = z.object({
  secret: z.string().min(1),
  username: z.string().min(1),
  kind: z.enum(["STRATEGY", "APPROACH", "INDICATOR", "OVERLAY", "WEIGHT_MODE"]),
  name: z.string().min(1).max(80),
  description: z.string().max(1000).optional(),
  code: z.string().min(1),
  language: z.string().max(32).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "artifact";
}

export async function POST(req: Request) {
  const secret = process.env.QUANTSYS_UPLOAD_SECRET || "";
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload non valido" }, { status: 400 });
  const b = parsed.data;
  if (!secret || b.secret !== secret) {
    return NextResponse.json({ error: "segreto non valido o non configurato sul sito" }, { status: 401 });
  }
  const username = b.username.trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
    select: { id: true, email: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "nessun account con username/email = " + username }, { status: 404 });

  const slug = slugify(b.name);
  const existing = await prisma.artifact.findUnique({
    where: { ownerId_kind_slug: { ownerId: user.id, kind: b.kind as never, slug } },
    select: { id: true },
  });
  const artifact = await prisma.artifact.upsert({
    where: { ownerId_kind_slug: { ownerId: user.id, kind: b.kind as never, slug } },
    update: {
      name: b.name, description: b.description, code: b.code,
      language: b.language ?? "python", tags: b.tags ?? [], isPublic: b.isPublic ?? false,
    },
    create: {
      ownerId: user.id, kind: b.kind as never, name: b.name, slug,
      description: b.description, code: b.code, language: b.language ?? "python",
      tags: b.tags ?? [], isPublic: b.isPublic ?? false,
    },
  });
  return NextResponse.json({
    ok: true, id: artifact.id, kind: artifact.kind, name: artifact.name, slug: artifact.slug,
    isPublic: artifact.isPublic, created: !existing, associatedUser: user.email || user.username,
  });
}
