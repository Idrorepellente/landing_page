import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ingest dei runner caricati dall'APP. Auth server-to-server: segreto condiviso
// (QUANTSYS_UPLOAD_SECRET) + username/email per associare il runner all'account.
export async function POST(req: Request) {
  const secret = process.env.QUANTSYS_UPLOAD_SECRET || "";
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload non valido" }, { status: 400 });
  }
  if (!secret || body.secret !== secret) {
    return NextResponse.json({ error: "segreto non valido o non configurato sul sito" }, { status: 401 });
  }
  const username = String(body.username || "").trim();
  const runner = (body.runner && typeof body.runner === "object") ? body.runner : {};
  if (!username) return NextResponse.json({ error: "username mancante (QUANTSYS_UPLOAD_USERNAME non impostato sull'app)" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
    select: { id: true, email: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "nessun account con username/email = " + username }, { status: 404 });

  const name = String(runner.name || "runner").slice(0, 80);
  const existing = await prisma.runner.findFirst({ where: { ownerId: user.id, name } });
  const saved = existing
    ? await prisma.runner.update({ where: { id: existing.id }, data: { config: runner } })
    : await prisma.runner.create({ data: { ownerId: user.id, name, config: runner } });
  // associatedUser: cosi' l'app mostra su quale account e' finito (per scoprire i mismatch)
  return NextResponse.json({ ok: true, id: saved.id, name: saved.name, associatedUser: user.email || user.username });
}
