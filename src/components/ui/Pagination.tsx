'use client';

import { Dropdown } from './Dropdown';
import { Icon } from './Icon';

const SIZES = [10, 25, 50, 100];
type Meta = { page: number; limit: number; total: number; pages: number };

// Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20
function pageList(page: number, pages: number): (number | '…')[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter(p => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

// "Showing 26–50 of 132 · Rows [25] · ‹ 1 2 [3] … 6 ›"
export function Pagination({ meta, onPage, onLimit, label = 'items', sizes = SIZES }: { meta?: Meta; onPage: (p: number) => void; onLimit: (l: number) => void; label?: string; sizes?: number[] }) {
  if (!meta) return null;
  const { page, limit, total, pages } = meta;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);

  return (
    <div className="pager">
      <span className="sub">
        {total ? <>Showing <b className="num">{from}–{to}</b> of <b className="num">{total}</b> {label}</> : `No ${label}`}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <span className="sub">Rows per page</span>
        <Dropdown small style={{ width: 84 }} options={sizes.map(String)} value={String(limit)} onChange={v => onLimit(Number(v))} aria-label="Rows per page" />
      </div>
      <nav className="row" style={{ gap: 4 }} aria-label="Pagination">
        <button className="btn xs" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="chevL" size="s" /></button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="sub" style={{ padding: '0 4px' }}>…</span>
          ) : (
            <button key={p} className={`btn xs ${p === page ? 'ink' : 'ghost'}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
          ),
        )}
        <button className="btn xs" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="chevR" size="s" /></button>
      </nav>
    </div>
  );
}

// Search box with the magnifier icon, matching the pipeline filter bar.
export function SearchInput({ value, onChange, placeholder = 'Search', width = 360 }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string }) {
  return (
    <label className="row" style={{ flex: '1 1 240px', maxWidth: width, position: 'relative' }}>
      <span className="sr">{placeholder}</span>
      <span style={{ position: 'absolute', left: 14, color: 'var(--faint)', display: 'flex' }}><Icon name="search" size="s" /></span>
      <input className="inp" style={{ paddingLeft: 40, paddingRight: value ? 40 : 14 }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      {value && (
        <button type="button" className="x" style={{ position: 'absolute', right: 6, width: 32, height: 32 }} onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="x" size="s" />
        </button>
      )}
    </label>
  );
}
