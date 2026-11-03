'use client';

import { useState } from 'react';
import { ListEditor, TagEditor } from '@/components/admin/ListEditor';
import { useSettings, type PortalSettings } from '@/components/SettingsProvider';
import { Badge, Button, Card, FormError, Input, PageHeader, PhoneInput, Select, Tabs, Textarea, useToast, SkeletonCards } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';
import { TONES, stageColor, type ToneName } from '@/lib/pipeline';
import type { Contact } from '@/types';
import { R, all } from '@/lib/validate';

// Each leadership contact is shown to every partner, so it has to be complete and real.
const CONTACT_RULES: Record<keyof Contact, ((v: string) => string | null) | undefined> = {
  title: all(R.required('Title'), R.words(2, 60)),
  name: all(R.required('Name'), R.person),
  role: R.words(2, 80),
  phone: all(R.required('Phone'), R.phone),
  email: all(R.required('Email'), R.email),
  note: undefined,
};
const contactErrors = (c: Contact) => Object.fromEntries(Object.entries(CONTACT_RULES).map(([k, r]) => [k, r?.(String(c[k as keyof Contact] ?? '').trim()) ?? null])) as Record<keyof Contact, string | null>;

type Section = 'pipeline' | 'contacts';
const TONE_LABEL: Record<ToneName, string> = { bad: 'Red', warn: 'Amber', info: 'Blue', good: 'Green', violet: 'Violet', fire: 'Orange', mute: 'Grey' };
const blankContact =(): Contact => ({ title: '', name: '', role: '', phone: '', email: '', note: '' });

function SettingsForm({ initial }: { initial: PortalSettings }) {
  const toast = useToast();
  const { reload } = useSettings();
  const [section, setSection] = useState<Section>('pipeline');
  const [checked, setChecked] = useState(false); // show contact errors after the first save attempt
  const form = useForm<PortalSettings>(initial);
  const { values: v, set } = form;
  const pipe = v.pipeline;
  const setPipe = (patch: Partial<PortalSettings['pipeline']>) => set('pipeline', { ...pipe, ...patch });

  const save = form.submit(async values => {
    setChecked(true);
    const bad = values.contacts.findIndex(c => Object.values(contactErrors(c)).some(Boolean));
    if (bad >= 0) { setSection('contacts'); throw new Error(`Contact ${bad + 1}: fix the highlighted fields`); }
    const { settings } = await api.put<{ settings: PortalSettings }>('/api/settings', values);
    form.setValues(settings);
    await reload();
    toast('Settings published to every partner');
  });

  return (
    <form className="stack" style={{ gap: 20 }} onSubmit={save}>
      <div className="between wrap">
        <Tabs tabs={[{ value: 'pipeline', label: 'Sales pipeline' }, { value: 'contacts', label: 'Contacts & announcement' }]} value={section} onChange={setSection} />
        <Button variant="fire" icon="check" loading={form.busy}>Publish settings</Button>
      </div>
      <FormError error={form.error} />

      {section === 'pipeline' && (
        <div className="bento">
          <Card className="c7" title="Stages" subtitle="Leads move left to right. Won and Lost are always added at the end.">
            <ListEditor
              items={pipe.stages}
              onChange={stages => setPipe({ stages })}
              blank={() => ({ key: '', name: '', prob: 50 })}
              addLabel="Add stage"
              render={(s, update) => (
                <>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: s.key ? stageColor(pipe, s.key) : 'var(--line-2)' }} />
                  <div style={{ flex: 1, minWidth: 180 }}><Input small placeholder="Stage name" value={s.name} onChange={e => update({ name: e.target.value })} required /></div>
                </>
              )}
            />
            <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
              <span className="sub">Fixed:</span>
              <Badge tone="good">Won</Badge>
              <Badge tone="bad">Lost</Badge>
            </div>
          </Card>

          <Card className="c5" title="Priorities" subtitle="Shown as coloured tags on lead cards.">
            <ListEditor
              items={pipe.priorities}
              onChange={priorities => setPipe({ priorities })}
              blank={() => ({ name: '', tone: 'mute' as ToneName })}
              addLabel="Add priority"
              render={(p, update) => (
                <>
                  <div style={{ flex: 1, minWidth: 120 }}><Input small placeholder="e.g. Hot" value={p.name} onChange={e => update({ name: e.target.value })} required /></div>
                  <div style={{ width: 120 }}><Select small options={TONES.map(t => ({ value: t, label: TONE_LABEL[t] }))} value={p.tone} onChange={e => update({ tone: e.target.value as ToneName })} aria-label="Colour" /></div>
                  <Badge tone={p.tone}>{p.name || 'Preview'}</Badge>
                </>
              )}
            />
          </Card>

          <Card className="c6" title="Lead sources" subtitle="Where partners say a lead came from.">
            <TagEditor values={pipe.sources} onChange={sources => setPipe({ sources })} placeholder="e.g. Website form" />
          </Card>

          <Card className="c6" title="Lost reasons" subtitle="Options when a lead is marked lost.">
            <TagEditor values={pipe.lostReasons} onChange={lostReasons => setPipe({ lostReasons })} placeholder="e.g. Chose in-house team" />
          </Card>
        </div>
      )}

      {section === 'contacts' && (
        <>
          <Card title="Announcement" subtitle="Shown as a banner at the top of every partner's home page. Leave empty to hide it.">
            <Textarea placeholder="e.g. Diwali payouts will be released on 28 Oct" {...form.bind('announcement')} />
          </Card>
          <Card title="Leadership contacts" subtitle="Shown on the partner Support page.">
            <ListEditor
              items={v.contacts}
              onChange={contacts => set('contacts', contacts)}
              blank={blankContact}
              addLabel="Add contact"
              min={0}
              render={(c, update) => {
                const err = checked ? contactErrors(c) : ({} as Partial<Record<keyof Contact, string | null>>);
                return (
                <div className="grid-f" style={{ width: '100%' }}>
                  <Input small label="Title" placeholder="Founder" value={c.title} error={err.title} onChange={e => update({ title: e.target.value })} />
                  <Input small label="Name" placeholder="e.g. Rahul Sharma" value={c.name} error={err.name} onChange={e => update({ name: e.target.value })} />
                  <Input small label="Role" placeholder="e.g. Head of partnerships" value={c.role} error={err.role} onChange={e => update({ role: e.target.value })} />
                  <PhoneInput small label="Phone" value={c.phone} error={err.phone} onChange={e => update({ phone: e.target.value })} />
                  <Input small label="Email" type="email" placeholder="name@marioxsoftware.com" value={c.email} error={err.email} onChange={e => update({ email: e.target.value })} />
                  <Input small label="When to contact" value={c.note} maxLength={300} onChange={e => update({ note: e.target.value })} />
                </div>
                );
              }}
            />
          </Card>
        </>
      )}
    </form>
  );
}

export default function AdminSettingsPage() {
  const { settings, loaded } = useSettings();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" subtitle="Pipeline stages, sources, priorities and portal content for every partner." />
      {loaded ? <SettingsForm initial={settings} /> : <SkeletonCards count={2} height={260} />}
    </>
  );
}
