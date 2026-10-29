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
  const pipe = pipeline(allLeads, cfg);
  const openKeys = cfg.stages.map(s => s.key).join(',');
  const money = earnings(projects.data?.projects ?? [], DEFAULT_COMMISSION_RATE);

  // Per-partner leaderboard.
  const board = partners
    .map(p => {
      const mine = allLeads.filter(l => (l.owner as OwnerRef)?._id === p.id);
      return { ...p, ...pipeline(mine, cfg) };
    })
    .sort((a, b) => b.wonValue + b.openValue - (a.wonValue + a.openValue));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" subtitle="All partners, pipeline and payouts across Mariox." />
      <Stats>
        <StatCard icon="users" tone="info" label="Partners" value={partners.length} hint={`${partners.filter(p => p.status === 'active').length} active`}
          href="/admin/partners?status=active" info="All partner accounts. Opens the active partners." />
        <StatCard icon="pipe" tone="fire" label="Open pipeline" value={short(pipe.openValue)} hint={`${pipe.open} leads`}
          href={`/admin/leads?view=list&stage=${openKeys}&sort=-value`} info="Deal value of every lead, across all partners, that is not Won or Lost." />
        <StatCard icon="target" tone="violet" label="Weighted forecast" value={short(pipe.weighted)} hint="Value × stage probability"
          href={`/admin/leads?view=list&stage=${openKeys}&sort=-value`} info="Each open lead's value × its stage probability (Settings → Stages), added up." />
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

      <Card title="Partner leaderboard" action={<MoreLink href="/admin/partners">Manage</MoreLink>}>
        <DataTable
          rows={board}
          rowKey={p => p.id}
          onRowClick={p => router.push(`/admin/partners/${p.id}`)}
          empty="No partners yet"
          columns={[
            { key: 'name', header: 'Partner', width: 'minmax(0,2fr)', render: p => <div className="row" style={{ minWidth: 0 }}><Avatar name={p.name} size="s" /><div><div className="strong">{p.name}</div><div className="sub">{p.company} · {p.partnerCode}</div></div></div> },
            { key: 'open', header: 'Open', align: 'right', render: p => `${p.open} · ${short(p.openValue)}` },
            { key: 'won', header: 'Won', align: 'right', render: p => <span className="num earn">{short(p.wonValue)}</span> },
            { key: 'rate', header: 'Win rate', align: 'right', render: p => `${p.winRate}%` },
          ]}
        />
      </Card>
    </>
  );
}
