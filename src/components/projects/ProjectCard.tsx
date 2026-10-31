'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, Icon, Progress, StatusBadge } from '@/components/ui';
import { DEFAULT_COMMISSION_RATE, PROJECT_STAGES } from '@/lib/constants';
import { date, inr, pct, short } from '@/lib/format';
import { commissionState } from '@/lib/metrics';
import type { OwnerRef, Payment, Project } from '@/types';

// Payment milestones with client status and the partner's commission on each.
export function PaymentTable({ payments, rate }: { payments: Payment[]; rate: number }) {
  return (
    <DataTable<Payment>
      rows={payments}
      rowKey={p => p._id || p.label}
      empty="No payment schedule yet"
      columns={[
        { key: 'label', header: 'Payment milestone', width: 'minmax(0,1.6fr)', render: p => <><div className="strong">{p.label}</div><div className="sub">{p.status === 'received' ? 'Paid' : 'Due'} {date(p.due)}</div></> },
        { key: 'amount', header: 'Client pays', render: p => <span className="num">{inr(p.amount)}</span> },
        { key: 'status', header: 'Client status', render: p => <StatusBadge status={p.status} /> },
        { key: 'earn', header: 'You earn', render: p => <span className="num strong">{inr(p.amount * rate)}</span> },
        { key: 'comm', header: 'Commission', render: p => <StatusBadge status={commissionState(p)} /> },
      ]}
    />
  );
}

// Milestone timeline (".ptl") with done / current / upcoming steps.
function Timeline({ stage, milestones }: { stage: number; milestones: string[] }) {
  return (
    <div className="ptl">
      {PROJECT_STAGES.map((l, i) => (
        <div key={l} className={`ptl-s ${i < stage ? 'd' : i === stage ? 'c' : ''}`}>
          <div className="ptl-d">
            <b>{i < stage ? '✓' : ''}</b>
            {i < PROJECT_STAGES.length - 1 && <i />}
          </div>
          <div className="ptl-t">
            {l}
            <small>{i < stage ? 'Done ' : i === stage ? 'Target ' : ''}{date(milestones[i])}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectCard({ project: p, rate, action }: { project: Project; rate?: number; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const owner = typeof p.owner === 'object' ? (p.owner as OwnerRef) : null;
  const r = p.commissionRate ?? rate ?? owner?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const received = p.payments.filter(x => x.status === 'received').reduce((a, x) => a + x.amount, 0);
  const next = p.payments.find(x => x.status !== 'received');

  return (
    <div className="card" id={`p-${p._id}`} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="between wrap" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="ico t-violet"><Icon name="layers" /></span>
          <div>
            <div style={{ font: '700 22px/1.1 var(--display)', letterSpacing: '-.03em' }}>{p.title}</div>
            <div className="sub" style={{ marginTop: 4 }}>
              {p.client} · Project manager {p.pm || '—'}{owner && ` · Partner ${owner.name}`}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl">Current milestone</div>
            <div style={{ font: '700 17px var(--display)', color: 'var(--accent)', marginTop: 4 }}>{PROJECT_STAGES[p.stage]}</div>
          </div>
          {action}
        </div>
      </div>

      <Timeline stage={p.stage} milestones={p.milestones} />

      <div className="g2" style={{ gap: 12 }}>
        <div className="note"><span className="lbl">Latest update</span><span>{p.update || 'No update yet.'}</span></div>
        <div className="note good">
          <span className="lbl" style={{ color: 'var(--good)' }}>Next client payment</span>
          <span>{next ? `${next.label} · ${inr(next.amount)} due ${date(next.due)} (you earn ${inr(next.amount * r)})` : 'All payments received'}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button className="between wrap" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ width: '100%', textAlign: 'left' }}>
          <span className="row wrap" style={{ gap: 14 }}>
            <b style={{ font: '700 16px var(--display)' }}>Payments</b>
            <span style={{ width: 150 }}><Progress value={pct(received, p.deal)} /></span>
            <span className="sub">{short(received)} of {short(p.deal)} received · earned {inr(received * r)}</span>
          </span>
          <span className="btn sm">{open ? 'Hide payments' : 'Track payments'}<Icon name={open ? 'chev' : 'chevR'} size="s" /></span>
        </button>
        {open && <div style={{ animation: 'rise .5s var(--ease) both' }}><PaymentTable payments={p.payments} rate={r} /></div>}
      </div>
    </div>
  );
}
