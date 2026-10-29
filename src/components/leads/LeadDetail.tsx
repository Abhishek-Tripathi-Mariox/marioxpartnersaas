'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { usePipeline } from '@/components/SettingsProvider';
import { useUser } from '@/components/UserProvider';
import { Avatar, Badge, Button, Card, Chips, Icon, Input, Modal, Note, Select, hue, useToast, type IconName, type Tone, SkeletonCards } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { date, inr, short, todayISO } from '@/lib/format';
import { LOST, WON, allStages, isOpen, priorityTone, stageProb } from '@/lib/pipeline';
import type { Lead, OwnerRef, User } from '@/types';
import { leadFields } from './leadFields';
import { TaskRow } from './TaskRow';

const LOG_HINT: Record<string, string> = {
  call: 'e.g. Spoke to CTO, wants a demo next week',
  meeting: 'e.g. Demo at Noida office, budget ₹8L confirmed',
  email: 'e.g. Sent proposal v2 and case study',
  note: 'e.g. Decision maker is the MD, not the CTO',
};

const LOG_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
] as const;
type LogType = (typeof LOG_TYPES)[number]['value'];

// Same icon + colour per activity type as the original portal.
// Icon, colour and label per activity type (same icons as the original portal).
const ACT: Record<string, [IconName, Tone, string]> = {
  call: ['phone', 'info', 'Call'], meeting: ['users', 'good', 'Meeting'], email: ['mail', 'warn', 'Email'], note: ['note', 'mute', 'Note'],
  stage: ['flag', 'fire', 'Stage change'], task: ['check', 'good', 'Follow-up done'], won: ['trophy', 'good', 'Won'],
};

// Lead workspace. Partners manage their own leads; admins can do the same for any lead and reassign it.
const typeLabel = (t: string) => ACT[t]?.[2] ?? 'Note';

// Timeline filter: the four manual types, plus everything the system logs on its own.
const SYSTEM = ['stage', 'task', 'won'];
const ACT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'call', label: 'Calls' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'email', label: 'Emails' },
  { value: 'note', label: 'Notes' },
  { value: 'system', label: 'Updates' },
];

