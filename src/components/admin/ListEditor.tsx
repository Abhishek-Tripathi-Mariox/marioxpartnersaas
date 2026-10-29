'use client';

import { useState, type ReactNode } from 'react';
import { Button, Icon } from '@/components/ui';

type Props<T> = {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  blank: () => T;
  addLabel: string;
  min?: number;
};

// Editable, reorderable list of rows. Used for pipeline stages, priorities and contacts.
export function ListEditor<T>({ items, onChange, render, blank, addLabel, min = 1 }: Props<T>) {
  const set = (i: number, patch: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} className="row" style={{ gap: 8, padding: '8px 10px', borderRadius: 14, background: 'var(--panel-2)', boxShadow: '0 0 0 1px var(--line) inset' }}>
          <div className="stack" style={{ gap: 2 }}>
            <button type="button" className="x" style={{ width: 24, height: 18 }} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
            <button type="button" className="x" style={{ width: 24, height: 18 }} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
          </div>
          <div className="row wrap" style={{ flex: 1, gap: 8 }}>{render(it, p => set(i, p))}</div>
          <button type="button" className="x" disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            <Icon name="trash" size="s" />
          </button>
        </div>
      ))}
      <div><Button type="button" size="sm" icon="plus" onClick={() => onChange([...items, blank()])}>{addLabel}</Button></div>
    </div>
  );
}

// Chip list of plain strings with an inline "add" input. Used for sources and lost reasons.
export function TagEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="chips">
        {values.map(v => (
          <span key={v} className="chip" style={{ paddingRight: 6 }}>
            {v}
            <button type="button" className="x" style={{ width: 22, height: 22 }} disabled={values.length <= 1} onClick={() => onChange(values.filter(x => x !== v))} aria-label={`Remove ${v}`}>
              <Icon name="x" size="s" />
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ maxWidth: 420 }}>
        <input
          className="inp sm"
          placeholder={placeholder}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" icon="plus" onClick={add}>Add</Button>
      </div>
    </div>
  );
}
