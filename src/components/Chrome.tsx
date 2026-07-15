"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";
import { NeuralBackground } from "@/components/NeuralBackground";

// Sulla home (la nuova landing LYRA) niente chrome globale: la landing porta
// la propria intestazione, il proprio sfondo animato e la larghezza piena.
// Su tutte le altre pagine resta la barra del sito e il layout a colonna.
export function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  if (path === "/") return <>{children}</>;
  return (
    <>
      <NeuralBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </>
  );
}
