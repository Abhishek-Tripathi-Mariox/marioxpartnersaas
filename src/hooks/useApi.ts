'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';

// Stale-while-revalidate cache shared by every useApi call in the tab.
// Revisiting a page shows the last data instantly, then refreshes it in the background.
// The cache lives in memory only; login/logout do a full page load, which clears it.
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 150;

function remember(url: string, data: unknown) {
  cache.delete(url); // re-insert so the Map order is "least recently used first"
  cache.set(url, data);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

// Identical requests that are already on their way share one network call.
function fetchShared<T>(url: string): Promise<T> {
  let p = inflight.get(url) as Promise<T> | undefined;
  if (!p) {
    p = api.get<T>(url).finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}

// Warm the cache ahead of navigation (e.g. on hover of a nav link).
export function prefetchApi(url: string) {
  if (!cache.has(url)) fetchShared(url).then(d => remember(url, d)).catch(() => {});
}

// Loads a GET endpoint and exposes reload() for after mutations.
export function useApi<T>(url: string | null) {
  const [data, setState] = useState<T | null>(() => (url && cache.has(url) ? (cache.get(url) as T) : null));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url) && !(url && cache.has(url)));
  const current = useRef(url);
  current.current = url;

  const reload = useCallback(async () => {
    if (!url) return;
    const cached = cache.has(url);
    if (cached) setState(cache.get(url) as T);
    setLoading(!cached); // with cached data, refresh silently
    try {
      const fresh = await fetchShared<T>(url);
      remember(url, fresh);
      if (current.current === url) {
        setState(fresh);
        setError(null);
      }
    } catch (e) {
      if (current.current === url) setError((e as Error).message);
    } finally {
      if (current.current === url) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Local updates (e.g. after a PATCH) also refresh the cache entry.
  const setData = useCallback(
    (next: T) => {
      if (url) remember(url, next);
      setState(next);
    },
    [url],
  );

  return { data, error, loading, reload, setData };
}
