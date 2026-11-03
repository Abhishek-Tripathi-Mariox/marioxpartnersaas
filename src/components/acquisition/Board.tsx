'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { Icon } from '@/components/ui';
import { MOVE, OPEN, STATUSES, ST, countdown, fdt, flag, HOME, isUrl, order, overdue, platform, rel, t12, theirTime, today, waHref, dd, type AcqLead, type AcqStatus, type Range, type UpdateOpt } from '@/lib/acquisition';
import { Av, Avs, CdChip, TempBadge, partnerLine } from './bits';

type Props = {
  leads: AcqLead[];
  range: Range;
  now: number;
  onOpen: (l: AcqLead) => void;
  onUpdate: (l: AcqLead, opt?: UpdateOpt) => void;
  onOnboard: (l: AcqLead) => void;
  onRefuse: (msg: string) => void;
};

// Six columns: Lead · Meeting · Follow-up · Converted · Onboarding · Rejected.
// Dragging an open lead to another column opens the update dialog with that step picked;
// a converted lead dropped on Onboarding starts onboarding.
export function Board({ leads, range, now, onOpen, onUpdate, onOnboard, onRefuse }: Props) {
  const [over, setOver] = useState<AcqStatus | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  function drop(to: AcqStatus, id: string) {
    setOver(null);
    setDragging(null);
    const l = leads.find(x => x._id === id);
    if (!l) return;
    if (l.status === 'converted' && to === 'onboarding') return onOnboard(l);
    const opt = MOVE[l.status]?.[to];
    if (to === l.status && l.status !== 'meeting' && l.status !== 'followup') return;
    if (!opt) return onRefuse(to === 'contacted' ? 'Leads only move forward' : to === 'onboarding' ? 'Convert the lead first' : `${ST[l.status][0]}: use Reopen in the lead first`);
    onUpdate(l, opt);
  }

  return (
    <div className="kb3 rv">
      {STATUSES.map(k => {
        const L = leads.filter(l => l.status === k).sort((x, y) => order(x).localeCompare(order(y)));
        return (
          <section
            key={k}
            className={`kc-col ${over === k ? 'over' : ''}`}
            style={{ '--c': ST[k][1] } as CSSProperties}
            onDragOver={e => { e.preventDefault(); setOver(k); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(o => (o === k ? null : o)); }}
            onDrop={e => { e.preventDefault(); drop(k, e.dataTransfer.getData('text/plain')); }}
          >
            <header><i /><b>{ST[k][0]}</b><span className="cnt">{L.length}</span></header>
            <div className="kc-list">
              {L.map(l => <Card key={l._id} l={l} now={now} dragging={dragging === l._id} onOpen={onOpen} onUpdate={onUpdate} onOnboard={onOnboard} onDrag={setDragging} />)}
              {!L.length && <div className="kc-empty">{range === 'today' && OPEN.includes(k) ? 'Nothing today' : 'No leads'}</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ l, now, dragging, onOpen, onUpdate, onOnboard, onDrag }: { l: AcqLead; now: number; dragging: boolean; onOpen: (l: AcqLead) => void; onUpdate: (l: AcqLead) => void; onOnboard: (l: AcqLead) => void; onDrag: (id: string | null) => void }) {
  const od = overdue(l), open = OPEN.includes(l.status), t = today();
  let mid = null;
  if (l.status === 'meeting')
    mid = (
      <>
        <div className={`kc-m ${od ? 'bad' : countdown(l, now)[1]}`}>
          <span className="kc-mt">
            {l.meet.type || 'Meeting'}
            {!od && (l.meet.invited ? <em className="ok"><Icon name="check" size="s" />Invited</em> : <em>Not invited</em>)}
          </span>
          <b>{od ? 'Was ' + rel(l.meet.date).toLowerCase() : rel(l.meet.date)}{l.meet.time ? ' · ' + t12(l.meet.time) : ''}</b>
          <div className="kc-mr">{od ? <span>Update the result</span> : <><CdChip l={l} now={now} /><span>{theirTime(l) || platform(l.meet.link) || 'No link yet'}</span></>}</div>
        </div>
        {!!l.meet.attendees?.length && (
          <div className="kc-at"><Avs names={l.meet.attendees} /><span>{l.meet.attendees.length === 1 ? l.meet.attendees[0] : l.meet.attendees.length + ' attending'}</span></div>
        )}
      </>
    );
  else if (l.status === 'followup') mid = <div className={`kc-n ${od ? 'bad' : (l.next || '') === t ? 'now' : ''}`}><Icon name="clock" size="s" />Follow-up {l.next ? rel(l.next).toLowerCase() : 'not set'}</div>;
  else if (l.status === 'contacted') mid = <div className={`kc-n ${od ? 'bad' : (l.next || '') === t ? 'now' : ''}`}><Icon name="send" size="s" />Arrange meeting{l.next ? ' · ' + rel(l.next).toLowerCase() : ''}</div>;
  else if (l.status === 'onboarding') mid = <div className="kc-n acc"><Icon name="rocket" size="s" />Onboarding · {l.partner ? partnerLine(l) : 'in Partners'}</div>;
  else if (l.status === 'converted') mid = <div className="kc-n good"><Icon name="check" size="s" />Converted {fdt(l.convertedAt)} · {dd(l.contactedAt, l.convertedAt!)}d</div>;
  else mid = <div className="kc-n bad"><Icon name="x" size="s" />{l.reason || 'Rejected'}</div>;

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <article
      className={`kc ${od ? 'od' : ''} ${dragging ? 'dragging' : ''}`}
      draggable={open || l.status === 'converted'}
      onDragStart={e => { e.dataTransfer.setData('text/plain', l._id); e.dataTransfer.effectAllowed = 'move'; requestAnimationFrame(() => onDrag(l._id)); }}
      onDragEnd={() => onDrag(null)}
      onClick={() => onOpen(l)}
      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onOpen(l); } }}
      tabIndex={0}
    >
      <div className="kc-h">
        <Av name={l.name} />
        <div style={{ minWidth: 0, flex: 1 }}><b className="ell">{l.name}</b><span className="ell">{l.company || '—'}</span></div>
      </div>
      <div className="kc-t"><TempBadge t={l.temp} /><span>{flag(l.country || HOME)} {l.city || l.country || HOME}</span></div>
      {!!l.services?.length && (
        <div className="kc-s">{l.services.slice(0, 2).map(s => <span key={s}>{s}</span>)}{l.services.length > 2 && <span>+{l.services.length - 2}</span>}</div>
      )}
      {mid}
      <div className="kc-f">
        {l.phone && <a className="btn xs icon wa" href={waHref(l)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${l.name}`} onClick={stop}><Icon name="whatsapp" size="s" /></a>}
        {l.status === 'meeting' && isUrl(l.meet.link) && !od && <a className="btn xs" href={l.meet.link} target="_blank" rel="noopener noreferrer" onClick={stop}><Icon name="arrUR" size="s" />Join</a>}
        <span style={{ flex: 1 }} />
        {open ? (
          <button type="button" className={`btn xs ${od ? 'fire' : 'ink'}`} onClick={e => { stop(e); onUpdate(l); }}>Update</button>
        ) : l.status === 'converted' ? (
          <button type="button" className="btn xs ink" onClick={e => { stop(e); onOnboard(l); }}>Start onboarding</button>
        ) : l.status === 'onboarding' ? (
          <Link className="btn xs" href={partnerHref(l)} onClick={stop}><Icon name="users" size="s" />Partners</Link>
        ) : (
          <span className="kc-by">{l.owner || ''}</span>
        )}
      </div>
    </article>
  );
}

// The partner account made when they converted, else the partner list.
export const partnerHref = (l: AcqLead) => (typeof l.partner === 'object' && l.partner ? `/admin/partners/${l.partner._id}` : '/admin/partners');
