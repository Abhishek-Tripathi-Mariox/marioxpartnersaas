'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui';
import { LAB, OPEN, TEMP, countdown, fdt, flag, HOME, isUrl, loc, message, mkt, platform, rel, t12, theirTime, waHref, type AcqLead, type Temp } from '@/lib/acquisition';
import { partnerHref } from './Board';
import { Av, Avs, NextTxt, Pill } from './bits';

type Props = {
  lead: AcqLead;
  now: number;
  rate: number;
  onClose: () => void;
  onUpdate: () => void;
  onEdit: () => void;
  onReopen: () => void;
  onOnboard: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onTemp: (t: Temp) => void;
  onNotes: (notes: string) => void;
  onToast: (msg: string) => void;
};

const STEP_ICON: Record<string, IconName> = { contacted: 'send', meeting: 'cal', done: 'check', moved: 'refresh', followup: 'send', converted: 'trophy', onboarding: 'rocket', rejected: 'x' };

// Everything about one lead: contact buttons, meeting, temperature, next step, history, message to send, notes.
export function LeadDrawer({ lead: l, now, rate, onClose, onUpdate, onEdit, onReopen, onOnboard, onInvite, onDelete, onTemp, onNotes, onToast }: Props) {
  const [notes, setNotes] = useState(l.notes || '');
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setNotes(l.notes || ''), [l._id, l.notes]);
  useEffect(() => setMsg(null), [l._id, l.status]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const steps = l.steps.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const partner = typeof l.partner === 'object' && l.partner ? l.partner : null;
  const [cdText, cdState] = countdown(l, now);
  const copy = () => navigator.clipboard?.writeText(msg || '').then(() => onToast('Copied'), () => onToast('Select and copy the text'));

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer acq" role="dialog" aria-modal="true" aria-label={l.name}>
        <div className="dr-h">
          <div className="row" style={{ gap: 8 }}><Pill s={l.status} />{l.sample && <em className="smp2">Sample</em>}<span className="mono sub" style={{ fontSize: 11.5 }}>{l.code}</span></div>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="dr-b">
          <div className="rq-card">
            <div className="row" style={{ gap: 14 }}>
              <Av name={l.name} size="" className="big-av" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ font: '700 24px/1.1 var(--display)', letterSpacing: '-.03em' }}>{l.name}</div>
                <div className="sub" style={{ marginTop: 3 }}>{l.company || '—'} · found on {l.source || '—'} · added by {l.owner || '—'}</div>
                <div className="row" style={{ gap: 6, marginTop: 8 }}><span className="mk sm">{flag(l.country || HOME)} {loc(l)} · {mkt(l) === 'domestic' ? 'Domestic' : 'International'}</span></div>
              </div>
            </div>
            <div className="cx">
              {l.phone ? (
                <>
                  <a className="cx-b wa" href={waHref(l)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /><span><b>WhatsApp</b><small>{l.phone}</small></span></a>
                  <a className="cx-b" href={`tel:${l.phone}`}><Icon name="phone" /><span><b>Call</b><small>{l.phone}</small></span></a>
                </>
              ) : (
                <span className="cx-b off"><Icon name="phone" /><span><b>No phone</b><small>Add it in Edit</small></span></span>
              )}
              {l.status === 'meeting' && isUrl(l.meet.link) && <a className="cx-b mt" href={l.meet.link} target="_blank" rel="noopener noreferrer"><Icon name="arrUR" /><span><b>Join meeting</b><small>{platform(l.meet.link)}</small></span></a>}
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {l.email && <a className="btn xs" href={`mailto:${l.email}`}><Icon name="mail" size="s" />Email</a>}
              {l.linkedin && <a className="btn xs" href={l.linkedin} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size="s" />Profile</a>}
              <button type="button" className="btn xs ghost" onClick={onEdit}><Icon name="note" size="s" />Edit</button>
            </div>
          </div>

          {l.status === 'meeting' && (
            <div className={`mtc ${cdState}`}>
              <div>
                <span className="lbl">Meeting</span>
                <div className="mtc-d">{rel(l.meet.date)}{l.meet.time ? ' · ' + t12(l.meet.time) : ''}</div>
                <div className="sub">{l.meet.type || 'Meeting'} · {fdt(l.meet.date)} · {+(l.meet.duration ?? 30) || 30} min · {platform(l.meet.link) || 'no link yet'}{theirTime(l) ? ` · ${theirTime(l)} (${l.country})` : ''}</div>
              </div>
              <div className="mtc-r">
                <div className="mtc-cd">{cdText}</div>
                {l.meet.attendees?.length ? <Avs names={l.meet.attendees} max={6} /> : <span className="sub" style={{ fontSize: 12 }}>No one from the team assigned</span>}
              </div>
              {(!!l.meet.prep?.length || l.meet.agenda) && (
                <div className="mtc-x">
                  {!!l.meet.prep?.length && <span className="iv-prep">{l.meet.prep.map(x => <i key={x}>{x}</i>)}</span>}
                  {l.meet.agenda && <small>{l.meet.agenda}</small>}
                </div>
              )}
              <div className="mtc-a">
                <button type="button" className={`btn sm ${l.meet.invited ? '' : 'ink'}`} onClick={onInvite}><Icon name="send" size="s" />{l.meet.invited ? 'Invite sent · resend' : 'Send the invite'}</button>
              </div>
            </div>
          )}

          <div className="between wrap" style={{ gap: 8 }}>
            <span className="lbl">Hot lead?</span>
            <span className="row" style={{ gap: 6 }}>
              {(Object.entries(TEMP) as [Temp, [string, string, string]][]).map(([k, [lb, c, e]]) => (
                <button key={k} type="button" className={`tpb ${l.temp === k ? 'on' : ''}`} style={{ '--c': c } as CSSProperties} onClick={() => onTemp(k)}>{e ? e + ' ' : ''}{lb}</button>
              ))}
            </span>
          </div>
          {!!l.services?.length && (
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="lbl" style={{ marginRight: 4 }}>Provides</span>
              {l.services.map(s => <span key={s} className="svc">{s}</span>)}
            </div>
          )}

          <div className="rq-now">
            <div className="rq-nx"><NextTxt l={l} now={now} /></div>
            <div className="row" style={{ gap: 6 }}>
              {l.status === 'meeting' && isUrl(l.meet.link) && <a className="btn sm" href={l.meet.link} target="_blank" rel="noopener noreferrer"><Icon name="arrUR" size="s" />Join</a>}
              {OPEN.includes(l.status) ? <button type="button" className="btn sm fire" onClick={onUpdate}>Update</button>
                : l.status === 'converted' ? <button type="button" className="btn sm fire" onClick={onOnboard}><Icon name="rocket" size="s" />Start onboarding</button>
                : l.status === 'onboarding' ? <Link className="btn sm" href={partnerHref(l)}><Icon name="users" size="s" />{partner ? `Open ${partner.partnerCode ?? 'partner'}` : 'Open Partners'}</Link>
                : <button type="button" className="btn sm ghost" onClick={onReopen}>Reopen</button>}
            </div>
          </div>

          <div>
            <span className="lbl">History</span>
            <div className="hist">
              {steps.map((s, i) => (
                <div key={i} className={`hs h-${s.k}`}>
                  <i><Icon name={STEP_ICON[s.k] || 'dots'} size="s" /></i>
                  <div>
                    <b>{s.k === 'moved' && s.missed ? 'Meeting missed' : LAB[s.k] || s.k}{s.reason ? ' · ' + s.reason : ''}</b>
                    <span className="sub">{fdt(s.date)}</span>
                    {s.note && <p>{s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {OPEN.includes(l.status) && (
            <div className="rq-ai">
              <div className="between">
                <span className="lbl"><Icon name="spark" size="s" /> Message to send</span>
                <button type="button" className="btn xs" onClick={() => setMsg(message(l, rate))}>{l.status === 'meeting' ? 'Meeting reminder' : l.status === 'contacted' ? 'Ask for a meeting' : 'Follow-up'}</button>
              </div>
              {msg !== null && (
                <div>
                  <textarea className="inp md" rows={4} style={{ marginTop: 10 }} value={msg} onChange={e => setMsg(e.target.value)} aria-label="Message" />
                  <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                    <button type="button" className="btn xs" onClick={copy}><Icon name="copy" size="s" />Copy</button>
                    {l.email && <a className="btn xs" href={`mailto:${l.email}?subject=${encodeURIComponent('Mariox partner programme')}&body=${encodeURIComponent(msg)}`}><Icon name="mail" size="s" />Email</a>}
                    {l.phone && <a className="btn xs" target="_blank" rel="noopener noreferrer" href={waHref(l, msg)}><Icon name="whatsapp" size="s" />WhatsApp</a>}
                    <span className="sub" style={{ fontSize: 12 }}>Edit before sending</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="field">
            <span>Notes</span>
            <textarea className="inp" rows={3} placeholder="Anything the team should know" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (l.notes || '') && onNotes(notes)} />
          </label>
        </div>
        <div className="dr-f">
          <button type="button" className="btn sm ghost" onClick={onDelete}><Icon name="trash" size="s" />Delete</button>
          <button type="button" className="btn sm ink" onClick={onClose}>Done</button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
