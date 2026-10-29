'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { usePipeline } from '@/components/SettingsProvider';
import { useUser } from '@/components/UserProvider';
import { Button, Chips, Icon, Modal, PageHeader, Pagination, SearchInput, Select, Tabs } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useList } from '@/hooks/useList';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { api } from '@/lib/client';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { todayISO } from '@/lib/format';
import { pipeline } from '@/lib/metrics';
import { LOST, WON, allStages, isOpen } from '@/lib/pipeline';
import type { Lead, OwnerRef, User } from '@/types';
import { LeadBoard } from './LeadBoard';
import { LeadTable } from './LeadTable';
import { leadFields } from './leadFields';
import { PipelineStats, type PipelinePick } from './PipelineStats';
import { TaskRow } from './TaskRow';

type View = 'board' | 'list' | 'tasks';

const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const TASK_GROUPS = [
  { label: 'Overdue', color: 'var(--bad)', test: (d: string) => d < todayISO() },
  { label: 'Today', color: 'var(--warn)', test: (d: string) => d === todayISO() },
  { label: 'This week', color: 'var(--ink)', test: (d: string) => d > todayISO() && d <= addDays(7) },
  { label: 'Later', color: 'var(--ink)', test: (d: string) => d > addDays(7) },
];

// The CRM screen. Partners see their own leads; admins see every partner's, can filter by partner and add leads for them.
//  - Board and follow-ups load the whole (filtered) pipeline: a kanban has to show every column.
//  - List view is paginated, searched and sorted on the server.
export function PipelineView({ admin, partnerId }: { admin?: boolean; partnerId?: string }) {
  const router = useRouter();
  const { user } = useUser();
  const cfg = usePipeline();
  const [view, setView] = useState<View>('board');
  const [adding, setAdding] = useState(false);
  useQueryFlag('new', () => setAdding(true));

  const embedded = !!partnerId;
  const list = useList<Lead>(view === 'list' ? `/api/leads${partnerId ? `?owner=${partnerId}` : ''}` : null, 'leads', {
    sort: '-updatedAt',
    urlState: !embedded,
  });
  // Deep links from stat tiles elsewhere: /leads?view=list&stage=...
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'list' || v === 'tasks') setView(v);
  }, []);

  const openKeys = cfg.stages.map(s => s.key).join(',');
  const closedKeys = `${WON},${LOST}`;
  const stageOptions = [
    { value: openKeys, label: 'All open stages' },
    { value: closedKeys, label: 'Closed (won + lost)' },
    ...allStages(cfg).map(s => ({ value: s.key, label: s.name })),
  ];

  // Stat tile → the leads behind the number, on this page.
  function pick(p: PipelinePick) {
    if (p === 'tasks') return setView('tasks');
    setView('list');
    list.setFilter('stage', p === 'closed' ? closedKeys : openKeys);
    list.setSort(p === 'open' ? '-updatedAt' : '-value');
  }
  const picked: PipelinePick | null =
    view === 'tasks' ? 'tasks'
    : view !== 'list' ? null
    : list.filters.stage === closedKeys ? 'closed'
    : list.filters.stage === openKeys ? (list.sort === '-value' ? 'weighted' : 'open')
    : null;

  const owner = partnerId ?? list.filters.owner ?? '';
  const { data, reload } = useApi<{ leads: Lead[] }>(`/api/leads${owner ? `?owner=${owner}` : ''}`);
  const partners = useApi<{ users: User[] }>(admin ? '/api/admin/users?role=partner' : null);

  const base = admin ? '/admin/leads' : '/leads';
  const partnerList = partners.data?.users ?? [];
  const rateOf = (l: Lead) =>
    admin ? (l.owner as OwnerRef)?.commissionRate ?? DEFAULT_COMMISSION_RATE : user?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const avgRate = admin ? DEFAULT_COMMISSION_RATE : user?.commissionRate ?? DEFAULT_COMMISSION_RATE;

  // Board view applies the same toolbar filters in memory.
  const all = data?.leads ?? [];
  const { q, filters } = list;
  const boardLeads = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter(
      l =>
        (!term || `${l.company} ${l.project} ${l.contact} ${l.email} ${l.city}`.toLowerCase().includes(term)) &&
        (!filters.source || l.source === filters.source) &&
        (!filters.priority || l.priority === filters.priority) &&
        (!filters.stage || filters.stage.split(',').includes(l.stage)),
    );
  }, [all, q, filters]);

  const pending = all
    .filter(l => isOpen(l.stage))
    .flatMap(l => l.tasks.filter(t => !t.done).map(t => ({ task: t, lead: l })))
    .sort((a, b) => ((a.task.due || '9') < (b.task.due || '9') ? -1 : 1));
  const overdue = pending.filter(p => p.task.due && p.task.due < todayISO()).length;

  const fields: FieldDef[] = [
    ...(admin ? [{ name: 'owner', label: 'Partner', type: 'select' as const, options: partnerList.map(p => p.id), required: true, full: true }] : []),
    ...leadFields(cfg),
  ];

  async function create(values: Record<string, unknown>) {
    const { lead } = await api.post<{ lead: Lead }>('/api/leads', values);
    router.push(`${base}/${lead._id}`);
  }

  async function toggle(leadId: string, taskId: string) {
    await api.patch(`/api/leads/${leadId}`, { toggleTask: taskId });
    reload();
  }

  const viewTabs = (
    <Tabs
      tabs={[
        { value: 'board', label: <><Icon name="cols" size="s" />Board</> },
        { value: 'list', label: <><Icon name="list" size="s" />List</> },
        { value: 'tasks', label: <><Icon name="checkSq" size="s" />Follow-ups</>, count: overdue || undefined },
      ]}
      value={view}
      onChange={setView}
    />
  );

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow={admin ? 'Admin · Sales CRM' : 'Sales CRM'}
          title={admin ? 'All leads' : 'Pipeline'}
          subtitle={admin ? "Every partner's pipeline. Open a lead to edit, move, reassign or delete it." : 'Track every lead, follow-up and conversation until the deal closes.'}
          actions={<>{viewTabs}<Button variant="fire" icon="plus" onClick={() => setAdding(true)}>Add lead</Button></>}
        />
      )}

      <PipelineStats s={pipeline(all, cfg)} rate={avgRate} followUps={pending.length} overdue={overdue} onPick={pick} active={picked} />

      {view !== 'tasks' && (
        <div className="toolbar">
          <SearchInput value={list.q} onChange={list.setQ} placeholder="Search company, contact, email or city" width={380} />
          {admin && !embedded && (
            <div style={{ width: 220 }}>
              <Select options={partnerList.map(p => ({ value: p.id, label: `${p.name} · ${p.partnerCode}` }))} placeholder="All partners" value={list.filters.owner ?? ''} onChange={e => list.setFilter('owner', e.target.value)} aria-label="Partner" />
            </div>
          )}
          <div style={{ width: 180 }}>
            <Select options={stageOptions} placeholder="All stages" value={list.filters.stage ?? ''} onChange={e => list.setFilter('stage', e.target.value)} aria-label="Stage" />
          </div>
          <div style={{ width: 180 }}>
            <Select options={cfg.sources} placeholder="All sources" value={list.filters.source ?? ''} onChange={e => list.setFilter('source', e.target.value)} aria-label="Source" />
          </div>
          <Chips tabs={['All', ...cfg.priorities.map(p => p.name)]} value={list.filters.priority || 'All'} onChange={v => list.setFilter('priority', v === 'All' ? '' : v)} />
          {list.filtered && <Button size="sm" variant="ghost" icon="x" onClick={list.clear}>Clear</Button>}
          <span className="sub mono grow">{view === 'list' ? `${list.meta?.total ?? '…'} matching` : `${boardLeads.length} of ${all.length}`} leads</span>
          {embedded && viewTabs}
        </div>
      )}

      {view === 'board' && <LeadBoard leads={boardLeads} rate={rateOf} hrefBase={base} showOwner={admin && !embedded} />}
      {view === 'list' && (
        <LeadTable
          leads={list.items}
          loading={list.loading}
          hrefBase={base}
          showOwner={admin && !embedded}
          sort={list.sort}
          onSort={list.setSort}
          footer={<Pagination meta={list.meta} onPage={list.setPage} onLimit={list.setLimit} label="leads" />}
        />
      )}
      {view === 'tasks' && (
        <div className="g4" style={{ alignItems: 'start' }}>
          {TASK_GROUPS.map(g => {
            const items = pending.filter(p => p.task.due && g.test(p.task.due));
            return (
              <div key={g.label} className="card tight">
                <div className="between" style={{ marginBottom: 6 }}>
                  <b style={{ font: '700 16px var(--display)', color: g.color }}>{g.label}</b>
                  <span className="mono sub">{items.length}</span>
                </div>
                {items.length ? (
                  items.map(({ task, lead }) => (
                    <TaskRow key={task._id} task={task} company={admin ? `${lead.company} · ${(lead.owner as OwnerRef)?.name ?? ''}` : lead.company} href={`${base}/${lead._id}`} onToggle={() => toggle(lead._id, task._id)} />
                  ))
                ) : (
                  <div className="sub" style={{ padding: '12px 0' }}>Nothing here</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={adding} title={admin ? 'New lead for a partner' : 'New lead'} subtitle="A first call is scheduled for tomorrow automatically." onClose={() => setAdding(false)}>
        <DynamicForm
          fields={fields}
          columns={2}
          submitIcon="plus"
          initial={{ priority: cfg.priorities.find(p => p.name === 'Warm')?.name ?? cfg.priorities[0]?.name, ...(partnerId ? { owner: partnerId } : {}) }}
          optionLabel={{ owner: id => partnerList.find(p => p.id === id)?.name ?? id }}
          submitLabel="Save lead"
          onSubmit={create}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </>
  );
}
