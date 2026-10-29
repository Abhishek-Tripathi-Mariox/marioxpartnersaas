'use client';

import { useEffect } from 'react';
import { FileUploader, type Attachment } from '@/components/forms/FileUploader';
import { Button, FormError, Input, Textarea } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { inr } from '@/lib/format';

type Line = { name: string; amount: number };
type Values = { client: string; project: string; needs: string; attachments: Attachment[]; lines: Line[] };

export const SCOPE_FORM_ID = 'scope-form';

// "New scope" form from the original portal: details, attachments, priced scope items and a live total.
// The submit button lives in the drawer footer and targets this form by id.
export function ScopeForm({ rate, onSubmit, onBusy }: { rate: number; onSubmit: (v: Values) => Promise<unknown>; onBusy?: (busy: boolean) => void }) {
  const form = useForm<Values>({ client: '', project: '', needs: '', attachments: [], lines: [{ name: '', amount: 0 }] });
  useEffect(() => onBusy?.(form.busy), [form.busy, onBusy]);
  const { values: v, set } = form;
  const total = v.lines.reduce((a, l) => a + (Number(l.amount) || 0), 0);
  const setLine = (i: number, patch: Partial<Line>) => set('lines', v.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      id={SCOPE_FORM_ID}
      className="stack"
      style={{ gap: 20 }}
      onSubmit={form.submit(async values => {
        const lines = values.lines.filter(l => l.name.trim() || l.amount);
        if (!lines.length) throw new Error('Add at least one scope item with an amount');
        await onSubmit({ ...values, lines });
      })}
    >
      <div className="g2" style={{ gap: 12 }}>
        <Input label="Client name" placeholder="e.g. Orbit Foods" required {...form.bind('client')} />
        <Input label="Project title" placeholder="e.g. Vendor management portal" required {...form.bind('project')} />
      </div>
      <Textarea label="What the client needs" placeholder="Users, platforms, integrations, timeline" rows={3} {...form.bind('needs')} />

      <div className="stack" style={{ gap: 10 }}>
        <span className="lbl">Attachments</span>
        <FileUploader value={v.attachments} onChange={a => set('attachments', a)} />
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="between"><span className="lbl">Scope items</span><span className="lbl">Amount (₹)</span></div>
        {v.lines.map((l, i) => (
          <div key={i} className="row" style={{ gap: 8 }}>
            <input className="inp sm" style={{ flex: 1 }} placeholder="e.g. Admin panel" value={l.name} onChange={e => setLine(i, { name: e.target.value })} aria-label={`Item ${i + 1}`} />
            <input className="inp sm r num" style={{ width: 130 }} type="number" min={0} placeholder="0" value={l.amount || ''} onChange={e => setLine(i, { amount: Number(e.target.value) })} aria-label={`Amount ${i + 1}`} />
            <button type="button" className="x" style={{ width: 30, height: 30 }} disabled={v.lines.length === 1} onClick={() => set('lines', v.lines.filter((_, j) => j !== i))} aria-label="Remove item">
              ×
            </button>
          </div>
        ))}
        <div><Button type="button" size="xs" icon="plus" onClick={() => set('lines', [...v.lines, { name: '', amount: 0 }])}>Add item</Button></div>
      </div>

      <div className="hero" style={{ padding: 20, borderRadius: 22 }}>
        <div className="between wrap" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="lbl">Proposed amount</div>
            <div className="num" style={{ font: '700 30px var(--display)', letterSpacing: '-.03em', marginTop: 6 }}>{inr(total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="lbl">Your commission if fully paid</div>
            <div className="num" style={{ font: '700 22px var(--display)', color: '#3ccf95', marginTop: 6 }}>{inr(total * rate)}</div>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>You’ll be notified if the amount is revised.</div>
      </div>

      <FormError error={form.error} />
    </form>
  );
}
