import { PrismaClient, ArtifactKind } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("password", 10);
  const alice = await prisma.user.upsert({
    where: { email: "alice@quantsys.dev" }, update: {},
    create: { email: "alice@quantsys.dev", username: "alice", passwordHash: pass, displayName: "Alice" },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@quantsys.dev" }, update: {},
    create: { email: "bob@quantsys.dev", username: "bob", passwordHash: pass, displayName: "Bob" },
  });
  await prisma.artifact.upsert({
    where: { ownerId_kind_slug: { ownerId: alice.id, kind: ArtifactKind.STRATEGY, slug: "clenow-trend" } },
    update: {},
    create: { ownerId: alice.id, kind: ArtifactKind.STRATEGY, name: "Clenow Trend", slug: "clenow-trend",
      description: "Trend following D1 multi-asset.", code: "# codice strategia...", isPublic: true, tags: ["trend", "d1"] },
  });
  await prisma.artifact.upsert({
    where: { ownerId_kind_slug: { ownerId: bob.id, kind: ArtifactKind.OVERLAY, slug: "bear-hedge" } },
    update: {},
    create: { ownerId: bob.id, kind: ArtifactKind.OVERLAY, name: "Bear Hedge Overlay", slug: "bear-hedge",
      description: "Riduzione rischio in alta volatilita.", code: "# overlay...", isPublic: true, tags: ["overlay", "regime"] },
  });
  const t = await prisma.forumThread.create({ data: { title: "Benvenuti nel forum QuantSys", category: "general", authorId: alice.id } });
  await prisma.forumPost.create({ data: { threadId: t.id, authorId: alice.id, body: "Presentatevi e condividete le vostre strategie!" } });
  console.log("seed completato");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
