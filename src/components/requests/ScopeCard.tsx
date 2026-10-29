import { Icon, StatusBadge } from '@/components/ui';
import { date, inr } from '@/lib/format';
import type { RequestItem } from '@/types';

// Original scope approval card: submitted → approved → your commission.
export function ScopeCard({ s, rate }: { s: RequestItem; rate: number }) {
  const approved = s.approved as number | undefined;
  const tone = s.status === 'revised' ? 't-violet' : s.status === 'approved' ? 't-good' : s.status === 'rejected' ? 't-bad' : 't-warn';
  const box = { flex: 1, minWidth: 160, maxWidth: 260 };

  return (
    <div className="card hov" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="between wrap" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 14 }}>
          <span className={`ico ${tone}`}><Icon name="fileCheck" /></span>
          <div>
            <div style={{ font: '700 19px/1.15 var(--display)', letterSpacing: '-.025em' }}>{String(s.project)}</div>
            <div className="sub" style={{ marginTop: 3 }}>{String(s.client)} · submitted {date(s.createdAt)}</div>
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>
      <div className="row wrap" style={{ gap: 10 }}>
        <div className="note" style={box}><span className="lbl">You submitted</span><span className="val s num">{inr(s.submitted as number)}</span></div>
        <div className="row" style={{ color: 'var(--faint)' }}><Icon name="arr" /></div>
        <div className="note" style={{ ...box, ...(approved ? { background: 'var(--accent-soft)', boxShadow: 'none' } : {}) }}>
          <span className="lbl" style={approved ? { color: 'var(--accent)' } : undefined}>Mariox approved</span>
          <span className="val s num">{approved ? inr(approved) : '—'}</span>
        </div>
        {!!approved && (
          <div className="note good" style={box}>
            <span className="lbl" style={{ color: 'var(--good)' }}>Your {Math.round(rate * 100)}% if fully paid</span>
            <span className="val s num" style={{ color: 'var(--good)' }}>{inr(approved * rate)}</span>
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--faint)' }}>Mariox solutions team:</span> {String(s.comment || 'Reviewing your submission.')}
        </p>
      </div>
    </div>
  );
}
