'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export type Option = string | { value: string | number; label: string; hint?: string };
type Norm = { value: string; label: string; hint?: string };

const norm = (o: Option): Norm => (typeof o === 'string' ? { value: o, label: o } : { value: String(o.value), label: o.label, hint: o.hint });

// Shows a search box once the list is longer than this.
export const SEARCH_THRESHOLD = 5;

type Props = {
  options: readonly Option[];
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  placeholder?: string;        // also adds an empty "clear" option at the top
  small?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
  searchable?: boolean;        // force on/off; default: more than SEARCH_THRESHOLD options
};

type Pos = { top: number; left: number; width: number; maxHeight: number; up: boolean };

// Accessible custom select: keyboard (↑ ↓ Home End Enter Esc, type-to-jump), search for long lists,
// rendered in a portal with fixed positioning so modals and scroll containers never clip it.
export function Dropdown({ options, value, onChange, placeholder, small, disabled, required, name, id, className = '', style, searchable, ...aria }: Props) {
  const all = useMemo(() => {
    const list = options.map(norm);
    return placeholder !== undefined ? [{ value: '', label: placeholder }, ...list] : list;
  }, [options, placeholder]);
  const current = all.find(o => o.value === String(value ?? '')) ?? (placeholder !== undefined ? all[0] : undefined);
  const withSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const listId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter(o => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : all;
  }, [all, query]);

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
    const up = below < 240 && above > below;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 200), maxHeight: Math.min(340, up ? above : below), up });
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    setActive(Math.max(0, all.findIndex(o => o.value === current?.value)));
    place();
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  const choose = (o?: Norm) => {
    if (!o) return;
    if (o.value !== String(value ?? '')) onChange(o.value);
    close();
  };

  // Keep the menu attached to the trigger while the page scrolls or resizes; close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !listRef.current?.parentElement?.contains(t)) close(false);
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, place]);

  useLayoutEffect(() => {
    if (open && withSearch) searchRef.current?.focus();
  }, [open, withSearch]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => setActive(0), [query]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    const move = (i: number) => setActive(Math.max(0, Math.min(shown.length - 1, i)));
    if (e.key === 'ArrowDown') { e.preventDefault(); move(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } // don't also close a parent modal
    else if (e.key === 'Tab') close(false);
    else if (!withSearch && e.key.length === 1) {
      // Type-to-jump when there is no search box.
      const now = Date.now(), t = typeahead.current;
      t.text = now - t.at < 600 ? t.text + e.key.toLowerCase() : e.key.toLowerCase();
      t.at = now;
      const i = shown.findIndex(o => o.label.toLowerCase().startsWith(t.text));
      if (i >= 0) setActive(i);
    }
  };

  const menu =
    open && pos
      ? createPortal(
          <div
            className={`dd-menu ${pos.up ? 'up' : ''}`}
            style={{ left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
            onKeyDown={onKey}
          >
            {withSearch && (
              <div className="dd-search">
                <Icon name="search" size="s" />
                <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" aria-controls={listId} aria-label="Search options" />
                <span className="dd-count">{shown.length - (placeholder !== undefined && !query ? 1 : 0)}</span>
              </div>
            )}
            <ul ref={listRef} id={listId} role="listbox" style={{ maxHeight: pos.maxHeight - (withSearch ? 52 : 0) }}>
              {shown.length ? (
                shown.map((o, i) => {
                  const selected = o.value === current?.value;
                  return (
                    <li
                      key={o.value || '__empty'}
                      data-i={i}
                      role="option"
                      aria-selected={selected}
                      className={`dd-opt ${i === active ? 'on' : ''} ${selected ? 'sel' : ''} ${o.value === '' ? 'muted' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => choose(o)}
                    >
                      <span className="dd-l">
                        {o.label}
                        {o.hint && <small>{o.hint}</small>}
                      </span>
                      {selected && <Icon name="check" size="s" />}
                    </li>
                  );
                })
              ) : (
                <li className="dd-empty">No matches for “{query}”</li>
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`dd ${className}`} style={style}>
      <button
        ref={trigger}
        type="button"
        id={id}
        className={`inp dd-trigger ${small ? 'sm' : ''} ${open ? 'open' : ''}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria['aria-label']}
      >
        <span className={`dd-v ${!current || current.value === '' ? 'ph' : ''}`}>{current?.label ?? 'Select…'}</span>
        <Icon name="chev" size="s" />
      </button>
      {/* Keeps native form validation and form submission working. */}
      <input className="dd-native" tabIndex={-1} aria-hidden="true" name={name} required={required} value={current?.value ?? ''} onChange={() => {}} />
      {menu}
    </div>
  );
}
