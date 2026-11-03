'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, FormError, Icon, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/client';
import { HOME, OPEN, add, flag, mkt, rel, t12, today, type AcqLead, type AcqLists, type Temp } from '@/lib/acquisition';
import { DateQuick, Field, G2, Multi, TempPick } from './bits';
import { MeetFields, meetDraft, ordered } from './MeetFields';

type Props = {
  lead?: Partial<AcqLead> | null; // with _id: edit; without: add (may be prefilled)
  lists: AcqLists;
  defaultOwner?: string;
  onClose: () => void;
  // needsInvite: a meeting was booked or its date / time changed, so the invite should go out.
  onSaved: (lead: AcqLead, created: boolean, needsInvite: boolean) => void;
};

// Add someone you have contacted, or edit them. Only the name is needed; a meeting date sends the lead
// straight to Meeting (and the invite dialog opens next).
export function LeadForm({ lead, lists, defaultOwner, onClose, onSaved }: Props) {
  const l = lead ?? {};
  const edit = !!l._id;
  const owner = l.owner || defaultOwner || lists.team[0] || '';
  const canMeet = !edit || OPEN.includes(l.status!);
  const hadMeet = l.status === 'meeting';
  const [f, setF] = useState({
    name: l.name ?? '', company: l.company ?? '', phone: l.phone ?? '', email: l.email ?? '', linkedin: l.linkedin ?? '',
    source: l.source || 'LinkedIn', channel: l.channel || 'WhatsApp', contactedAt: l.contactedAt || today(), owner,
    country: l.country || HOME, city: l.city ?? '', services: l.services ?? [], temp: (l.temp || 'warm') as Temp, notes: l.notes ?? '',
  });
  const [meet, setMeet] = useState(() => meetDraft(hadMeet ? l.meet : {}, hadMeet ? {} : { attendees: [owner].filter(Boolean) }));
  const [next, setNext] = useState(add(today(), 1));
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<string | null>(null);
  const name = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { setTimeout(() => name.current?.focus(), 60); }, []);
  const hasMeet = canMeet && !!meet.date;

  // Keep chosen values selectable even if they were removed from the lists in Settings.
  const opts = (list: string[], cur: string) => (cur && !list.includes(cur) ? [...list, cur] : list);

  async function save() {
    if (!f.name.trim()) { setError('Add the name'); return name.current?.focus(); }
    setBusy(true);
    setError(null);
    const m = hasMeet ? ordered({ ...meet, attendees: meet.attendees.length ? meet.attendees : [f.owner].filter(Boolean) }, lists.team) : undefined;
    try {
      if (edit) {
        const r = await api.patch<{ lead: AcqLead; needsInvite: boolean }>(`/api/admin/acquisition/${l._id}`, { action: 'edit', lead: f, meet: m, today: today() });
        onSaved(r.lead, false, r.needsInvite);
      } else {
        const r = await api.post<{ lead: AcqLead }>('/api/admin/acquisition', { ...f, today: today(), ...(m ? { meet: m } : { next }), force });
        onSaved(r.lead, true, r.lead.status === 'meeting');
      }
    } catch (e) {
      // Same name + company already exists: show it, a second Save adds anyway.
      if (e instanceof ApiError && e.status === 409 && !edit) { setDup(e.message); setForce(true); }
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal className="acq" open wide title={edit ? 'Edit lead' : 'Add lead'} subtitle={edit ? undefined : 'Only the name is needed. Add a meeting date and the lead goes straight to Meeting.'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="fm">
          <div className="fm-s"><span className="fm-n">1</span><b>Who</b></div>
          <G2>
            <Field label="Name *"><input ref={name} className="inp" autoComplete="off" placeholder="Full name" value={f.name} onChange={e => { set('name', e.target.value); setForce(false); setDup(null); }} /></Field>
            <Field label="Company"><input className="inp" placeholder="Company or agency" value={f.company} onChange={e => { set('company', e.target.value); setForce(false); setDup(null); }} /></Field>
            <Field label="WhatsApp / phone"><input className="inp" inputMode="tel" placeholder="+971 50 123 4567" value={f.phone} onChange={e => set('phone', e.target.value)} /></Field>
            <Field label="Email"><input className="inp" type="email" inputMode="email" placeholder="name@company.com" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="LinkedIn / profile URL" span><input className="inp" inputMode="url" placeholder="linkedin.com/in/…" value={f.linkedin} onChange={e => set('linkedin', e.target.value)} /></Field>
          </G2>

          <div className="fm-s"><span className="fm-n">2</span><b>Where from</b></div>
          <G2>
            <div className="field"><span>Found on</span><Dropdown options={opts(lists.sources, f.source)} value={f.source} onChange={v => set('source', v)} aria-label="Found on" /></div>
            <div className="field"><span>Talking on</span><Dropdown options={opts(lists.channels, f.channel)} value={f.channel} onChange={v => set('channel', v)} aria-label="Talking on" /></div>
            <Field label="Contacted on"><input className="inp" type="date" value={f.contactedAt} onChange={e => set('contactedAt', e.target.value)} /></Field>
            <div className="field"><span>Added by</span><Dropdown options={opts(lists.team, f.owner)} value={f.owner} onChange={v => set('owner', v)} aria-label="Added by" /></div>
            <div className="field"><span>Country</span><Dropdown options={opts(lists.countries, f.country)} value={f.country} onChange={v => set('country', v)} aria-label="Country" /></div>
            <Field label="City"><input className="inp" placeholder="e.g. Dubai" value={f.city} onChange={e => set('city', e.target.value)} /></Field>
          </G2>
          <div className="mk">{mkt(f) === 'domestic' ? `${flag(HOME)} Domestic client` : `${flag(f.country)} International client`}</div>
          <div><span className="lbl">Services they provide</span><Multi options={lists.services} value={f.services} onChange={v => set('services', v)} /></div>
          <div className="between wrap" style={{ gap: 8 }}><span className="lbl">How hot?</span><TempPick value={f.temp} onChange={t => set('temp', t)} /></div>

          {canMeet && (
            <>
              <div className="fm-s"><span className="fm-n">3</span><b>Meeting</b><span className="fm-o">{hadMeet ? 'Change it here' : 'Optional · add a date to book it'}</span></div>
              <div className={`mbox ${hasMeet ? 'has' : ''}`}><MeetFields value={meet} onChange={setMeet} team={lists.team} /></div>
              <div className={`route ${hasMeet ? 'has' : ''}`}>
                <div className="r-lead">
                  <Icon name="send" size="s" />
                  <span>No meeting yet, so it goes to <b>Lead</b>.{edit ? '' : ' Next step:'}</span>
                  {!edit && <DateQuick value={next} onChange={setNext} />}
                </div>
                <div className="r-meet">
                  <Icon name="cal" size="s" />
                  <span>{hadMeet && edit ? 'Meeting is booked.' : <>Goes straight to <b>Meeting</b>.</>} You can send the invite next.</span>
                </div>
              </div>
            </>
          )}
          <Field label="Notes"><textarea className="inp" rows={2} placeholder="What did you talk about?" value={f.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
        {dup && <div className="ai-err" style={{ marginTop: 12 }}><Icon name="alert" size="s" /><span>{dup}</span></div>}
        <FormError error={error} />
        <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="fire" icon={edit ? undefined : 'plus'} loading={busy}>{edit ? 'Save' : 'Add lead'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export const addedMsg = (l: AcqLead) =>
  l.status === 'meeting' ? `Lead added to Meeting · ${l.meet.type} ${rel(l.meet.date).toLowerCase()} · ${t12(l.meet.time)}` : 'Lead added · arrange the meeting next';
