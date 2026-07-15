import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// Profilo dell'utente loggato: dettagli account + statistiche + runner caricati
// + artefatti (propri, pubblici e privati). Alimenta la pagina /profile.
export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });

  const [user, runners, artifacts, forumPosts, threads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, username: true, displayName: true, bio: true, image: true, createdAt: true },
    }),
    prisma.runner.findMany({ where: { ownerId: uid }, orderBy: { updatedAt: "desc" } }),
    prisma.artifact.findMany({
      where: { ownerId: uid },
      select: { id: true, name: true, kind: true, slug: true, isPublic: true, likes: true, description: true, updatedAt: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.forumPost.count({ where: { authorId: uid } }),
    prisma.forumThread.count({ where: { authorId: uid } }),
  ]);
  if (!user) return NextResponse.json({ error: "non trovato" }, { status: 404 });

  const byKind: Record<string, number> = {};
  let publicCount = 0;
  for (const a of artifacts) {
    byKind[a.kind] = (byKind[a.kind] ?? 0) + 1;
    if (a.isPublic) publicCount += 1;
  }
  const stats = {
    runners: runners.length,
    runnersRunning: runners.filter((r) => r.status === "running").length,
    artifacts: { total: artifacts.length, public: publicCount, private: artifacts.length - publicCount, byKind },
    forumPosts,
    forumThreads: threads,
  };
  return NextResponse.json({ user, stats, runners, artifacts });
}

const patchSchema = z.object({
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "dati non validi" }, { status: 400 });
  const data: { displayName?: string; bio?: string } = {};
  if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName.trim();
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  const user = await prisma.user.update({
    where: { id: uid },
    data,
    select: { id: true, email: true, username: true, displayName: true, bio: true, image: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, user });
}
