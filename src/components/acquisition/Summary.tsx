'use client';

import type { CSSProperties } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { add, customSpan, matches, measure, rangeLabel, today, type AcqLead, type Query } from '@/lib/acquisition';

// Five cards for the selected period: leads added, calls held (and upcoming), follow-ups going on,
// converted (win rate) and rejected (the main reason). Today looks back 30 days.
export function Summary({ leads, Q, services }: { leads: AcqLead[]; Q: Query; services: string[] }) {
  const t = today();
  const n = Q.range === 'week' ? 7 : Q.range === 'all' || Q.range === 'custom' ? null : 30;
  const [a, b] = Q.range === 'custom' ? customSpan(Q) : [n ? add(t, -(n - 1)) : '0000', t];
  const m = measure(leads, Q, services, a, b);
  const L = leads.filter(l => matches(l, Q));
  const upcoming = L.filter(l => l.status === 'meeting' && (l.meet?.date ?? '') >= t).length;
  const following = L.filter(l => l.status === 'followup').length;
  const label = Q.range === 'custom' ? rangeLabel(Q) : Q.range === 'all' ? 'All time' : `Last ${n} days`;

  const S: [string, number, string, IconName, string][] = [
    ['Leads', m.added, 'var(--info)', 'users', 'added'],
    ['Calls', m.held, 'var(--violet)', 'cal', `held · ${upcoming} upcoming`],
    ['Follow-ups', following, 'var(--warn)', 'clock', 'going on now'],
    ['Converted', m.conv, 'var(--good)', 'trophy', m.win == null ? 'became partners' : `${m.win}% win rate`],
    ['Rejected', m.rej, 'var(--bad)', 'x', m.why[0] ? `mostly “${m.why[0][0]}”` : 'no rejections'],
  ];
  return (
    <section className="an3 rv" aria-label="Summary">
      <span className="lbl an3-l">{label}{Q.who !== 'all' ? ' · ' + Q.who : ''}</span>
      <div className="an3-g">
        {S.map(([l, v, c, i, sub]) => (
          <div key={l} className="an3-c" style={{ '--c': c } as CSSProperties}>
            <span className="an3-i"><Icon name={i} size="s" /></span>
            <b>{v}</b>
            <span className="an3-n">{l}</span>
            <span className="an3-s">{sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
