'use client';

import { useEffect, useState } from 'react';
import { CommissionChart } from '@/components/earnings/CommissionChart';
import { EarningsStats, type LedgerFilter } from '@/components/earnings/EarningsSummary';
import { useUser } from '@/components/UserProvider';
import { Card, Chips, DataTable, Note, PageHeader, Pagination, SearchInput, StatusBadge } from '@/components/ui';
import { usePaged } from '@/hooks/useList';
import { useApi } from '@/hooks/useApi';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { date, inr, pct } from '@/lib/format';
import { earnings } from '@/lib/metrics';
import type { Project } from '@/types';

const FILTERS = {
  All: () => true,
  Released: (s: string) => s === 'released',
  Processing: (s: string) => s === 'processing',
  Upcoming: (s: string) => s === 'due' || s === 'upcoming',
};
type Filter = keyof typeof FILTERS;

export default function EarningsPage() {
  const { user } = useUser();
  const { data, loading } = useApi<{ projects: Project[] }>('/api/projects');
  const [filter, setFilter] = useState<Filter>('All');
  const [calc, setCalc] = useState(1000000);
  const [q, setQ] = useState('');

  // Deep link from stat tiles on other pages: /earnings?status=Processing
  useEffect(() => {
    const st = new URLSearchParams(window.location.search).get('status');
    if (st && st in FILTERS) setFilter(st as Filter);
  }, []);

  // Stat tile on this page → filter the ledger and bring it into view.
  function pick(f: LedgerFilter) {
    setFilter(f);
    paged.setPage(1);
    document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const rate = user?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const ratePct = Math.round(rate * 100);
  const e = earnings(data?.projects ?? [], rate);
  const term = q.trim().toLowerCase();
  const rows = e.ledger.filter(x => FILTERS[filter](x.state) && (!term || `${x.client} ${x.label} ${x.utr ?? ''}`.toLowerCase().includes(term))).sort((a, b) => ((a.due || '') < (b.due || '') ? 1 : -1));

  const paged = usePaged(rows, 10);

  return (
    <>
      <PageHeader eyebrow="Commissions" title="Earnings" subtitle={`${ratePct}% of each client payment, released after Mariox receives it.`} />
      <EarningsStats e={e} active={filter} onPick={pick} rateLabel={`your ${ratePct}%`} />

      <div className="bento">
        <Card
          className="c8"
          title="Commission by month"
          subtitle="By client payment date"
          action={
            <div className="row wrap sub" style={{ gap: 14 }}>
              {[['var(--good)', 'Released'], ['var(--warn)', 'Processing'], ['var(--line-2)', 'Future']].map(([c, l]) => (
                <span key={l} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
              ))}
            </div>
          }
        >
          <CommissionChart ledger={e.ledger} />
          <div style={{ marginTop: 18 }}>
            <div className="bar xl">
              <i style={{ width: `${e.potential ? (e.released / e.potential) * 100 : 0}%` }} />
              <i className="warn" style={{ width: `${e.potential ? (e.processing / e.potential) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="between wrap sub" style={{ marginTop: 10 }}>
            <span>{pct(e.released, e.potential)}% released · {pct(e.processing, e.potential)}% processing</span>
            <span>of {inr(e.potential)} total potential</span>
          </div>
        </Card>

        <div className="card c4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><div className="card-t">What could you earn?</div><div className="card-s">Drag to size a deal</div></div>
          <div><span className="lbl">Deal value</span><div className="val num">{inr(calc)}</div></div>
          <input
            className="range"
            type="range"
            min={100000}
            max={5000000}
            step={50000}
            value={calc}
            onChange={ev => setCalc(Number(ev.target.value))}
            style={{ ['--p' as string]: `${((calc - 1e5) / 49e5) * 100}%` }}
            aria-label="Deal value"
          />
          <div className="note good">
            <span className="lbl" style={{ color: 'var(--good)' }}>Your {ratePct}% over the deal</span>
            <span className="val num" style={{ color: 'var(--good)' }}>{inr(calc * rate)}</span>
            <span className="sub">Paid out milestone by milestone as the client pays Mariox.</span>
          </div>
        </div>
      </div>

      <div id="ledger" style={{ scrollMarginTop: 96 }} />
      <Card title="Ledger" action={<Chips tabs={Object.keys(FILTERS) as Filter[]} value={filter} onChange={f => { setFilter(f); paged.setPage(1); }} />}>
        <div style={{ marginBottom: 8 }}><SearchInput value={q} onChange={v => { setQ(v); paged.setPage(1); }} placeholder="Search client, milestone or UTR" /></div>
        <DataTable
          rows={paged.items}
          footer={<Pagination meta={paged.meta} onPage={paged.setPage} onLimit={paged.setLimit} label="payments" />}
          loading={loading}
          rowKey={x => `${x.projectId}-${x._id}`}
          empty="No commissions in this view"
          columns={[
            { key: 'date', header: 'Date', width: '90px', render: x => <span className="mono sub">{date(x.due)}</span> },
            { key: 'client', header: 'Client', width: 'minmax(0,1.4fr)', render: x => <span className="strong">{x.client}</span> },
            { key: 'label', header: 'Milestone', width: 'minmax(0,1.3fr)', render: x => <span style={{ color: 'var(--ink-2)' }}>{x.label}</span> },
            { key: 'amount', header: 'Client paid', render: x => <span className="num">{inr(x.amount)}</span> },
            { key: 'c', header: `Your ${ratePct}%`, render: x => <span className="num strong">{inr(x.commission)}</span> },
            {
              key: 's', header: 'Status', width: 'minmax(0,1.3fr)',
              render: x => (
                <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
                  <StatusBadge status={x.state} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                    {x.state === 'released' ? `Paid ${date(x.releasedAt)}${x.utr ? ' · ' + x.utr : ''}` : x.state === 'processing' ? 'Expected in 5 working days' : 'When client pays'}
                  </span>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <div className="g2">
        <Note label="Deals closed" value={inr(e.deal)} href="/projects" info="Total contract value of all your projects in delivery." />
        <Note label="Received from clients" value={inr(e.received)} href="/projects" info="Sum of client payments marked received by Mariox, across all projects." />
      </div>
    </>
  );
}
