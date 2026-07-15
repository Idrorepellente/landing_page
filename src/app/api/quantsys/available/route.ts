import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// Modello B: il runner del sito usa gli artefatti dell'ACCOUNT dell'utente
// (strategie/approcci/overlay/weight-mode pubblicati o importati nel proprio
// account), NON il filesystem locale del progetto Python. Cosi' il sito e'
// coerente col suo ruolo di piattaforma condivisa ed e' deployabile ovunque.
export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "non autenticato" }, { status: 401 });
  const arts = await prisma.artifact.findMany({
    where: { ownerId: uid },
    select: { name: true, kind: true },
    orderBy: { name: "asc" },
  });
  const by = (k: string) => arts.filter((a) => a.kind === k).map((a) => a.name);
  return NextResponse.json({
    strategies: by("STRATEGY"),
    approaches: by("APPROACH"),
    overlays: by("OVERLAY"),
    weightModes: by("WEIGHT_MODE"),
  });
}
