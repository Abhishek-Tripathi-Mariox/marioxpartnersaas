'use client';

import { useState, type ReactNode } from 'react';
import { DynamicForm } from '@/components/forms/DynamicForm';
import { useUser } from '@/components/UserProvider';
import { Button, Card, Chips, DataTable, Drawer, EmptyState, Modal, PageHeader, Pagination, SearchInput, SkeletonCards, StatusBadge, useToast, type Column } from '@/components/ui';
import { useList } from '@/hooks/useList';
import { useQueryFlag } from '@/hooks/useQueryFlag';
import { api } from '@/lib/client';
import { DEFAULT_COMMISSION_RATE, REQUEST_STATUS } from '@/lib/constants';
import { date } from '@/lib/format';
import type { OwnerRef, RequestItem } from '@/types';
import { REQUESTS, type RequestKind } from './config';
import { ScopeCard } from './ScopeCard';
import { TechForm } from './TechForm';
import { VisitBooking } from './VisitBooking';
import { SCOPE_FORM_ID, ScopeForm } from './ScopeForm';
import { ScopeDetails } from './ScopeCard';
import { ToolkitNav } from './ToolkitNav';

type Props = { kind: RequestKind; admin?: boolean; embedded?: boolean; above?: ReactNode; initialStatus?: string };

