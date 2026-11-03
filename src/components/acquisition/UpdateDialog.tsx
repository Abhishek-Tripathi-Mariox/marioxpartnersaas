'use client';

import { useState } from 'react';
import { Button, FormError, Modal } from '@/components/ui';
import { api } from '@/lib/client';
import { OPTS, add, rel, t12, today, type AcqLead, type AcqLists, type UpdateOpt } from '@/lib/acquisition';
import type { IconName } from '@/components/ui';
import { DateQuick, Field, G2, Option, Pill, Radios, TempPick } from './bits';
import { MeetFields, meetDraft, ordered, type MeetDraft } from './MeetFields';

export type ConvertedPartner = { id: string; code?: string; setPasswordUrl: string | null; linked: boolean };
type Props = {
  lead: AcqLead;
  pre?: UpdateOpt;
  lists: AcqLists;
  onClose: () => void;
  onSaved: (lead: AcqLead, opt: UpdateOpt, partner: ConvertedPartner | null) => void;
};

const MSG: Record<UpdateOpt, string> = { meet: 'Meeting arranged', move: 'Meeting moved', done: 'Meeting done', again: 'Follow-up saved', later: 'Follow-up saved', convert: 'Converted', reject: 'Rejected' };

// What happened with this lead? One option per possible next step; its fields show when picked.
export function UpdateDialog({ lead: l, pre, lists, onClose, onSaved }: Props) {
  const opts = OPTS[l.status] ?? [];
  const [opt, setOpt] = useState<UpdateOpt>(opts.some(o => o[0] === pre) ? pre! : opts[0]?.[0]);
  // Separate drafts for "arrange a meeting" and "move it", both starting tomorrow with the current details.
  const startDraft = (k: 'meet' | 'move') => meetDraft(l.meet, {
    date: add(today(), 1),
    ...(k === 'meet' && l.status === 'followup' ? { type: 'Follow-up call' } : {}),
    attendees: l.meet?.attendees ?? [],
  });
  const [meets, setMeets] = useState<Record<'meet' | 'move', MeetDraft>>(() => ({ meet: startDraft('meet'), move: startDraft('move') }));
  const [why, setWhy] = useState<'missed' | 'moved'>('missed');
  const [next, setNext] = useState<Record<string, string>>({ done: add(today(), 1), again: add(today(), 3), later: add(today(), 3) });
  const [convertedAt, setConvertedAt] = useState(today());
  const [email, setEmail] = useState(l.email || '');
  const [reason, setReason] = useState('');
  const [temp, setTemp] = useState(l.temp);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step =
    l.status === 'contacted' ? `Contacted ${rel(l.contactedAt).toLowerCase()} on ${l.channel || '—'}`
    : l.status === 'meeting' ? `Meeting ${rel(l.meet.date).toLowerCase()}${l.meet.time ? ' at ' + t12(l.meet.time) : ''}`
    : `Follow-up ${l.next ? rel(l.next).toLowerCase() : ''} · ${l.steps.filter(s => s.k === 'followup').length} done`;

  async function save() {
    if (opt === 'reject' && !reason) return setError('Pick a reason. It shows in “Why rejected”');
    if (opt === 'convert' && !email.trim()) return setError('Add their email: it is their partner login');
    setBusy(true);
    setError(null);
    try {
      const r = await api.patch<{ lead: AcqLead; partner: ConvertedPartner | null }>(`/api/admin/acquisition/${l._id}`, {
        action: 'update', opt, today: today(), temp, note,
        ...(opt === 'meet' || opt === 'move' ? { meet: ordered(meets[opt], lists.team), why } : {}),
        ...(opt === 'done' || opt === 'again' || opt === 'later' ? { next: next[opt] } : {}),
        ...(opt === 'convert' ? { convertedAt, email: email.trim() } : {}),
        ...(opt === 'reject' ? { reason } : {}),
      });
      onSaved(r.lead, opt, r.partner);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const fields = (k: UpdateOpt) => {
    if (k === 'meet' || k === 'move')
      return (
        <>
          {k === 'move' && (
            <>
              <span className="lbl">What happened?</span>
              <Radios options={[['missed', 'They didn’t join (missed)'], ['moved', 'Rescheduled']]} value={why} onChange={v => setWhy(v as 'missed' | 'moved')} />
            </>
          )}
          <MeetFields value={meets[k]} onChange={m => setMeets(p => ({ ...p, [k]: m }))} team={lists.team} />
        </>
      );
    if (k === 'done' || k === 'again' || k === 'later')
      return (
        <>
          <span className="lbl">Next follow-up</span>
          <DateQuick value={next[k]} onChange={v => setNext({ ...next, [k]: v })} />
        </>
      );
    if (k === 'convert')
      return (
        <>
          <G2>
            <Field label="Signed on"><input className="inp" type="date" value={convertedAt} onChange={e => setConvertedAt(e.target.value)} /></Field>
            <Field label="Email (for their login)"><input className="inp" type="email" inputMode="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          </G2>
        </>
      );
    return (
      <>
        <span className="lbl">Reason</span>
        <Radios wrap options={lists.reasons.map(r => [r, r])} value={reason} onChange={setReason} />
      </>
    );
  };

  return (
    <Modal className="acq" open title={`Update · ${l.name}`} subtitle={<><Pill s={l.status} /> <span style={{ marginLeft: 6 }}>{step}</span></>} onClose={onClose}>
      <div className="uo-l">
        {opts.map(([k, title, icon]) => (
          <Option key={k} name="u-opt" value={k} picked={opt === k} onPick={() => setOpt(k)} icon={icon as IconName} iconClass={k} title={title}>
            {fields(k)}
          </Option>
        ))}
      </div>
      <div className="between wrap" style={{ gap: 8, marginTop: 14 }}>
        <span className="lbl">How hot is this lead now?</span>
        <TempPick value={temp} onChange={setTemp} />
      </div>
      <Field label="Note (optional)">
        <textarea className="inp" rows={2} placeholder="What happened? What did they say?" value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <FormError error={error} />
      <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="fire" loading={busy} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

export const updatedMsg = (l: AcqLead, opt: UpdateOpt) =>
  opt === 'reject' ? `Rejected · ${l.reason}` : opt === 'meet' || opt === 'move' ? `${l.steps[l.steps.length - 1]?.missed ? 'Missed meeting logged' : MSG[opt]} · ${rel(l.meet.date)}` : opt === 'convert' ? MSG[opt] : `${MSG[opt]} · next ${rel(l.next).toLowerCase()}`;
