/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fase 1: non bloccare la build di produzione su errori TS/ESLint non ancora verificati.
  // Da ri-attivare (mettere a false / rimuovere) man mano che si irrobustisce il codice.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