export function LeadDetail({ id, backHref = '/leads', admin }: { id: string; backHref?: string; admin?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useUser();
  const cfg = usePipeline();
  const { data, setData } = useApi<{ lead: Lead }>(`/api/leads/${id}`);
  const partners = useApi<{ users: User[] }>(admin ? '/api/admin/users' : null);
  const [editing, setEditing] = useState(false);
  const [logType, setLogType] = useState<LogType>('call');
  const [logText, setLogText] = useState('');
  const [task, setTask] = useState({ text: '', due: todayISO() });
  const [lostReason, setLostReason] = useState('');
  const [actFilter, setActFilter] = useState('all');

  const lead = data?.lead;
  if (!lead) return <SkeletonCards count={2} height={220} />;

  // Every change goes through PATCH and the response replaces local state.
  async function patch(body: Record<string, unknown>, msg?: string) {
    try {
      setData(await api.patch<{ lead: Lead }>(`/api/leads/${id}`, body));
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove() {
    if (!confirm(`Delete lead "${lead!.company}"? This can't be undone.`)) return;
    await api.del(`/api/leads/${id}`);
    toast('Lead deleted');
    router.push(backHref);
  }

  const owner = typeof lead.owner === 'object' ? (lead.owner as OwnerRef) : null;
  const rate = user?.role === 'partner' ? user.commissionRate : owner?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const contact = (lead.contact || '—').split(',');
  const stages = allStages(cfg);
  const current = stages.findIndex(s => s.key === lead.stage);
  const prob = stageProb(cfg, lead.stage);
  const kindOf = (t: string) => (SYSTEM.includes(t) ? 'system' : t);
  const counts = lead.activities.reduce<Record<string, number>>((c, a) => ({ ...c, [kindOf(a.type)]: (c[kindOf(a.type)] ?? 0) + 1 }), {});
  const shownActs = actFilter === 'all' ? lead.activities : lead.activities.filter(a => kindOf(a.type) === actFilter);

  const partnerList = (partners.data?.users ?? []).filter(u => u.role === 'partner');
  const fields: FieldDef[] = [
    ...(admin ? [{ name: 'owner', label: 'Partner', type: 'select' as const, options: partnerList.map(p => p.id), full: true }] : []),
    ...leadFields(cfg),
  ];
  const ownerLabel = (pid: string) => partnerList.find(p => p.id === pid)?.name ?? pid;

  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>
        <Link className="more" href={backHref}><Icon name="chevL" size="s" />Back to pipeline</Link>
        <span className="spacer" />
        <Button size="sm" icon="note" onClick={() => setEditing(true)}>{admin ? 'Edit / reassign' : 'Edit lead'}</Button>
        <Button size="sm" variant="danger" icon="trash" onClick={remove}>Delete</Button>
      </div>

      <div className="ccard" style={{ ['--glow' as string]: `hsla(${hue(lead.company)},70%,55%,.55)`, padding: 26 }}>
        <div className="between wrap" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="row" style={{ gap: 14 }}>
            <span className="big-av" style={{ background: `hsl(${hue(lead.company)} 52% 46%)` }}>{lead.company.slice(0, 2).toUpperCase()}</span>
            <div>
              <div style={{ font: '700 30px/1.05 var(--display)', letterSpacing: '-.035em' }}>{lead.company}</div>
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                {[lead.project, lead.city, lead.source].filter(Boolean).join(' · ')}
                {owner && admin && <> · Partner <Link href={`/admin/partners/${owner._id}`} style={{ textDecoration: 'underline' }}>{owner.name}</Link></>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl">Deal value</div>
            <div style={{ font: '700 30px var(--display)', letterSpacing: '-.03em' }} className="num">{short(lead.value)}</div>
            <div style={{ color: '#3ccf95', fontWeight: 600, fontSize: 13 }}>{admin ? 'Partner earns' : 'You could earn'} {inr(lead.value * rate)}</div>
          </div>
        </div>
      </div>

      <Card title="Stage" subtitle={`${prob}% probability · expected close ${date(lead.expectedClose)}`} action={lead.priority && <Badge tone={priorityTone(cfg, lead.priority)}>{lead.priority}</Badge>}>
        <div className="stages" style={{ gridTemplateColumns: `repeat(${stages.length},minmax(0,1fr))` }}>
          {stages.map((s, i) => (
            <button
              key={s.key}
              type="button"
              disabled={s.key === LOST}
              onClick={() => s.key !== lead.stage && patch({ stage: s.key }, `Moved to ${s.name}`)}
              className={[
                'stg',
                i < current && isOpen(s.key) && isOpen(lead.stage) && 'd',
                i < current && isOpen(s.key) && lead.stage === WON && 'd',
                s.key === lead.stage && 'c',
                s.key === lead.stage && s.key === WON && 'won',
                s.key === lead.stage && s.key === LOST && 'lost',
              ].filter(Boolean).join(' ')}
            >
              <i />
              {s.name}
            </button>
          ))}
        </div>
        {lead.stage !== LOST ? (
          <div className="row wrap" style={{ marginTop: 18, gap: 8 }}>
            <span className="sub">Lost this deal?</span>
            <div style={{ width: 220 }}><Select small options={cfg.lostReasons} value={lostReason || cfg.lostReasons[0]} onChange={e => setLostReason(e.target.value)} aria-label="Lost reason" /></div>
            <Button size="sm" variant="danger" onClick={() => patch({ stage: LOST, lostReason: lostReason || cfg.lostReasons[0] }, 'Marked as lost')}>Mark lost</Button>
          </div>
        ) : (
          <div className="row wrap" style={{ marginTop: 14 }}>
            <p className="sub" style={{ color: 'var(--bad)' }}>Lost · {lead.lostReason}</p>
            <Button size="xs" onClick={() => patch({ stage: cfg.stages[0].key }, 'Lead reopened')}>Reopen</Button>
          </div>
        )}
      </Card>

      <div className="split">
        <Card title="Activity" subtitle="Everything that happened on this lead, newest first.">
          {/* 1. Log a new entry */}
          <form
            className="log-box"
            onSubmit={e => {
              e.preventDefault();
              if (!logText.trim()) return;
              patch({ addActivity: { type: logType, text: logText } }, `${typeLabel(logType)} logged`);
              setLogText('');
            }}
          >
            <div className="row wrap" style={{ gap: 10 }}>
              <span className="lbl">Log an update</span>
              <div className="log-types" role="radiogroup" aria-label="What kind of update">
                {LOG_TYPES.map(t => (
                  <button key={t.value} type="button" role="radio" aria-checked={logType === t.value} className={logType === t.value ? 'on' : ''} onClick={() => setLogType(t.value)}>
                    <Icon name={ACT[t.value][0]} size="s" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}><Input placeholder={LOG_HINT[logType]} value={logText} onChange={e => setLogText(e.target.value)} /></div>
              <Button variant="ink" icon="plus">Log {typeLabel(logType).toLowerCase()}</Button>
            </div>
          </form>

          {/* 2. Timeline, with its own filter */}
          <div className="between wrap" style={{ margin: '22px 0 12px', gap: 10 }}>
            <span className="lbl">Timeline · {shownActs.length} of {lead.activities.length}</span>
            <div className="row" style={{ gap: 8 }}>
              <span className="sub">Show</span>
              <Chips tabs={ACT_FILTERS.filter(f => f.value === 'all' || counts[f.value])} value={actFilter} onChange={setActFilter} />
            </div>
          </div>
          <div className="tl">
            {shownActs.length ? shownActs.map(a => {
              const [icon, tone, label] = ACT[a.type] ?? ACT.note;
              return (
                <div className="tl-i" key={a._id}>
                  <span className={`ico t-${tone}`}><Icon name={icon} size="s" /></span>
                  <div>
                    <p>{a.text}</p>
                    <span>{date(a.date)} · {label}</span>
                  </div>
                </div>
              );
            }) : <div className="empty">Nothing of this type yet</div>}
          </div>
        </Card>

        <div className="stack stick">
          <Card title="Follow-ups" subtitle={`Your next steps with a due date · ${lead.tasks.filter(t => !t.done).length} open`}>
            {lead.tasks.length ? (
              lead.tasks.map(t => <TaskRow key={t._id} task={t} onToggle={() => patch({ toggleTask: t._id })} />)
            ) : (
              <div className="empty">No follow-ups yet</div>
            )}
            <form
              className="stack"
              style={{ marginTop: 14, gap: 8 }}
              onSubmit={e => {
                e.preventDefault();
                if (!task.text.trim()) return;
                patch({ addTask: task }, 'Follow-up added');
                setTask({ text: '', due: todayISO() });
              }}
            >
              <Input small placeholder="Next step…" value={task.text} onChange={e => setTask({ ...task, text: e.target.value })} />
              <div className="row">
                <div style={{ flex: 1 }}><Input small type="date" value={task.due} onChange={e => setTask({ ...task, due: e.target.value })} /></div>
                <Button size="sm" icon="plus">Add</Button>
              </div>
            </form>
          </Card>

          <Card title="Contact">
            <div className="row" style={{ gap: 12, marginBottom: 14 }}>
              <Avatar name={contact[0]} />
              <div>
                <div className="li-t">{contact[0]}</div>
                {contact.slice(1).join(',').trim() && <div className="sub">{contact.slice(1).join(',').trim()}</div>}
              </div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {lead.phone && <a className="copy" href={`tel:${lead.phone}`}><Icon name="phone" size="s" />{lead.phone}</a>}
              {lead.email && <a className="copy" href={`mailto:${lead.email}`}><Icon name="mail" size="s" />{lead.email}</a>}
            </div>
            <div className="g2" style={{ gap: 10, marginTop: 14 }}>
              <Note label="Probability" value={`${prob}%`} />
              <Note label="Weighted" value={short((lead.value * prob) / 100)} good />
            </div>
          </Card>
        </div>
      </div>

      <Modal open={editing} title={admin ? 'Edit or reassign lead' : 'Edit lead'} onClose={() => setEditing(false)} wide>
        <DynamicForm
          fields={fields}
          optionLabel={{ owner: ownerLabel }}
          initial={{ ...lead, owner: owner?._id } as unknown as Record<string, unknown>}
          submitLabel="Save lead"
          onCancel={() => setEditing(false)}
          onSubmit={async v => {
            await patch(Object.fromEntries(fields.map(f => [f.name, v[f.name]])), 'Lead saved');
            setEditing(false);
          }}
        />
      </Modal>
    </>
  );
}
