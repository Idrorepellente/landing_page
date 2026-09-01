'use client';

import { useEffect } from 'react';
import { initBehaviors } from '@/lib/behaviors';

export default function Behaviors() {
  useEffect(() => {
    // Ri-applica il tema su <html> E <body> prima di avviare i comportamenti:
    // l'idratazione di React può rimuovere data-theme dal body, e il canvas legge di lì
    // per decidere il colore dello sfondo (senza questo, all'avvio in dark lascia scie grige).
    try {
      const t = localStorage.getItem('qs-theme') || 'light';
      document.documentElement.setAttribute('data-theme', t);
      document.body.setAttribute('data-theme', t);
    } catch (e) {}

    const root = document.getElementById('lyra-root');
    if (!root) return;
    const cleanup = initBehaviors(root as HTMLElement);
    return cleanup;
  }, []);
  return null;
}
