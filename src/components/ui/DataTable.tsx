import type { ReactNode } from 'react';
import { SkeletonRows } from './Skeleton';

export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;        // CSS grid track, default minmax(0,1fr)
  align?: 'left' | 'right';
  sort?: string;         // server sort field; makes the header clickable
};

type Props<T> = {
  rows: T[] | undefined | null;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: string;
  minWidth?: number;     // enables horizontal scroll on narrow screens
  sort?: string;         // current sort, "field" or "-field"
  onSort?: (sort: string) => void;
  footer?: ReactNode;    // e.g. <Pagination/>
};

// Clicking a sortable header toggles descending → ascending.
function SortHeader({ field, label, sort, onSort }: { field: string; label: ReactNode; sort?: string; onSort: (s: string) => void }) {
  const on = sort?.replace(/^-/, '') === field;
  const desc = on && sort!.startsWith('-');
  return (
    <button type="button" className={`sort-h ${on ? 'on' : ''}`} onClick={() => onSort(on && desc ? field : `-${field}`)}>
      {label}
      <span aria-hidden="true">{on ? (desc ? '↓' : '↑') : '↕'}</span>
    </button>
  );
}

// Grid-based table from the original portal (.tbl/.th/.tr). Collapses to labelled cards on phones.
export function DataTable<T>({ rows, columns, rowKey, onRowClick, loading, empty = 'Nothing here yet', minWidth, sort, onSort, footer }: Props<T>) {
  const grid = { gridTemplateColumns: columns.map(c => c.width ?? 'minmax(0,1fr)').join(' ') };
  const header = (c: Column<T>) => (typeof c.header === 'string' ? c.header : undefined);

  let body: ReactNode;
  if (loading && !rows) body = <SkeletonRows cols={Math.min(columns.length, 6)} />;
  else if (!rows?.length) body = <div className="empty" style={{ marginTop: 12 }}>{empty}</div>;
  else
    body = rows.map(r => (
      <div
        key={rowKey(r)}
        className={`tr ${onRowClick ? 'click' : ''}`}
        style={{ ...grid, opacity: loading ? 0.55 : 1 }}
        role={onRowClick ? 'button' : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onClick={onRowClick ? () => onRowClick(r) : undefined}
        onKeyDown={onRowClick ? e => e.key === 'Enter' && onRowClick(r) : undefined}
      >
        {columns.map((c, i) => (
          <div key={c.key} data-l={i ? header(c) : undefined} style={{ textAlign: c.align, minWidth: 0 }}>
            {c.render(r)}
          </div>
        ))}
      </div>
    ));

  const table = (
    <div className="tbl" style={minWidth ? { minWidth } : undefined}>
      <div className="th" style={grid}>
        {columns.map(c => (
          <div key={c.key} style={{ textAlign: c.align }}>
            {c.sort && onSort ? <SortHeader field={c.sort} label={c.header} sort={sort} onSort={onSort} /> : c.header}
          </div>
        ))}
      </div>
      {body}
    </div>
  );
  return (
    <>
      {minWidth ? <div className="scroll-x">{table}</div> : table}
      {footer}
    </>
  );
}
