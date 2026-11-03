'use client';

import { Dropdown, Icon } from '@/components/ui';
import { LENGTHS, MTYPE, PREP, type Meet } from '@/lib/acquisition';
import { R, istToday, slotError } from '@/lib/validate';
import { Field, Multi } from './bits';

export type MeetDraft = { date: string; time: string; duration: number; link: string; type: string; attendees: string[]; prep: string[]; agenda: string };

export const meetDraft = (m: Meet = {}, defaults: Partial<MeetDraft> = {}): MeetDraft => ({
  date: m.date ?? '',
  time: m.time || '16:00',
  duration: +(m.duration ?? 30) || 30,
  link: m.link ?? '',
  type: m.type || MTYPE[0],
  attendees: m.attendees ?? [],
  prep: m.prep ?? [],
  agenda: m.agenda ?? '',
  ...defaults,
});

// Saved meetings list people (and things to bring) in the order of their lists, as v14 reads the checkboxes.
export const ordered = (m: MeetDraft, team: string[]): MeetDraft => ({
  ...m,
  attendees: [...team.filter(t => m.attendees.includes(t)), ...m.attendees.filter(a => !team.includes(a))],
  prep: [...PREP.filter(p => m.prep.includes(p)), ...m.prep.filter(p => !PREP.includes(p))],
});

// A meeting being booked: a date and time still ahead, and a real link if one is given.
export const meetErrors = (m: MeetDraft): Record<string, string | null> => {
  const slot = m.date ? slotError(m.date, m.time, 'That time') : null;
  return { date: slot && !slot.includes('time') ? slot : null, time: slot?.includes('time') ? slot : null, link: R.url(m.link.trim()), agenda: m.agenda.length > 500 ? 'Keep the agenda under 500 characters' : null };
};

// One set of meeting fields, used in the add / edit form and the update dialog:
// type, date, time (IST), length, link, who joins from Mariox, what to bring, agenda.
export function MeetFields({ value: m, onChange, team, errors = {} }: { value: MeetDraft; onChange: (m: MeetDraft) => void; team: string[]; errors?: Record<string, string | null> }) {
  const set = <K extends keyof MeetDraft>(k: K, v: MeetDraft[K]) => onChange({ ...m, [k]: v });
  return (
    <div className="mf">
      <div className="pk mt mf-ty">
        {MTYPE.map(t => (
          <label key={t}><input type="radio" checked={m.type === t} onChange={() => set('type', t)} /><span>{t}</span></label>
        ))}
      </div>
      <div className="mf-g">
        <Field label="Date" error={errors.date}><input className="inp" type="date" min={istToday()} max="2100-12-31" value={m.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Time (IST)" error={errors.time}><input className="inp" type="time" value={m.time} onChange={e => set('time', e.target.value)} /></Field>
        <div className="field"><span>Length</span><Dropdown aria-label="Length" value={m.duration} onChange={v => set('duration', +v)} options={LENGTHS.map(n => ({ value: n, label: `${n} min` }))} /></div>
      </div>
      <div className="mf-l">
        <Field label="Meeting link" error={errors.link}><input className="inp" inputMode="url" placeholder="Paste a Google Meet, Zoom or Teams link" value={m.link} onChange={e => set('link', e.target.value)} /></Field>
        <a className="btn" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" title="Opens Google Meet. Copy the link and paste it here"><Icon name="plus" size="s" />New Meet</a>
      </div>
      <div><span className="lbl">Our team on the call</span><Multi options={team} value={m.attendees} onChange={v => set('attendees', v)} /></div>
      <div><span className="lbl">Bring to the call</span><Multi options={PREP} value={m.prep} onChange={v => set('prep', v)} /></div>
      <Field label="Agenda (optional)"><input className="inp" placeholder="e.g. Partner model, payout examples, their client base" value={m.agenda} onChange={e => set('agenda', e.target.value)} /></Field>
    </div>
  );
}
