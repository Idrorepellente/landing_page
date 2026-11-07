/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * I vecchi indirizzi italiani continuano a funzionare.
   *
   * Cambiare un indirizzo pubblico non e' come rinominare un file: quello
   * vecchio e' gia' nei segnalibri di qualcuno, nell'indice di Google, in
   * un messaggio inviato mesi fa. Toglierlo di colpo trasforma tutti quei
   * riferimenti in un 404.
   *
   * `permanent: true` (301) dice ai motori di ricerca di trasferire sul
   * nuovo indirizzo la reputazione accumulata dal vecchio, invece di
   * ricominciare da zero. Con un 302 la terrebbero sospesa.
   */
  async redirects() {
    return [
      { source: '/accesso',                destination: '/sign-in',    permanent: true },

      // Dalla landing "Lyra Capital" in poi, le pagine pubbliche (prezzi, roadmap,
      // team, legali…) vivono dentro la home come pagine interne (#prezzi, #roadmap…).
      // I vecchi indirizzi, italiani e inglesi, portano alla pagina interna giusta.
      { source: '/pricing',                destination: '/#pricing',     permanent: true },
      { source: '/prezzi',                 destination: '/#pricing',     permanent: true },
      { source: '/roadmap',                destination: '/#roadmap',    permanent: true },
      { source: '/team',                   destination: '/#team',       permanent: true },
      { source: '/terms',                  destination: '/#terms',    permanent: true },
      { source: '/termini',                destination: '/#terms',    permanent: true },
      { source: '/privacy',                destination: '/#privacy',    permanent: true },
      { source: '/cookie',                 destination: '/#cookie',     permanent: true },
      { source: '/disclaimer',             destination: '/#disclaimer', permanent: true },
      { source: '/risks',                  destination: '/#risks',     permanent: true },
      { source: '/rischi',                 destination: '/#risks',     permanent: true },
      { source: '/solution',               destination: '/#platform', permanent: true },
      { source: '/soluzione',              destination: '/#platform', permanent: true },
      { source: '/ecosystem',              destination: '/#community',  permanent: true },
      { source: '/ecosistema',             destination: '/#community',  permanent: true },
      { source: '/engine-map',             destination: '/#map',      permanent: true },
      { source: '/motore-mappa',           destination: '/#map',      permanent: true },
      { source: '/fund-goal',              destination: '/#capital',   permanent: true },
      { source: '/obiettivo-fondo',        destination: '/#capital',   permanent: true },
      { source: '/marketplace/grazie',     destination: '/marketplace/thank-you', permanent: true },
      { source: '/marketplace/venditore',  destination: '/marketplace/seller',    permanent: true },
    ];
  },
};
export default nextConfig;
