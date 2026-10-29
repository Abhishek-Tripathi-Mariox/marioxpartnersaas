'use client';

import type { ReactNode } from 'react';

type Item<T extends string> = T | { value: T; label: ReactNode; count?: number | string };
type Props<T extends string> = {
  // NoInfer: T comes from value/onChange, so tab objects don't widen it to string.
  tabs: NoInfer<readonly Item<T>[]>;
  value: T;
  onChange: (v: T) => void;
};

const norm = <T extends string>(t: Item<T>) => (typeof t === 'string' ? { value: t, label: t as ReactNode, count: undefined } : t);

// Segmented control (".seg").
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="seg" role="tablist">
      {tabs.map(norm).map(t => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className={t.value === value ? 'on' : ''} onClick={() => onChange(t.value)}>
          {t.label}
          {!!t.count && <span className="c">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Pill filter row (".chips").
export function Chips<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="chips">
      {tabs.map(norm).map(t => (
        <button key={t.value} type="button" className={`chip ${t.value === value ? 'on' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
