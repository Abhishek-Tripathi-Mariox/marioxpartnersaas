'use client';

import type { ReactNode } from 'react';
import { Chips, Pagination, SearchInput, Skeleton } from '@/components/ui';
import { useList } from '@/hooks/useList';
import type { Resource } from '@/types';

const TONE: Record<string, string> = { 'Case study': 't-fire', Portfolio: 't-info', Deck: 't-violet', Brochure: 't-good' };
const TABS = [
  { value: 'All', label: 'All' },
  { value: 'Case study', label: 'Case studies' },
  { value: 'Portfolio', label: 'Portfolio' },
  { value: 'Deck', label: 'Decks' },
  { value: 'Brochure', label: 'Brochures' },
];

type Props = { action: (r: Resource) => ReactNode; listRef?: (reload: () => void) => void };

// Sales kit cards with a coloured format cover, server-side search/filter/pagination.
// Shared by the partner kit and the admin kit manager.
export function ResourceGrid({ action, listRef }: Props) {
  const list = useList<Resource>('/api/resources', 'items', { sort: 'type', limit: 25 });
  listRef?.(list.reload);
  const rows = list.items;

  return (
    <>
      <div className="toolbar">
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Search title, industry or format" width={340} />
        <Chips tabs={TABS} value={list.filters.type || 'All'} onChange={v => list.setFilter('type', v === 'All' ? '' : v)} />
      </div>
      {list.loading && !rows ? (
        <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={260} r={22} />)}</div>
      ) : rows?.length ? (
        <div className="g3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', opacity: list.loading ? 0.6 : 1 }}>
          {rows.map(r => (
            <div key={r._id} className="card res hov" style={r.hidden ? { opacity: 0.55 } : undefined}>
              <div className={`res-c ${TONE[r.type] ?? 't-mute'}`}>
                <span className="lbl" style={{ color: 'inherit' }}>{r.type}{r.hidden ? ' · hidden' : ''}</span>
                <span className="f">.{(r.format || 'file').toLowerCase()}</span>
              </div>
              <div className="res-b">
                <div className="between lbl" style={{ fontSize: 10.5 }}><span>{r.industry}</span><span>{r.size}</span></div>
                <b>{r.title}</b>
                <div className="between" style={{ marginTop: 'auto', paddingTop: 6 }}>
                  <span className="mono sub">{[r.format, r.size].filter(Boolean).join(' · ')}</span>
                  {action(r)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">{list.filtered ? 'No files match your search' : 'No files in this section'}</div>
      )}
      <Pagination meta={list.meta} onPage={list.setPage} onLimit={list.setLimit} label="files" />
    </>
  );
}
