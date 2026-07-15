import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const KINDS = [
  { v: "", l: "Tutti" }, { v: "STRATEGY", l: "Strategie" }, { v: "APPROACH", l: "Approcci" },
  { v: "INDICATOR", l: "Indicatori" }, { v: "OVERLAY", l: "Overlay" }, { v: "WEIGHT_MODE", l: "Weight mode" },
];
const KIND_LABEL: Record<string, string> = { STRATEGY: "Strategia", APPROACH: "Approccio", INDICATOR: "Indicatore", OVERLAY: "Overlay", WEIGHT_MODE: "Weight mode" };

export default async function Marketplace({ searchParams }: { searchParams: { kind?: string } }) {
  const kind = searchParams.kind || "";
  const artifacts = await prisma.artifact
    .findMany({
      where: { isPublic: true, ...(kind ? { kind: kind as never } : {}) },
      include: { owner: { select: { username: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    })
    .catch(() => []);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="h-title">Marketplace</h1>
        <Link href="/marketplace/new" className="btn btn-primary">Pubblica</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Link key={k.v} href={k.v ? `/marketplace?kind=${k.v}` : "/marketplace"} className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: kind === k.v ? "var(--accent)" : "var(--border)", color: kind === k.v ? "var(--text)" : "var(--muted)" }}>
            {k.l}
          </Link>
        ))}
      </div>
      {artifacts.length === 0 ? (
        <div className="muted text-sm">Nessun artefatto pubblico in questa categoria.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((a) => (
            <Link key={a.id} href={`/marketplace/${a.id}`} className="card card-hover">
              <div className="flex items-center justify-between">
                <span className="pill">{KIND_LABEL[a.kind] ?? a.kind}</span>
                <span className="muted text-xs">@{a.owner.username}</span>
              </div>
              <div className="mt-2 font-medium">{a.name}</div>
              <div className="muted line-clamp-2 text-sm">{a.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">{a.tags.slice(0, 4).map((t) => <span key={t} className="muted text-xs">#{t}</span>)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
