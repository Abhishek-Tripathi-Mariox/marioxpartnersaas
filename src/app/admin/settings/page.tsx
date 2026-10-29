'use client';

import { useState } from 'react';
import { ListEditor, TagEditor } from '@/components/admin/ListEditor';
import { useSettings, type PortalSettings } from '@/components/SettingsProvider';
import { Badge, Button, Card, FormError, Input, PageHeader, Select, Tabs, Textarea, useToast, SkeletonCards } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';
import { TONES, stageColor, type ToneName } from '@/lib/pipeline';
import type { Contact } from '@/types';

type Section = 'pipeline' | 'contacts';
const TONE_LABEL: Record<ToneName, string> = { bad: 'Red', warn: 'Amber', info: 'Blue', good: 'Green', violet: 'Violet', fire: 'Orange', mute: 'Grey' };
const blankContact =(): Contact => ({ title: '', name: '', role: '', phone: '', email: '', note: '' });

function SettingsForm({ initial }: { initial: PortalSettings }) {
  const toast = useToast();
  const { reload } = useSettings();
  const [section, setSection] = useState<Section>('pipeline');
  const form = useForm<PortalSettings>(initial);
  const { values: v, set } = form;
  const pipe = v.pipeline;
  const setPipe = (patch: Partial<PortalSettings['pipeline']>) => set('pipeline', { ...pipe, ...patch });

  const save = form.submit(async values => {
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
          <Card className="c7" title="Stages" subtitle="Leads move left to right. Won and Lost are always added at the end. Probability drives the weighted forecast.">
            <ListEditor
              items={pipe.stages}
              onChange={stages => setPipe({ stages })}
              blank={() => ({ key: '', name: '', prob: 50 })}
              addLabel="Add stage"
              render={(s, update) => (
                <>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: s.key ? stageColor(pipe, s.key) : 'var(--line-2)' }} />
                  <div style={{ flex: 1, minWidth: 180 }}><Input small placeholder="Stage name" value={s.name} onChange={e => update({ name: e.target.value })} required /></div>
                  <div style={{ width: 110 }}><Input small type="number" min={0} max={100} className="num r" value={s.prob} onChange={e => update({ prob: Number(e.target.value) })} aria-label="Probability %" /></div>
                  <span className="sub">%</span>
                </>
              )}
            />
            <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
              <span className="sub">Fixed:</span>
              <Badge tone="good">Won · 100%</Badge>
              <Badge tone="bad">Lost · 0%</Badge>
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
              render={(c, update) => (
                <div className="grid-f" style={{ width: '100%' }}>
                  <Input small label="Title" placeholder="Founder" value={c.title} onChange={e => update({ title: e.target.value })} />
                  <Input small label="Name" value={c.name} onChange={e => update({ name: e.target.value })} />
                  <Input small label="Role" value={c.role} onChange={e => update({ role: e.target.value })} />
                  <Input small label="Phone" value={c.phone} onChange={e => update({ phone: e.target.value })} />
                  <Input small label="Email" value={c.email} onChange={e => update({ email: e.target.value })} />
                  <Input small label="When to contact" value={c.note} onChange={e => update({ note: e.target.value })} />
                </div>
              )}
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
