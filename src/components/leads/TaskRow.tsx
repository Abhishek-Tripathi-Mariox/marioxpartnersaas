'use client';

import Link from 'next/link';
import { Check } from '@/components/ui';
import { date, todayISO } from '@/lib/format';
import type { Task } from '@/types';

export function dueLabel(due?: string) {
  if (!due) return { text: 'No date', tone: '' };
  const today = todayISO();
  if (due < today) return { text: 'Overdue', tone: 'bad' };
  if (due === today) return { text: 'Today', tone: 'warn' };
  return { text: date(due), tone: '' };
}

// One follow-up with the animated checkbox; used on home and in the lead view.
export function TaskRow({ task, company, href, onToggle, readOnly }: { task: Task; company?: string; href?: string; onToggle?: () => void; readOnly?: boolean }) {
  const d = dueLabel(task.due);
  const body = (
    <>
      <b style={task.done ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>{task.text}</b>
      <span className={d.tone === 'bad' && !task.done ? 'od' : ''}>{[company, d.text].filter(Boolean).join(' · ')}</span>
    </>
  );
  return (
    <div className="task">
      {!readOnly && <Check checked={task.done} onChange={() => onToggle?.()} label={`Mark done: ${task.text}`} />}
      {href ? <Link className="task-b" href={href}>{body}</Link> : <div className="task-b">{body}</div>}
    </div>
  );
}
