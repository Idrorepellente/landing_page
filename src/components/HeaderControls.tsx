'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MOON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
const SUN =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';

// - Logo: porta alla home quando NON si è già in home (sulla home resta lo scroll in cima).
// - Tema: inserisce l'interruttore chiaro/scuro nell'header, a destra.
export default function HeaderControls() {
  const pathname = usePathname();

  useEffect(() => {
    const nav = document.querySelector('[data-nav]');
    if (!nav) return;

    // --- logo -> home (se non in home) ---
    const logo = nav.querySelector('a');
    if (logo && pathname !== '/') logo.setAttribute('href', '/');

    // --- interruttore tema nell'header (a destra) ---
    if (!nav.querySelector('[data-theme-toggle]')) {
      const inner = (nav.querySelector(':scope > div') as HTMLElement) || (nav as HTMLElement);
      const actions = inner.querySelector('div[style*="margin-left: auto"]') as HTMLElement | null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-theme-toggle', '');
      btn.setAttribute('aria-label', 'Cambia tema chiaro/scuro');
      btn.style.cssText =
        'display:grid;place-items:center;height:34px;width:34px;border-radius:9px;border:none;background:transparent;cursor:pointer;flex:0 0 auto;padding:0';

      const paint = () => {
        const dark = document.body.getAttribute('data-theme') === 'dark';
        btn.innerHTML = dark ? SUN : MOON;
        btn.style.color = dark ? '#d4d4d8' : '#3f3f46';
        btn.title = dark ? 'Tema chiaro' : 'Tema scuro';
      };
      paint();

      btn.addEventListener('click', () => {
        const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.body.setAttribute('data-theme', next);
        try { localStorage.setItem('qs-theme', next); } catch (e) {}
        paint();
      });

      if (actions) {
        actions.insertBefore(btn, actions.firstChild);
      } else {
        btn.style.marginLeft = 'auto';
        inner.appendChild(btn);
      }
    }
  }, [pathname]);

  return null;
}
