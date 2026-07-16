'use client';

import { useEffect } from 'react';
import { initBehaviors } from '@/lib/behaviors';

export default function Behaviors() {
  useEffect(() => {
    const root = document.getElementById('lyra-root');
    if (!root) return;
    const cleanup = initBehaviors(root as HTMLElement);
    return cleanup;
  }, []);
  return null;
}
