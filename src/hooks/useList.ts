'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ListMeta } from '@/lib/list';
import { useApi } from './useApi';

type Options = { limit?: number; sort?: string; filters?: Record<string, string>; urlState?: boolean };
type State = { page: number; limit: number; q: string; sort: string; filters: Record<string, string> };

const RESERVED = ['page', 'limit', 'q', 'sort'];

// Server-paginated list with search, sort and filters. State is mirrored in the page URL
// (when urlState is on) so refresh, back and shared links keep the same view.
export function useList<T>(endpoint: string | null, key: string, opts: Options = {}) {
  const { urlState = true } = opts;
  const [s, setS] = useState<State>({ page: 1, limit: opts.limit ?? 25, q: '', sort: opts.sort ?? '', filters: opts.filters ?? {} });
  const [ready, setReady] = useState(!urlState);
  const [debouncedQ, setDebouncedQ] = useState('');

  // Read the initial state from the URL once, after mount (avoids hydration mismatch).
  useEffect(() => {
    if (!urlState) return;
    const p = new URLSearchParams(window.location.search);
    const filters = { ...(opts.filters ?? {}) };
    p.forEach((v, k) => { if (!RESERVED.includes(k) && k !== 'new') filters[k] = v; });
    const q = p.get('q') ?? '';
    setS(prev => ({ page: Number(p.get('page')) || 1, limit: Number(p.get('limit')) || prev.limit, q, sort: p.get('sort') ?? prev.sort, filters }));
    setDebouncedQ(q);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(s.q), 300);
    return () => clearTimeout(t);
  }, [s.q]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(s.page));
    p.set('limit', String(s.limit));
    if (debouncedQ.trim()) p.set('q', debouncedQ.trim());
    if (s.sort) p.set('sort', s.sort);
    for (const [k, v] of Object.entries(s.filters)) if (v) p.set(k, v);
    return p.toString();
  }, [s.page, s.limit, s.sort, s.filters, debouncedQ]);

  useEffect(() => {
    if (!urlState || !ready) return;
    const url = new URL(window.location.href);
    url.search = query.replace(/(^|&)page=1(&|$)/, '$1').replace(/(^|&)limit=25(&|$)/, '$1').replace(/^&|&$/g, '');
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
  }, [query, ready, urlState]);

  const sep = endpoint?.includes('?') ? '&' : '?';
  const { data, loading, reload } = useApi<Record<string, unknown> & { meta?: ListMeta }>(ready && endpoint ? `${endpoint}${sep}${query}` : null);

  // Any change other than the page itself goes back to page 1.
  const setQ = useCallback((q: string) => setS(p => ({ ...p, q, page: 1 })), []);
  const setPage = useCallback((page: number) => setS(p => ({ ...p, page })), []);
  const setLimit = useCallback((limit: number) => setS(p => ({ ...p, limit, page: 1 })), []);
  const setSort = useCallback((sort: string) => setS(p => ({ ...p, sort, page: 1 })), []);
  const setFilter = useCallback((k: string, v: string) => setS(p => ({ ...p, filters: { ...p.filters, [k]: v }, page: 1 })), []);
  const clear = useCallback(() => setS(p => ({ ...p, q: '', filters: {}, page: 1 })), []);

  return {
    items: (data?.[key] as T[] | undefined) ?? undefined,
    meta: data?.meta,
    loading: loading || !ready,
    reload,
    ...s,
    setQ, setPage, setLimit, setSort, setFilter, clear,
    filtered: !!s.q || Object.values(s.filters).some(Boolean),
  };
}

// Same API for rows already in memory (e.g. the computed commission ledger).
export function usePaged<T>(rows: T[], initialLimit = 25) {
  const [page, setPage] = useState(1);
  const [limit, setLimitRaw] = useState(initialLimit);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return {
    items: rows.slice((current - 1) * limit, current * limit),
    meta: { page: current, limit, total, pages } as ListMeta,
    setPage,
    setLimit: (l: number) => { setLimitRaw(l); setPage(1); },
  };
}
