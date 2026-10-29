'use client';

import { useEffect } from 'react';

// Runs `fn` once if the URL has ?name=1 (used by "Add lead" etc. links from other pages), then cleans the URL.
export function useQueryFlag(name: string, fn: () => void) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(name) !== '1') return;
    fn();
    url.searchParams.delete(name);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
