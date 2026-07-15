import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { STRATEGY: "Strategia", APPROACH: "Approccio", INDICATOR: "Indicatore", OVERLAY: "Overlay", WEIGHT_MODE: "Weight mode" };

export default async function ArtifactDetail({ params }: { params: { id: string } }) {
  const a = await prisma.artifact
    .findUnique({ where: { id: params.id }, include: { owner: { select: { username: true, displayName: true } } } })
    .catch(() => null);
  if (!a || !a.isPublic) notFound();
  return (
    <div className="space-y-4">
      <Link href="/marketplace" className="link text-sm">&larr; Marketplace</Link>
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="pill">{KIND_LABEL[a.kind] ?? a.kind}</span>
          <span className="muted text-sm">di @{a.owner.username}</span>
        </div>
        <h1 className="h-title mt-2">{a.name}</h1>
        {a.description && <p className="muted mt-1">{a.description}</p>}
        <div className="mt-2 flex flex-wrap gap-1">{a.tags.map((t) => <span key={t} className="pill">#{t}</span>)}</div>
      </div>
      <div className="card">
        <div className="label">Codice ({a.language})</div>
        <pre className="mt-1 overflow-auto rounded-lg p-3 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}><code>{a.code}</code></pre>
      </div>
    </div>
  );
}
