import type { MetadataRoute } from 'next';

// Tutto il sito pubblico e' indicizzabile; le API e le pagine dell'account no.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/subscription/', '/marketplace/seller', '/marketplace/thank-you'] }],
    sitemap: 'https://www.lyra-capital.it/sitemap.xml',
    host: 'https://www.lyra-capital.it',
  };
}
