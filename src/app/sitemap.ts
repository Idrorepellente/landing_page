import type { MetadataRoute } from 'next';

// La landing e' una sola pagina (le sezioni interne sono ancore #platform, #pricing...):
// in sitemap va la home. lastModified aiuta Google a ripassare e ad aggiornare titolo, descrizione e icona.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.lyra-capital.it/', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ];
}
