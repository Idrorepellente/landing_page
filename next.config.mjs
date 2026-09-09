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
      { source: '/termini',                destination: '/terms',      permanent: true },
      { source: '/rischi',                 destination: '/risks',      permanent: true },
      { source: '/soluzione',              destination: '/solution',   permanent: true },
      { source: '/ecosistema',             destination: '/ecosystem',  permanent: true },
      { source: '/motore-mappa',           destination: '/engine-map', permanent: true },
      { source: '/obiettivo-fondo',        destination: '/fund-goal',  permanent: true },
      { source: '/marketplace/grazie',     destination: '/marketplace/thank-you', permanent: true },
      { source: '/marketplace/venditore',  destination: '/marketplace/seller',    permanent: true },
    ];
  },
};
export default nextConfig;