// One screen for every partner request type. Partners create and track; admins review.
export function RequestsView({ kind, admin, embedded, above, initialStatus }: Props) {
  const cfg = REQUESTS[kind];
  const toast = useToast();
  const { user } = useUser();
  // Admin tabs remount this per kind, so their filters stay out of the URL.
  const list = useList<RequestItem>(`/api/requests/${kind}`, 'items', { sort: '-createdAt', limit: admin ? 25 : 10, urlState: !embedded, filters: initialStatus ? { status: initialStatus } : undefined });
  const { items, loading, reload } = list;
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<RequestItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useQueryFlag('new', () => setCreating(true));

  async function create(values: Record<string, unknown>) {
    await api.post(`/api/requests/${kind}`, values);
    setCreating(false);
    toast('Sent to Mariox');
    reload();
  }

  async function review(values: Record<string, unknown>) {
    await api.patch(`/api/requests/${kind}/${reviewing!._id}`, values);
    setReviewing(null);
    toast('Updated');
    reload();
  }

  async function acceptRevised(s: RequestItem) {
    try {
      await api.patch(`/api/requests/scope/${s._id}`, { accept: true });
      toast('Revised amount accepted. You can quote the client now.');
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove() {
    if (!confirm('Delete this request? The partner will no longer see it.')) return;
    await api.del(`/api/requests/${kind}/${reviewing!._id}`);
    setReviewing(null);
    toast('Request deleted');
    reload();
  }

  const statusTabs = [
    { value: 'All', label: 'All' },
    // A combined filter arriving from an overview tile, e.g. "requested,assigned".
    ...(list.filters.status?.includes(',') ? [{ value: list.filters.status, label: 'Waiting on Mariox' }] : []),
    ...REQUEST_STATUS[kind].map(st => ({ value: st, label: st[0].toUpperCase() + st.slice(1) })),
  ];
  const toolbar = (
    <div className="toolbar">
      <SearchInput value={list.q} onChange={list.setQ} placeholder={`Search ${cfg.title.toLowerCase()}`} width={360} />
      <Chips tabs={statusTabs} value={list.filters.status || 'All'} onChange={v => list.setFilter('status', v === 'All' ? '' : v)} />
      {list.filtered && <Button size="sm" variant="ghost" icon="x" onClick={list.clear}>Clear</Button>}
    </div>
  );
  const pager = <Pagination meta={list.meta} onPage={list.setPage} onLimit={list.setLimit} label="requests" />;

  if (admin) {
    const columns: Column<RequestItem>[] = [
      { key: 'owner', header: 'Partner', width: '150px', render: r => <span className="strong">{(r.owner as OwnerRef)?.name ?? '—'}</span> },
      ...cfg.columns,
      { key: 'created', header: 'Raised', width: '90px', sort: 'createdAt', render: r => <span className="sub">{date(r.createdAt)}</span> },
      { key: 'status', header: 'Status', width: '130px', render: r => <StatusBadge status={r.status} /> },
    ];
    return (
      <>
        {!embedded && <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} />}
        {toolbar}
        <Card subtitle="Click a row to approve, assign, reschedule or reply.">
          <DataTable rows={items} loading={loading} columns={columns} rowKey={r => r._id} empty={list.filtered ? 'No requests match your filters.' : cfg.empty} onRowClick={setReviewing} minWidth={820} sort={list.sort} onSort={list.setSort} footer={pager} />
        </Card>
        {reviewing && (
          <Modal open title={`Review: ${String(reviewing.client || reviewing.subject || '')}`} onClose={() => setReviewing(null)}>
            <DynamicForm
              fields={[{ name: 'status', label: 'Status', type: 'select', options: REQUEST_STATUS[kind] }, ...cfg.reviewFields]}
              initial={Object.fromEntries(['status', ...cfg.reviewFields.map(f => f.name)].map(k => [k, reviewing[k] ?? (k === 'approved' ? reviewing.submitted : '')]))}
              submitLabel="Save review"
              onSubmit={review}
              onCancel={() => setReviewing(null)}
            />
            {kind === 'scope' && <ScopeDetails s={reviewing} />}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 14 }}>
              <Button size="sm" variant="danger" icon="trash" onClick={remove}>Delete this request</Button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  const isToolkit = cfg.eyebrow === 'Toolkit';

  // Scope approvals: a stack of cards plus a "New scope" modal, as in the original portal.
  if (kind === 'scope') {
    return (
      <>
        <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} actions={<Button variant="fire" icon="plus" onClick={() => setCreating(true)}>New scope</Button>} />
        <ToolkitNav />
        {toolbar}
        <div className="stack">
          {loading && !items ? <SkeletonCards /> : items?.length ? items.map(s => <ScopeCard key={s._id} s={s} rate={user?.commissionRate ?? DEFAULT_COMMISSION_RATE} onAccept={() => acceptRevised(s)} />) : <EmptyState title={list.filtered ? 'No submissions match your filters.' : cfg.empty} />}
        </div>
        {pager}
        <Drawer
          open={creating}
          title={cfg.formTitle}
          subtitle="Mariox usually responds within 2 working days."
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button variant="fire" icon="send" type="submit" form={SCOPE_FORM_ID} loading={submitting}>{cfg.submitLabel}</Button>
            </>
          }
        >
          <ScopeForm rate={user?.commissionRate ?? DEFAULT_COMMISSION_RATE} onSubmit={create} onBusy={setSubmitting} />
        </Drawer>
      </>
    );
  }

  // The partner's own requests, newest first (right-hand column).
  const listCard = (
    <Card title={cfg.listTitle} subtitle={list.meta ? `${list.meta.total} total` : undefined} className={kind === 'booking' ? undefined : 'stick'}>
      <div style={{ marginBottom: 6 }}><SearchInput value={list.q} onChange={list.setQ} placeholder="Search" width="100%" /></div>
      {loading && !items ? (
        <SkeletonCards count={2} height={70} />
      ) : items?.length ? (
        items.map(r => {
          const it = cfg.item(r);
          return (
            <div key={r._id} className="li" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
              <div className="between" style={{ alignItems: 'flex-start' }}>
                <b className="li-t">{it.title}</b>
                <StatusBadge status={r.status} />
              </div>
              <div className="sub">{it.sub}</div>
              {it.detail && <div className="sub" style={{ color: 'var(--ink-2)' }}>{it.detail}</div>}
            </div>
          );
        })
      ) : (
        <div className="empty">{list.filtered ? 'Nothing matches your search.' : cfg.empty}</div>
      )}
      {list.meta && list.meta.pages > 1 && (
        <div className="between" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <Button size="xs" icon="chevL" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>Newer</Button>
          <span className="sub mono">{list.page} / {list.meta.pages}</span>
          <Button size="xs" disabled={list.page >= list.meta.pages} onClick={() => list.setPage(list.page + 1)}>Older</Button>
        </div>
      )}
    </Card>
  );

  // Office visits: the original step-by-step booking screen with a live summary.
  if (kind === 'booking') {
    return (
      <>
        <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} />
        <ToolkitNav />
        <VisitBooking onSubmit={create} list={listCard} />
      </>
    );
  }

  // Tech requests and tickets: form on the left, the partner's own requests on the right.
  return (
    <>
      <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} />
      {isToolkit && <ToolkitNav />}
      {above}
      <div className="split">
        <Card title={kind === 'tech' ? undefined : cfg.formTitle} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {kind === 'tech' ? <TechForm onSubmit={create} /> : <DynamicForm key={String(creating)} fields={cfg.fields} submitLabel={cfg.submitLabel} onSubmit={create} resetOnSubmit />}
        </Card>
        {listCard}
      </div>
    </>
  );
}
