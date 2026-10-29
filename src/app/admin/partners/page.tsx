'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { Avatar, Button, Card, Chips, DataTable, Input, Modal, PageHeader, Pagination, SearchInput, Select, StatusBadge, useToast } from '@/components/ui';
import { useList } from '@/hooks/useList';
import { api } from '@/lib/client';
import { date } from '@/lib/format';
import type { User } from '@/types';

const NEW_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'company', label: 'Company' },
  { name: 'city', label: 'City' },
  { name: 'password', label: 'Password', hint: 'Leave empty to send an invite link instead' },
];

const STATUS_TABS = [
  { value: 'All', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'disabled', label: 'Suspended' },
];
const SOURCES = [
  { value: 'main-site', label: 'Main website' },
  { value: 'admin', label: 'Added by admin' },
  { value: 'seed', label: 'Demo data' },
];

export default function PartnersPage() {
  const toast = useToast();
  const router = useRouter();
  const list = useList<User>('/api/admin/users', 'users', { sort: '-createdAt' });
  const [adding, setAdding] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);

  async function create(v: Record<string, unknown>) {
    const res = await api.post<{ setPasswordUrl: string | null }>('/api/admin/users', { ...v, password: v.password || undefined });
    setAdding(false);
    setInvite(res.setPasswordUrl);
    if (!res.setPasswordUrl) toast('Partner created');
    list.reload();
  }

  async function setStatus(u: User, status: User['status']) {
    try {
      await api.patch(`/api/admin/users/${u.id}`, { status });
      toast(status === 'disabled' ? `${u.name} suspended` : `${u.name} reactivated`);
      list.reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Partners"
        subtitle="Accounts created here or from the main website through POST /api/v1/users."
        actions={<Button variant="fire" icon="plus" onClick={() => setAdding(true)}>Add partner</Button>}
      />

      <div className="toolbar">
        <SearchInput value={list.q} onChange={list.setQ} placeholder="Search name, email, company, code or phone" width={420} />
        <Chips tabs={STATUS_TABS} value={list.filters.status || 'All'} onChange={v => list.setFilter('status', v === 'All' ? '' : v)} />
        <div style={{ width: 200 }}>
          <Select options={SOURCES} placeholder="Any source" value={list.filters.source ?? ''} onChange={e => list.setFilter('source', e.target.value)} aria-label="Source" />
        </div>
        {list.filtered && <Button size="sm" variant="ghost" icon="x" onClick={list.clear}>Clear</Button>}
      </div>

      <Card>
        <DataTable
          rows={list.items}
          loading={list.loading}
          rowKey={u => u.id}
          onRowClick={u => u.role === 'partner' && router.push(`/admin/partners/${u.id}`)}
          minWidth={980}
          sort={list.sort}
          onSort={list.setSort}
          empty={list.filtered ? 'No partners match your search.' : 'No partners yet.'}
          footer={<Pagination meta={list.meta} onPage={list.setPage} onLimit={list.setLimit} label="accounts" />}
          columns={[
            {
              key: 'name', header: 'Partner', width: 'minmax(0,1.8fr)', sort: 'name',
              render: u => (
                <div className="row" style={{ minWidth: 0 }}>
                  <Avatar name={u.name} size="s" />
                  <div style={{ minWidth: 0 }}><div className="strong">{u.name}</div><div className="sub">{u.email}</div></div>
                </div>
              ),
            },
            { key: 'code', header: 'Code', width: '100px', render: u => <span className="mono sub">{u.partnerCode || (u.role === 'admin' ? 'admin' : '—')}</span> },
            { key: 'company', header: 'Company', sort: 'company', render: u => u.company || '—' },
            { key: 'rate', header: 'Commission', width: '120px', sort: 'commissionRate', render: u => <span className="num strong">{u.role === 'partner' ? `${Math.round(u.commissionRate * 100)}%` : '—'}</span> },
            { key: 'src', header: 'Source', width: '100px', render: u => <span className="sub">{u.source}</span> },
            { key: 'joined', header: 'Joined', width: '100px', sort: 'createdAt', render: u => <span className="sub">{date(u.createdAt)}</span> },
            { key: 'login', header: 'Last login', width: '110px', sort: 'lastLoginAt', render: u => <span className="sub">{u.lastLoginAt ? date(u.lastLoginAt) : 'Never'}</span> },
            { key: 'status', header: 'Status', width: '100px', render: u => <StatusBadge status={u.status} /> },
            {
              key: 'act', header: '', width: '110px', align: 'right',
              render: u =>
                u.role === 'partner' && (
                  <span onClick={e => e.stopPropagation()}>
                    {u.status === 'disabled' ? (
                      <Button size="xs" variant="good" onClick={() => setStatus(u, 'active')}>Reactivate</Button>
                    ) : (
                      <Button size="xs" variant="danger" onClick={() => confirm(`Suspend ${u.name}?`) && setStatus(u, 'disabled')}>Suspend</Button>
                    )}
                  </span>
                ),
            },
          ]}
        />
      </Card>

      <Modal open={adding} title="Add partner" onClose={() => setAdding(false)}>
        <DynamicForm fields={NEW_FIELDS} submitLabel="Create partner" onSubmit={create} onCancel={() => setAdding(false)} />
      </Modal>

      <Modal open={!!invite} title="Partner created" onClose={() => setInvite(null)}>
        <div className="stack">
          <p className="sub" style={{ fontSize: 14 }}>Send this one-time link to the partner so they can set a password. It expires in 7 days.</p>
          <Input readOnly className="mono" value={invite || ''} onFocus={e => e.target.select()} />
          <div className="form-foot">
            <Button icon="copy" onClick={() => { navigator.clipboard.writeText(invite || ''); toast('Link copied'); }}>Copy link</Button>
            <Button variant="ink" onClick={() => setInvite(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
