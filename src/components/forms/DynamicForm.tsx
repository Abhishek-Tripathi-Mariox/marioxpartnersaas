'use client';

import { Button, Chips, FormError, Input, Select, Textarea, Toggle, type IconName } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { inr } from '@/lib/format';

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'email' | 'tel' | 'select' | 'chips' | 'textarea' | 'checkbox' | 'lines';
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  full?: boolean; // span the whole row
};

type Line = { name: string; amount: number };
type Values = Record<string, unknown>;

export function initialValues(fields: FieldDef[], overrides: Values = {}): Values {
  const v: Values = {};
  for (const f of fields) {
    v[f.name] =
      f.type === 'number' ? 0
      : f.type === 'checkbox' ? false
      : f.type === 'lines' ? [{ name: '', amount: 0 }]
      : f.type === 'select' || f.type === 'chips' ? f.options?.[0] ?? ''
      : '';
  }
  for (const [k, val] of Object.entries(overrides)) if (val !== undefined && val !== null) v[k] = val;
  return v;
}

// Line items with a running total, used by scope submissions.
function LinesInput({ value, onChange }: { value: Line[]; onChange: (v: Line[]) => void }) {
  const update = (i: number, patch: Partial<Line>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = value.reduce((a, l) => a + (Number(l.amount) || 0), 0);
  return (
    <div className="lines">
      {value.map((l, i) => (
        <div key={i} className="row">
          <input className="inp sm" placeholder="Module, e.g. Admin panel" value={l.name} onChange={e => update(i, { name: e.target.value })} />
          <input className="inp sm r num" type="number" min={0} style={{ maxWidth: 160 }} placeholder="Amount" value={l.amount || ''} onChange={e => update(i, { amount: Number(e.target.value) })} />
          <Button type="button" size="sm" variant="ghost" icon="x" onClick={() => onChange(value.filter((_, j) => j !== i))} disabled={value.length === 1} aria-label="Remove line" />
        </div>
      ))}
      <div className="between">
        <Button type="button" size="sm" icon="plus" onClick={() => onChange([...value, { name: '', amount: 0 }])}>Add line</Button>
        <span className="row"><span className="sub">Total</span><b className="num earn">{inr(total)}</b></span>
      </div>
    </div>
  );
}

type Props = {
  fields: FieldDef[];
  initial?: Values;
  submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>;
  onCancel?: () => void;
  resetOnSubmit?: boolean;
  submitIcon?: IconName;
  columns?: number;        // fixed column count instead of auto-fit (e.g. 2 in narrow modals)
  // Display label per option value, e.g. { owner: id => partnerName(id) } for selects of ids.
  optionLabel?: Record<string, (value: string) => string>;
};

// Renders any form from a field list. Used for leads, requests, kit files, partners and profile.
export function DynamicForm({ fields, initial, submitLabel = 'Save', onSubmit, onCancel, resetOnSubmit, optionLabel, submitIcon = 'send', columns }: Props) {
  const form = useForm<Values>(initialValues(fields, initial));
  const opts = (f: FieldDef) => (f.options || []).map(o => ({ value: o, label: optionLabel?.[f.name]?.(o) ?? o }));
  const full = (f: FieldDef) => f.full || ['textarea', 'lines', 'chips', 'checkbox'].includes(f.type ?? '');

  return (
    <form
      className="stack"
      style={{ gap: 18 }}
      onSubmit={form.submit(async v => {
        await onSubmit(v);
        if (resetOnSubmit) form.reset();
      })}
    >
      <div className="grid-f" style={columns ? { gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`, gap: 12 } : undefined}>
        {fields.map(f => {
          const common = { label: f.label, required: f.required, placeholder: f.placeholder, hint: f.hint };
          const value = form.values[f.name];
          const set = (v: unknown) => form.set(f.name, v);
          let el;
          switch (f.type) {
            case 'select':
              el = <Select {...common} options={opts(f)} value={String(value ?? '')} onChange={e => set(e.target.value)} />;
              break;
            case 'chips':
              el = (
                <div className="field">
                  <span>{f.label}</span>
                  <Chips tabs={opts(f)} value={String(value ?? '')} onChange={set} />
                </div>
              );
              break;
            case 'textarea':
              el = <Textarea {...common} rows={3} value={String(value ?? '')} onChange={e => set(e.target.value)} />;
              break;
            case 'checkbox':
              el = <Toggle on={Boolean(value)} onChange={set} title={f.label} sub={f.hint} />;
              break;
            case 'lines':
              el = (
                <div className="field">
                  <span>{f.label}</span>
                  <LinesInput value={value as Line[]} onChange={set} />
                </div>
              );
              break;
            case 'number':
              el = <Input {...common} type="number" min={0} className="num" value={Number(value) || ''} onChange={e => set(Number(e.target.value))} />;
              break;
            default:
              el = <Input {...common} type={f.type || 'text'} value={String(value ?? '')} onChange={e => set(e.target.value)} />;
          }
          return (
            <div key={f.name} style={full(f) ? { gridColumn: '1 / -1' } : undefined}>
              {el}
            </div>
          );
        })}
      </div>
      <FormError error={form.error} />
      <div className="form-foot">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button variant="fire" icon={submitIcon} loading={form.busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}
