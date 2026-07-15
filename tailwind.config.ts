import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", "surface-2": "var(--surface-2)",
        border: "var(--border)", "border-strong": "var(--border-strong)",
        accent: "var(--accent)", "accent-strong": "var(--accent-strong)", "accent-2": "var(--accent-2)",
        text: "var(--text)", muted: "var(--muted)",
        positive: "var(--positive)", negative: "var(--negative)",
      },
      fontFamily: {
        sans: ["Mulish", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "14px", lg: "12px", md: "9px" },
    },
  },
  plugins: [],
};
export default config;
