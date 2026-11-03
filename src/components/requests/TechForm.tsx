'use client';

import { Button, Chips, FormError, Icon, Input, Select, Textarea, type IconName } from '@/components/ui';
import { useClientOptions } from '@/hooks/useClientOptions';
import { useForm } from '@/hooks/useForm';
import { DURATIONS, MEET_MODES, TECH_INFO, TIMES } from '@/lib/constants';
import { todayISO } from '@/lib/format';
import { R, slotError, slotPassed } from '@/lib/validate';

export type TechValues = { type: string; client: string; date: string; time: string; duration: string; mode: string; link: string; context: string };

const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

// "Technical team" request from the original portal: what → when → platform → context.
export function TechForm({ onSubmit }: { onSubmit: (v: TechValues) => Promise<unknown> }) {
  const clients = useClientOptions();
  const initial: TechValues = { type: TECH_INFO[2].k, client: '', date: tomorrow(), time: '11:00', duration: '45 min', mode: MEET_MODES[0], link: '', context: '' };
  const form = useForm<TechValues>(initial, { link: R.url, context: R.words(5) });
  const { values: v, set } = form;
  const client = v.client || clients[0] || '';

  return (
    <form
      className="stack"
      style={{ gap: 26 }}
      onSubmit={form.submit(async values => {
        const late = slotError(values.date, values.time);
        if (late) { form.setErrors({ time: late }); throw new Error(late); }
        if (!client) throw new Error('Add a client first (a lead in your pipeline)');
        await onSubmit({ ...values, client, link: values.mode === 'Mariox office' ? '' : values.link });
        form.reset();
      })}
    >
      <div className="stack">
        <div className="sn"><i>1</i>What do you need?</div>
        <div className="grid-f" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {TECH_INFO.map(t => (
            <button key={t.k} type="button" className={`tile ${v.type === t.k ? 'on' : ''}`} onClick={() => set('type', t.k)}>
              <span style={{ color: 'var(--accent)' }}><Icon name={t.i as IconName} /></span>
              <b>{t.k}</b>
              <span>{t.d}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stack">
        <div className="sn"><i>2</i>When</div>
        <div className="grid-f" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <Select label="Client" options={clients} value={client} onChange={e => set('client', e.target.value)} />
          <Input label="Preferred date" type="date" min={todayISO()} required {...form.bind('date')} />
          <Select label="Preferred time (IST)" options={TIMES.filter(t => !slotPassed(v.date, t))} value={v.time} error={form.errors.time} onChange={e => set('time', e.target.value)} placeholder={TIMES.every(t => slotPassed(v.date, t)) ? 'No times left today' : undefined} />
          <Select label="Duration" options={DURATIONS} value={v.duration} onChange={e => set('duration', e.target.value)} />
        </div>
      </div>

      <div className="stack">
        <div className="sn"><i>3</i>Meeting platform</div>
        <Chips tabs={MEET_MODES} value={v.mode} onChange={m => set('mode', m)} />
        {v.mode !== 'Mariox office' && (
          <>
            <Input label={`${v.mode} link`} className="mono" placeholder={v.mode === 'Zoom' ? 'https://zoom.us/j/…' : 'https://meet.google.com/…'} {...form.bind('link')} />
            <p className="sub">Leave blank and Mariox will create the link and send the invite.</p>
          </>
        )}
      </div>

      <Textarea label="Context for the team" rows={3} placeholder="Client's stack, questions they've raised, decision makers in the call" {...form.bind('context')} />
      <FormError error={form.error} />
      <div><Button variant="fire" icon="send" loading={form.busy}>Send request</Button></div>
    </form>
  );
}
