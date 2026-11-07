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
      { source: '/pricing',                destination: '/#prezzi',     permanent: true },
      { source: '/prezzi',                 destination: '/#prezzi',     permanent: true },
      { source: '/roadmap',                destination: '/#roadmap',    permanent: true },
      { source: '/team',                   destination: '/#team',       permanent: true },
      { source: '/terms',                  destination: '/#termini',    permanent: true },
      { source: '/termini',                destination: '/#termini',    permanent: true },
      { source: '/privacy',                destination: '/#privacy',    permanent: true },
      { source: '/cookie',                 destination: '/#cookie',     permanent: true },
      { source: '/disclaimer',             destination: '/#disclaimer', permanent: true },
      { source: '/risks',                  destination: '/#rischi',     permanent: true },
      { source: '/rischi',                 destination: '/#rischi',     permanent: true },
      { source: '/solution',               destination: '/#piattaforma', permanent: true },
      { source: '/soluzione',              destination: '/#piattaforma', permanent: true },
      { source: '/ecosystem',              destination: '/#community',  permanent: true },
      { source: '/ecosistema',             destination: '/#community',  permanent: true },
      { source: '/engine-map',             destination: '/#mappa',      permanent: true },
      { source: '/motore-mappa',           destination: '/#mappa',      permanent: true },
      { source: '/fund-goal',              destination: '/#capitale',   permanent: true },
      { source: '/obiettivo-fondo',        destination: '/#capitale',   permanent: true },
      { source: '/marketplace/grazie',     destination: '/marketplace/thank-you', permanent: true },
      { source: '/marketplace/venditore',  destination: '/marketplace/seller',    permanent: true },
    ];
  },
};
export default nextConfig;
