import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { NeuralBackground } from "@/components/NeuralBackground";

export const metadata: Metadata = {
  title: "QuantSys — La community per trader quant",
  description: "Costruisci, valida e automatizza le tue strategie quant — con test onesti, community e marketplace.",
};

// Applica il tema PRIMA del paint (niente flash): legge qs-theme (default chiaro).
const themeScript = `(function(){try{var t=localStorage.getItem('qs-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Mulish:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <NeuralBackground />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Nav />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
