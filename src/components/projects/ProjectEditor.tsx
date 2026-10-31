'use client';

import { Button, FormError, Input, Select, Textarea } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { PAYMENT_STATUS, PROJECT_STAGES } from '@/lib/constants';
import { inr } from '@/lib/format';
import type { OwnerRef, Payment, Project, User } from '@/types';

type Values = Omit<Project, '_id' | 'owner' | 'commissionRate'> & { owner: string; commissionPct: number | '' };

const blankPayment = (): Payment => ({ label: '', amount: 0, due: '', status: 'upcoming' });

export function emptyProject(): Values {
  return { owner: '', commissionPct: '', client: '', title: '', deal: 0, stage: 0, pm: '', update: '', closedAt: '', contact: '', city: '', milestones: PROJECT_STAGES.map(() => ''), payments: [blankPayment()] };
}

export function toValues(p: Project): Values {
  const owner = typeof p.owner === 'object' ? (p.owner as OwnerRef)._id : p.owner;
  const rate = p.commissionRate ?? (typeof p.owner === 'object' ? (p.owner as OwnerRef).commissionRate : undefined);
  return { ...p, owner, commissionPct: rate != null ? Math.round(rate * 1000) / 10 : '', milestones: PROJECT_STAGES.map((_, i) => p.milestones?.[i] || '') };
}

export type ProjectPayload = Omit<Values, 'commissionPct'> & { commissionRate?: number };
type Props = { initial: Values; partners: User[]; onSubmit: (v: ProjectPayload) => Promise<unknown>; onCancel: () => void };

// Admin form for a delivery project: details, per-stage milestone dates and the client payment schedule.
export function ProjectEditor({ initial, partners, onSubmit, onCancel }: Props) {
  const form = useForm<Values>(initial);
  const { values: v, set } = form;

  const setPayment = (i: number, patch: Partial<Payment>) => set('payments', v.payments.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const scheduled = v.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);

  return (
    <form
      className="stack"
      onSubmit={form.submit(({ commissionPct, ...rest }) =>
        onSubmit({ ...rest, ...(commissionPct === '' ? {} : { commissionRate: Number(commissionPct) / 100 }) }),
      )}
    >
      <div className="grid-f">
        <Select
          label="Partner"
          required
          placeholder="Choose partner"
          options={partners.map(p => ({ value: p.id, label: `${p.name} (${p.partnerCode}) · ${Math.round(p.commissionRate * 100)}%` }))}
          value={v.owner}
          onChange={e => {
            const p = partners.find(x => x.id === e.target.value);
            // New deal: start from the partner's current rate; it can still be changed for this deal.
            form.setValues(prev => ({ ...prev, owner: e.target.value, commissionPct: prev.commissionPct === '' && p ? Math.round(p.commissionRate * 100) : prev.commissionPct }));
          }}
        />
        <Input label="Commission for this deal (%)" type="number" min={0} max={100} step="0.1" hint="Locked to this project; changing the partner's default rate later won't change it" value={v.commissionPct} onChange={e => set('commissionPct', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Client" required {...form.bind('client')} />
        <Input label="Project" required {...form.bind('title')} />
        <Input label="Deal value (₹)" type="number" min={0} {...form.bind('deal')} />
        <Input label="Closed on" type="date" {...form.bind('closedAt')} />
        <Input label="Project manager" {...form.bind('pm')} />
        <Select label="Current stage" options={PROJECT_STAGES.map((s, i) => ({ value: i, label: s }))} value={v.stage} onChange={e => set('stage', Number(e.target.value))} />
        <Input label="Client contact" {...form.bind('contact')} />
      </div>
      <Textarea label="Latest update for partner" {...form.bind('update')} />

      <div className="field"><span>Milestone dates</span></div>
      <div className="grid-f">
        {PROJECT_STAGES.map((s, i) => (
          <Input key={s} label={s} type="date" value={v.milestones[i]} onChange={e => set('milestones', v.milestones.map((m, j) => (j === i ? e.target.value : m)))} />
        ))}
      </div>

      <div className="row">
        <span className="strong">Client payment schedule</span>
        <span className="spacer" />
        <span className="sub">Scheduled {inr(scheduled)} of {inr(v.deal)}</span>
      </div>
      {v.payments.map((p, i) => (
        <div key={p._id || i} className="card" style={{ padding: 12 }}>
          <div className="grid-f">
            <Input label="Milestone" required value={p.label} onChange={e => setPayment(i, { label: e.target.value })} />
            <Input label="Amount (₹)" type="number" min={0} value={p.amount || ''} onChange={e => setPayment(i, { amount: Number(e.target.value) })} />
            <Input label="Due" type="date" value={p.due || ''} onChange={e => setPayment(i, { due: e.target.value })} />
            <Select label="Client payment" options={PAYMENT_STATUS} value={p.status} onChange={e => setPayment(i, { status: e.target.value as Payment['status'] })} />
            {p.status === 'received' && (
              <>
                <Input label="Commission paid on" type="date" hint="Empty = still processing" value={p.releasedAt || ''} onChange={e => setPayment(i, { releasedAt: e.target.value })} />
                <Input label="Payout UTR" value={p.utr || ''} onChange={e => setPayment(i, { utr: e.target.value })} />
              </>
            )}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="button" size="sm" variant="danger" onClick={() => set('payments', v.payments.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        </div>
      ))}
      <div><Button type="button" size="sm" onClick={() => set('payments', [...v.payments, blankPayment()])}>+ Add payment</Button></div>

      <FormError error={form.error} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="fire" loading={form.busy}>Save project</Button>
      </div>
    </form>
  );
}
