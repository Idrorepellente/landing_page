import { loadRaw } from './_loader';

export const legalCss = loadRaw('legal.css');

/** Impagina una pagina legale: header + intestazione + contenuto + footer. */
export function legalPage(title: string, updated: string, content: string): string {
  const HEADER = loadRaw('_header.html');
  const FOOTER = loadRaw('_footer.html');
  return `
<div style="min-height: 100vh;background: #f3f3f4;color: #18181b;overflow-x: clip;position: relative">
<div style="position: relative;z-index: 1">
${HEADER}
<main class="lg-wrap">
  <p class="lg-eyebrow">Documento legale</p>
  <h1 class="lg-title">${title}</h1>
  <p class="lg-updated">Ultimo aggiornamento: ${updated}</p>
  ${content}
</main>
${FOOTER}
</div>
</div>`;
}
