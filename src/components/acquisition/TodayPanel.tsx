'use client';

import { Icon } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { HOME, TLBL, add, dd, dow, fdt, flag, isUrl, platform, t12, theirTime, tick, today, waHref, type AcqLead, type Query } from '@/lib/acquisition';
import { Av, Avs, TempBadge } from './bits';

type Props = {
  leads: AcqLead[];
  Q: Query;
  onOpen: (l: AcqLead) => void;
  onUpdate: (l: AcqLead) => void;
  onEdit: (l: AcqLead) => void;
  onInvite: (l: AcqLead) => void;
};

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

// Today: a live clock, the next meeting with a running countdown, today's meetings,
// follow-ups due and meetings whose result still has to be added. Ticks every second.
export function TodayPanel({ leads, Q, onOpen, onUpdate, onEdit, onInvite }: Props) {
  const now = useNow(1000);
  const t = today();
  const mine = (l: AcqLead) => Q.who === 'all' || l.owner === Q.who || (l.meet?.attendees ?? []).includes(Q.who);
  const meets = leads.filter(l => l.status === 'meeting' && l.meet?.date === t && mine(l)).sort((a, b) => (a.meet.time || '').localeCompare(b.meet.time || ''));
  const hero = meets.find(l => tick(l, 'short', now)[1] !== 'over');
  const fu = leads.filter(l => mine(l) && (l.status === 'followup' || l.status === 'contacted') && l.next && l.next <= t).sort((a, b) => (a.next || '').localeCompare(b.next || ''));
  const res = leads.filter(l => mine(l) && l.status === 'meeting' && l.meet?.date && l.meet.date < t);
  const tmr = leads.filter(l => mine(l) && l.status === 'meeting' && l.meet?.date === add(t, 1)).length;
  const clock = new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  let H;
  if (hero) {
    const [tx, st] = tick(hero, 'long', now), m = hero.meet, tt = theirTime(hero);
    H = (
      <div className={`td-hero ${st}`}>
        <div className="td-hl"><span className="td-tag">{st === 'live' ? <><i />Live now</> : 'Next meeting'}</span><span className="td-ty">{m.type || 'Meeting'} · {+(m.duration ?? 30) || 30}m</span></div>
        <div className="td-time">{t12(m.time)}</div>
        <div className="td-tm"><b>{tx}</b><span>{TLBL[st]}</span></div>
        <button type="button" className="td-who" onClick={() => onOpen(hero)}>
          <Av name={hero.name} />
          <span><b>{hero.name} <TempBadge t={hero.temp} /></b><small>{hero.company || '—'} · {flag(hero.country || HOME)} {hero.city || hero.country || HOME}{tt ? ' · ' + tt : ''}</small></span>
        </button>
        <div className="td-att"><Avs names={m.attendees} /><span>{(m.attendees ?? []).join(', ') || 'No one assigned'}</span></div>
        {!!m.prep?.length && <div className="iv-prep">{m.prep.map(x => <i key={x}>{x}</i>)}</div>}
        <div className="td-act">
          {isUrl(m.link) ? (
            <a className="btn fire" href={m.link} target="_blank" rel="noopener noreferrer"><Icon name="video" size="s" />Join {platform(m.link) === 'Meeting link' ? 'call' : platform(m.link)}</a>
          ) : (
            <button type="button" className="btn" onClick={() => onEdit(hero)}><Icon name="plus" size="s" />Add link</button>
          )}
          {hero.phone && <a className="btn icon wa" href={waHref(hero)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${hero.name}`}><Icon name="whatsapp" size="s" /></a>}
          <button type="button" className={`btn icon ${m.invited ? '' : 'nv'}`} onClick={() => onInvite(hero)} title={m.invited ? 'Invite sent · send again' : 'Send the invite'} aria-label="Send the invite"><Icon name="send" size="s" /></button>
        </div>
      </div>
    );
  } else {
    H = <div className="td-free"><Icon name="cal" /><b>{meets.length ? 'All meetings done' : 'No meetings today'}</b><span>{tmr ? `${tmr} tomorrow` : 'Book one from a lead'}</span></div>;
  }

  return (
    <aside className="td rv" aria-label="Today">
      <div className="td-top"><div><span className="lbl">Today</span><div className="td-day">{dow(t)}, {fdt(t)}</div></div><b className="td-clock">{clock}</b></div>
      {H}
      <div className="td-sec">
        <div className="td-sh"><b>Meetings today</b><span className="cnt">{meets.length}</span></div>
        {meets.map(l => {
          const [tx, st] = tick(l, 'short', now);
          return (
            <div key={l._id} className={`td-r ${st}`} onClick={() => onOpen(l)}>
              <span className="td-rt"><b>{t12(l.meet.time)}</b><small>{tx}</small></span>
              <span className="td-rn"><b className="ell">{l.name}</b><small className="ell">{l.meet.type || 'Meeting'} · {(l.meet.attendees ?? []).join(', ') || 'no one assigned'}</small></span>
              {st === 'over' ? <button type="button" className="btn xs fire" onClick={e => { stop(e); onUpdate(l); }}>Result</button>
                : isUrl(l.meet.link) ? <a className="btn xs" href={l.meet.link} target="_blank" rel="noopener noreferrer" onClick={stop}>Join</a> : null}
            </div>
          );
        })}
        {!meets.length && <div className="td-e">None scheduled</div>}
      </div>
      <div className="td-sec">
        <div className="td-sh"><b>Follow-ups due</b><span className="cnt">{fu.length}</span></div>
        {fu.map(l => {
          const late = dd(l.next!, t);
          return (
            <div key={l._id} className={`td-r ${late ? 'tlate' : ''}`} onClick={() => onOpen(l)}>
              <span className="td-rt"><b>{late ? late + 'd' : 'Today'}</b><small>{late ? 'late' : l.status === 'contacted' ? 'book call' : 'follow up'}</small></span>
              <span className="td-rn"><b className="ell">{l.name}{l.temp === 'hot' ? ' 🔥' : ''}</b><small className="ell">{l.status === 'contacted' ? 'Arrange the meeting' : `Follow-up ${l.steps.filter(s => s.k === 'followup').length + 1}`} · {l.owner || ''}</small></span>
              <span className="td-ra">
                {l.phone && <a className="btn xs icon wa" href={waHref(l)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${l.name}`} onClick={stop}><Icon name="whatsapp" size="s" /></a>}
                <button type="button" className="btn xs ink" onClick={e => { stop(e); onUpdate(l); }}>Update</button>
              </span>
            </div>
          );
        })}
        {!fu.length && <div className="td-e">All caught up</div>}
      </div>
      {res.length > 0 && (
        <div className="td-sec">
          <div className="td-sh bad"><b>Meeting results to add</b><span className="cnt">{res.length}</span></div>
          {res.map(l => (
            <div key={l._id} className="td-r tlate" onClick={() => onOpen(l)}>
              <span className="td-rt"><b>{dd(l.meet.date!, t)}d</b><small>ago</small></span>
              <span className="td-rn"><b className="ell">{l.name}</b><small className="ell">{l.meet.type || 'Meeting'} · {fdt(l.meet.date)}</small></span>
              <button type="button" className="btn xs fire" onClick={e => { stop(e); onUpdate(l); }}>Result</button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
