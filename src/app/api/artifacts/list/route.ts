import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Elenco (server-to-server) degli artefatti presenti nell'ACCOUNT dell'utente,
// raggruppati per tipo. Serve all'APP per due cose:
//  1) DEDUP all'upload di un runner: cio' che e' gia' nell'account non viene
//     rispedito dall'app (no upload).
//  2) Costruire un runner "dall'account": scegliere strategie/approcci/overlay/
//     weight mode gia' presenti (privati o pubblici) senza ripassare dai file locali.
// Auth: stesso schema dell'upload -> segreto condiviso + username/email.
const schema = z.object({ secret: z.string().min(1), username: z.string().min(1) });

const GROUP: Record<string, string> = {
  STRATEGY: "strategies", APPROACH: "approaches", OVERLAY: "overlays",
  WEIGHT_MODE: "weightModes", INDICATOR: "indicators",
};

export async function POST(req: Request) {
  const secret = process.env.QUANTSYS_UPLOAD_SECRET || "";
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload non valido" }, { status: 400 });
  const { secret: got, username } = parsed.data;
  if (!secret || got !== secret) {
    return NextResponse.json({ error: "segreto non valido o non configurato sul sito" }, { status: 401 });
  }
  const uname = username.trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: uname }, { email: uname }] },
    select: { id: true, email: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "nessun account con username/email = " + uname }, { status: 404 });

  const arts = await prisma.artifact.findMany({
    where: { ownerId: user.id },
    select: { name: true, kind: true, slug: true, isPublic: true },
    orderBy: { name: "asc" },
  });
  const out: Record<string, { name: string; slug: string; isPublic: boolean }[]> = {
    strategies: [], approaches: [], overlays: [], weightModes: [], indicators: [],
  };
  for (const a of arts) {
    const g = GROUP[a.kind];
    if (g) out[g].push({ name: a.name, slug: a.slug, isPublic: a.isPublic });
  }
  return NextResponse.json({ ok: true, account: user.email || user.username, ...out });
}
