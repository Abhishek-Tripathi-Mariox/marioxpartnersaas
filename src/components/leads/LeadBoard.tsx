'use client';

import Link from 'next/link';
import { usePipeline } from '@/components/SettingsProvider';
import { Avatar, Badge } from '@/components/ui';
import { short } from '@/lib/format';
import { LOST, WON, allStages, isOpen, priorityTone, stageColor, stageName } from '@/lib/pipeline';
import type { Lead, OwnerRef } from '@/types';
import { dueLabel } from './TaskRow';
import { daysSince, nextTask } from './stages';

export function LeadCard({ lead: l, rate, href, showOwner }: { lead: Lead; rate: number; href: string; showOwner?: boolean }) {
  const cfg = usePipeline();
  const nt = isOpen(l.stage) ? nextTask(l) : undefined;
  const d = nt && dueLabel(nt.due);
  const nxTone = nt ? d!.tone : l.stage === WON ? 'good' : '';
  const nxText = nt ? nt.text : l.stage === WON ? 'Closed won' : l.stage === LOST ? `Lost · ${l.lostReason || 'Not specified'}` : 'No follow-up set';
  const contact = (l.contact || '—').split(',')[0];
  const owner = showOwner && typeof l.owner === 'object' ? (l.owner as OwnerRef) : null;

  return (
    <Link className="lead" href={href} aria-label={`${l.company}, ${stageName(cfg, l.stage)}`}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="co">{l.company}</div>
          <div className="pr">{l.project}</div>
        </div>
        {l.priority && <Badge tone={priorityTone(cfg, l.priority)} dot={false} style={{ height: 22, fontSize: 11 }}>{l.priority}</Badge>}
      </div>
      <div className="between" style={{ alignItems: 'baseline' }}>
        <span className="vv num">{short(l.value)}</span>
        <span className="earn num" style={{ fontSize: 12 }}>earn {short(l.value * rate)}</span>
      </div>
      <div className={`nx ${nxTone}`}>
        <span>{nxText}</span>
        <b>{nt ? d!.text : ''}</b>
      </div>
      <div className="between sub" style={{ fontSize: 12 }}>
        <span className="row" style={{ gap: 7, minWidth: 0 }}><Avatar name={owner?.name ?? contact} size="xs" />{owner?.name ?? contact}</span>
        <span>{daysSince(l.updatedAt)}d in stage</span>
      </div>
    </Link>
  );
}

// Kanban view of leads, one column per pipeline stage (from settings) plus Won and Lost.
export function LeadBoard({ leads, rate, hrefBase = '/leads', showOwner }: { leads: Lead[]; rate: (l: Lead) => number; hrefBase?: string; showOwner?: boolean }) {
  const cfg = usePipeline();
  const total = leads.reduce((a, l) => a + l.value, 0) || 1;
  return (
    <div className="board">
      {allStages(cfg).map(stage => {
        const col = leads.filter(l => l.stage === stage.key);
        const v = col.reduce((a, l) => a + l.value, 0);
        const color = stageColor(cfg, stage.key);
        return (
          <div key={stage.key} className={`col ${stage.key === WON ? 'won' : stage.key === LOST ? 'lost' : ''}`}>
            <div className="col-h">
              <div className="t">
                <i style={{ background: color }} />
                {stage.name}
                <span className="n">{col.length}</span>
              </div>
              <span className="m num">{short(v)} · {stage.prob}%</span>
              <div className="col-meter"><i style={{ width: `${(v / total) * 100}%`, background: color }} /></div>
            </div>
            {col.length ? col.map(l => <LeadCard key={l._id} lead={l} rate={rate(l)} href={`${hrefBase}/${l._id}`} showOwner={showOwner} />) : <div className="empty">No leads</div>}
          </div>
        );
      })}
    </div>
  );
}
