'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EarningsStats } from '@/components/earnings/EarningsSummary';
import { Avatar, Card, DataTable, MoreLink, PageHeader, StatCard, Stats } from '@/components/ui';
import { WON } from '@/lib/pipeline';
import { useApi } from '@/hooks/useApi';
import { usePipeline } from '@/components/SettingsProvider';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { short } from '@/lib/format';
import { earnings, pipeline } from '@/lib/metrics';
import type { Lead, OwnerRef, Project, RequestItem, User } from '@/types';

const KINDS = [
  { kind: 'scope', label: 'Scope reviews', icon: 'fileCheck', open: ['review'] },
  { kind: 'booking', label: 'Office visits', icon: 'cal', open: ['Requested'] },
  { kind: 'tech', label: 'Tech requests', icon: 'code', open: ['requested'] },
  { kind: 'ticket', label: 'Support tickets', icon: 'help', open: ['requested', 'assigned'] },
] as const;

export default function AdminOverview() {
  const cfg = usePipeline();
  const router = useRouter();
  const users = useApi<{ users: User[] }>('/api/admin/users');
  const leads = useApi<{ leads: Lead[] }>('/api/leads');
  const projects = useApi<{ projects: Project[] }>('/api/projects');
  const reqs = {
    scope: useApi<{ items: RequestItem[] }>('/api/requests/scope'),
    booking: useApi<{ items: RequestItem[] }>('/api/requests/booking'),
    tech: useApi<{ items: RequestItem[] }>('/api/requests/tech'),
    ticket: useApi<{ items: RequestItem[] }>('/api/requests/ticket'),
  };

  const partners = (users.data?.users ?? []).filter(u => u.role === 'partner');
  const allLeads = leads.data?.leads ?? [];
  const pipe = pipeline(allLeads, l => (l.owner as OwnerRef)?.commissionRate ?? DEFAULT_COMMISSION_RATE);
  const openKeys = cfg.stages.map(s => s.key).join(',');
  const money = earnings(projects.data?.projects ?? [], DEFAULT_COMMISSION_RATE);

  // Per-partner leaderboard.
  const board = partners
    .map(p => {
      const mine = allLeads.filter(l => (l.owner as OwnerRef)?._id === p.id);
      const theirProjects = (projects.data?.projects ?? []).filter(pr => (typeof pr.owner === 'object' ? pr.owner._id : pr.owner) === p.id);
      // Each partner's commission uses their own rate (and each project's locked rate).
      const e = earnings(theirProjects, p.commissionRate);
      return { ...p, ...pipeline(mine, p.commissionRate), released: e.released, processing: e.processing, future: e.future };
    })
    .sort((a, b) => b.expected + b.released - (a.expected + a.released) || b.openValue - a.openValue);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" subtitle="All partners, pipeline and payouts across Mariox." />
      <Stats>
        <StatCard icon="users" tone="info" label="Partners" value={partners.length} hint={`${partners.filter(p => p.status === 'active').length} active`}
          href="/admin/partners?status=active" info="All partner accounts. Opens the active partners." />
        <StatCard icon="pipe" tone="fire" label="Open pipeline" value={short(pipe.openValue)} hint={`${pipe.open} leads`}
          href={`/admin/leads?view=list&stage=${openKeys}&sort=-value`} info="Deal value of every lead, across all partners, that is not Won or Lost." />
        <StatCard icon="rupee" tone="good" label="Expected commission" value={short(pipe.expected)} hint="On won deals" good
          href={`/admin/leads?view=list&stage=${WON}&sort=-value`} info="Value of every Won lead × that partner's commission rate, added up." />
        <StatCard icon="trophy" tone="good" label="Won" value={short(pipe.wonValue)} hint={`${pipe.won} deals · ${pipe.winRate}% win rate`}
          href={`/admin/leads?view=list&stage=${WON}&sort=-value`} info="Deal value of Won leads. Win rate = Won ÷ (Won + Lost)." />
      </Stats>
      <div className="eyebrow" style={{ marginTop: 4 }}>Waiting on Mariox</div>
      <Stats>
        {KINDS.map(k => (
          <StatCard key={k.kind} icon={k.icon} tone="warn" label={k.label}
            value={(reqs[k.kind].data?.items ?? []).filter(i => (k.open as readonly string[]).includes(i.status)).length}
            hint={`Status: ${k.open.join(' or ')}`}
            href={`/admin/requests?kind=${k.kind}&status=${k.open.join(',')}`}
            info={`${k.label} whose status is ${k.open.join(' or ')}: still need a decision or reply from Mariox.`} />
        ))}
      </Stats>
      <div className="eyebrow" style={{ marginTop: 4 }}>Partner commissions</div>
      <EarningsStats e={money} releasedHint="Paid to partners" rateLabel="each partner's rate" hrefFor={() => '/admin/projects'} />

      <Card title="Partner leaderboard" subtitle="Commission per partner at their own rate · Expected = won deal value × rate · Pending = client paid, payout not released" action={<MoreLink href="/admin/partners">Manage</MoreLink>}>
        <DataTable
          rows={board}
          rowKey={p => p.id}
          onRowClick={p => router.push(`/admin/partners/${p.id}`)}
          empty="No partners yet"
          minWidth={980}
          columns={[
            { key: 'name', header: 'Partner', width: 'minmax(0,2fr)', render: p => <div className="row" style={{ minWidth: 0 }}><Avatar name={p.name} size="s" /><div><div className="strong">{p.name}</div><div className="sub">{p.company} · {p.partnerCode}</div></div></div> },
            { key: 'pct', header: 'Rate', width: '70px', align: 'right', render: p => <span className="num strong">{Math.round(p.commissionRate * 100)}%</span> },
            { key: 'open', header: 'Open', align: 'right', render: p => <span className="num">{p.open} · {short(p.openValue)}</span> },
            { key: 'won', header: 'Won', align: 'right', render: p => <span className="num">{p.won} · {short(p.wonValue)}</span> },
            { key: 'exp', header: 'Expected', align: 'right', render: p => <span className="num earn">{short(p.expected)}</span> },
            { key: 'rel', header: 'Released', align: 'right', render: p => <span className="num">{short(p.released)}</span> },
            { key: 'proc', header: 'Pending payout', align: 'right', render: p => <span className="num" style={p.processing ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>{short(p.processing)}</span> },
            { key: 'win', header: 'Win rate', width: '80px', align: 'right', render: p => `${p.winRate}%` },
          ]}
        />
      </Card>
    </>
  );
}
