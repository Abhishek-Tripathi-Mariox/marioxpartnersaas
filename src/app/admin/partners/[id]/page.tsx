'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { PipelineView } from '@/components/leads/PipelineView';
import { ProjectList } from '@/components/projects/ProjectList';
import { AttachmentList, type Attachment } from '@/components/forms/FileUploader';
import { Button, EmptyState, Icon, Input, Modal, StatCard, Stats, StatusBadge, Tabs, hue, initials, useToast, SkeletonCards } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { date, inr, short } from '@/lib/format';
import { earnings, pipeline } from '@/lib/metrics';
import type { Lead, Project, RequestItem, User } from '@/types';

const EDIT_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'company', label: 'Company' },
  { name: 'city', label: 'City' },
  { name: 'commissionPct', label: 'Commission (%)', type: 'number' },
  { name: 'industries', label: 'Industries', full: true },
  { name: 'pan', label: 'PAN' },
  { name: 'gstin', label: 'GSTIN' },
  { name: 'bankAccount', label: 'Bank account' },
  { name: 'ifsc', label: 'IFSC' },
];

type Tab = 'leads' | 'projects' | 'requests';
const KINDS = ['scope', 'booking', 'tech', 'ticket'] as const;
const KIND_LABEL = { scope: 'Scope', booking: 'Office visit', tech: 'Tech request', ticket: 'Ticket' };

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data, reload, setData } = useApi<{ user: User }>(`/api/admin/users/${id}`);
  const leads = useApi<{ leads: Lead[] }>(`/api/leads?owner=${id}`);
  const projects = useApi<{ projects: Project[] }>(`/api/projects?owner=${id}`);
  const reqs = {
    scope: useApi<{ items: RequestItem[] }>(`/api/requests/scope?owner=${id}`),
    booking: useApi<{ items: RequestItem[] }>(`/api/requests/booking?owner=${id}`),
    tech: useApi<{ items: RequestItem[] }>(`/api/requests/tech?owner=${id}`),
    ticket: useApi<{ items: RequestItem[] }>(`/api/requests/ticket?owner=${id}`),
  };
  const [tab, setTab] = useState<Tab>('leads');
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState<string | null>(null);

  const u = data?.user;
  if (!u) return <SkeletonCards count={2} height={200} />;

  const mine = (projects.data?.projects ?? []).filter(p => (typeof p.owner === 'object' ? p.owner._id : p.owner) === id);
  const m = earnings(mine, u.commissionRate);
  const pipe = pipeline(leads.data?.leads ?? [], u.commissionRate);
  const myReqs = KINDS.flatMap(k => (reqs[k].data?.items ?? []).filter(r => (typeof r.owner === 'object' ? r.owner._id : r.owner) === id).map(r => ({ r, kind: k })));

  async function patch(body: Record<string, unknown>, msg: string) {
    try {
      const res = await api.patch<{ user: User; setPasswordUrl: string | null }>(`/api/admin/users/${id}`, body);
      setData({ user: res.user });
      if (res.setPasswordUrl) setInvite(res.setPasswordUrl);
      toast(msg);
      return res;
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove() {
    if (prompt(`Type DELETE to remove ${u!.name} and all their leads and requests.`) !== 'DELETE') return;
    try {
      await api.del(`/api/admin/users/${id}`);
      toast('Partner deleted');
      router.push('/admin/partners');
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const suspended = u.status === 'disabled';

  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>
        <Link className="more" href="/admin/partners"><Icon name="chevL" size="s" />All partners</Link>
        <span className="spacer" />
        <Button size="sm" icon="note" onClick={() => setEditing(true)}>Edit details</Button>
        <Button size="sm" icon="shield" onClick={() => setPwOpen(true)}>Set password</Button>
        <Button size="sm" icon="send" onClick={() => patch({ newInvite: true }, 'New invite link created')}>Invite link</Button>
        {suspended ? (
          <Button size="sm" variant="good" icon="check" onClick={() => patch({ status: 'active' }, 'Partner reactivated')}>Reactivate</Button>
        ) : (
          <Button size="sm" variant="danger" icon="alert" onClick={() => confirm(`Suspend ${u.name}? They are signed out at once and can't log in.`) && patch({ status: 'disabled' }, 'Partner suspended')}>Suspend</Button>
        )}
        <Button size="sm" variant="danger" icon="trash" onClick={remove}>Delete</Button>
      </div>

      <div className="ccard" style={{ ['--glow' as string]: `hsla(${hue(u.name)},70%,55%,.55)`, padding: 26 }}>
        <div className="between wrap" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="row" style={{ gap: 14 }}>
            <span className="big-av" style={{ background: `hsl(${hue(u.name)} 52% 46%)` }}>{initials(u.name)}</span>
            <div>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ font: '700 30px/1.05 var(--display)', letterSpacing: '-.035em' }}>{u.name}</div>
                <StatusBadge status={u.status} />
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                {[u.partnerCode, u.company, u.city, u.email, u.phone].filter(Boolean).join(' · ')}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Joined {date(u.createdAt)} via {u.source} · last login {u.lastLoginAt ? date(u.lastLoginAt) : 'never'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl">Commission</div>
            <div style={{ font: '700 30px var(--display)', letterSpacing: '-.03em' }}>{Math.round(u.commissionRate * 100)}%</div>
          </div>
        </div>
      </div>

      <Stats>
        <StatCard icon="pipe" tone="fire" label="Open pipeline" value={short(pipe.openValue)} hint={`${pipe.open} leads`} onClick={() => setTab('leads')} active={tab === 'leads'}
          info="This partner's leads that are not Won or Lost." />
        <StatCard icon="trophy" tone="good" label="Deals won" value={short(pipe.wonValue)} hint={`${pipe.won} won · ${pipe.winRate}% win rate`} onClick={() => setTab('leads')}
          info="Won leads. Win rate = Won ÷ (Won + Lost)." />
        <StatCard icon="check" tone="good" label="Commission released" value={inr(m.released)} hint={`${mine.length} projects`} good onClick={() => setTab('projects')} active={tab === 'projects'}
          info={`Received client payments with payout released × ${Math.round(u.commissionRate * 100)}%.`} />
        <StatCard icon="refresh" tone="warn" label="Pending payout" value={inr(m.processing)} hint="Client paid, not yet released" onClick={() => setTab('projects')}
          info="Client has paid Mariox but the partner's commission is not released yet. Release it from the project's payment schedule." />
      </Stats>

      <div>
        <Tabs
          tabs={[
            { value: 'leads', label: 'Leads', count: leads.data?.leads.length },
            { value: 'projects', label: 'Projects', count: mine.length },
            { value: 'requests', label: 'Requests', count: myReqs.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'leads' && <PipelineView admin partnerId={id} />}
      {tab === 'projects' && <ProjectList ownerId={id} rate={u.commissionRate} />}
      {tab === 'requests' && (
        <div className="card">
          {myReqs.length ? (
            myReqs.map(({ r, kind }) => (
              <Link key={r._id} href="/admin/requests" className="li btn-li">
                <div>
                  <div className="li-t">{String(r.project || r.subject || r.type || r.client)}</div>
                  <div className="sub">{KIND_LABEL[kind]} · {String(r.client ?? r.category ?? '')} · {date(r.createdAt)}</div>
                </div>
                <span className="row" style={{ gap: 10 }}>
                  {Array.isArray(r.attachments) && r.attachments.length > 0 && <AttachmentList files={r.attachments as Attachment[]} compact />}
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            ))
          ) : (
            <div className="empty">No requests from this partner</div>
          )}
        </div>
      )}

      <Modal open={editing} title={`Edit ${u.name}`} onClose={() => setEditing(false)} wide>
        <DynamicForm
          fields={EDIT_FIELDS}
          initial={{ ...u, commissionPct: Math.round(u.commissionRate * 100) } as unknown as Record<string, unknown>}
          submitLabel="Save partner"
          onCancel={() => setEditing(false)}
          onSubmit={async v => {
            const { commissionPct, ...rest } = v;
            const body = Object.fromEntries(EDIT_FIELDS.filter(f => f.name !== 'commissionPct').map(f => [f.name, rest[f.name] ?? '']));
            const res = await api.patch<{ user: User }>(`/api/admin/users/${id}`, { ...body, commissionRate: Number(commissionPct) / 100 });
            setData({ user: res.user });
            setEditing(false);
            toast('Partner updated');
          }}
        />
      </Modal>

      <Modal open={pwOpen} title="Set a new password" onClose={() => setPwOpen(false)}>
        <form
          className="stack"
          onSubmit={async e => {
            e.preventDefault();
            if ((await patch({ password }, 'Password updated')) !== undefined) {
              setPwOpen(false);
              setPassword('');
            }
          }}
        >
          <Input label="New password" type="text" minLength={8} required hint="At least 8 characters. Share it with the partner securely." value={password} onChange={e => setPassword(e.target.value)} />
          <div className="form-foot">
            <Button type="button" variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button variant="fire">Save password</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!invite} title="New invite link" onClose={() => { setInvite(null); reload(); }}>
        <div className="stack">
          <p className="sub" style={{ fontSize: 14 }}>Send this one-time link to the partner. It expires in 7 days and replaces any older link.</p>
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
