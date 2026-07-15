import { prisma } from "@/lib/prisma";
import { Landing } from "@/components/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Dati reali per la landing: ultimi artefatti pubblici + conteggi (con fallback sicuro).
  const [recent, strategies, members] = await Promise.all([
    prisma.artifact
      .findMany({
        where: { isPublic: true },
        select: { id: true, name: true, kind: true, description: true, owner: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
      .catch(() => []),
    prisma.artifact.count({ where: { isPublic: true } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
  ]);
  return <Landing recent={recent} stats={{ strategies, members }} />;
}
