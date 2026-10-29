'use client';

import type { ReactNode } from 'react';
import { Button, EmptyState, Pagination, SearchInput, Select, SkeletonCards } from '@/components/ui';
import { useList } from '@/hooks/useList';
import { PROJECT_STAGES } from '@/lib/constants';
import type { Project, User } from '@/types';
import { ProjectCard } from './ProjectCard';

const SORTS = [
  { value: '-closedAt', label: 'Recently closed' },
  { value: 'closedAt', label: 'Oldest first' },
  { value: '-deal', label: 'Deal value: high to low' },
  { value: 'deal', label: 'Deal value: low to high' },
  { value: 'client', label: 'Client A–Z' },
];

type Props = {
  partners?: User[];                      // admin: enables the partner filter
  rate?: number;                          // partner: their commission rate
  ownerId?: string;                       // fixed partner (admin partner page)
  action?: (p: Project) => ReactNode;     // admin: edit/delete buttons
  listRef?: (reload: () => void) => void; // lets the page refresh the list after saving
};

// Paginated project cards with search, stage and partner filters, and sort.
export function ProjectList({ partners, rate, ownerId, action, listRef }: Props) {
  const list = useList<Project>(`/api/projects${ownerId ? `?owner=${ownerId}` : ''}`, 'projects', { sort: '-closedAt', limit: 10, urlState: !ownerId });
  listRef?.(list.reload);

  return (
    <>
      <div className="toolbar">
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Search client, project or PM" width={360} />
        <div style={{ width: 180 }}>
          <Select options={PROJECT_STAGES.map((s, i) => ({ value: String(i), label: s }))} placeholder="All stages" value={list.filters.stage ?? ''} onChange={e => list.setFilter('stage', e.target.value)} aria-label="Stage" />
        </div>
        {partners && !ownerId && (
          <div style={{ width: 220 }}>
            <Select options={partners.map(p => ({ value: p.id, label: `${p.name} · ${p.partnerCode}` }))} placeholder="All partners" value={list.filters.owner ?? ''} onChange={e => list.setFilter('owner', e.target.value)} aria-label="Partner" />
          </div>
        )}
        <div style={{ width: 220 }}>
          <Select options={SORTS} value={list.sort} onChange={e => list.setSort(e.target.value)} aria-label="Sort" />
        </div>
        {list.filtered && <Button size="sm" variant="ghost" icon="x" onClick={list.clear}>Clear</Button>}
      </div>

      {list.loading && !list.items ? (
        <SkeletonCards />
      ) : list.items?.length ? (
        <div className="stack" style={{ gap: 20, opacity: list.loading ? 0.6 : 1 }}>
          {list.items.map(p => <ProjectCard key={p._id} project={p} rate={rate} action={action?.(p)} />)}
        </div>
      ) : (
        <EmptyState title={list.filtered ? 'No projects match your filters' : 'No projects yet'}>
          {!list.filtered && 'Won deals appear here once Mariox starts delivery.'}
        </EmptyState>
      )}
      <Pagination meta={list.meta} onPage={list.setPage} onLimit={list.setLimit} label="projects" />
    </>
  );
}
