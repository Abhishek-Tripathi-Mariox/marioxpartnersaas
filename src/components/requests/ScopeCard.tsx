import { AttachmentList, type Attachment } from '@/components/forms/FileUploader';
import { Icon, StatusBadge } from '@/components/ui';
import { date, inr } from '@/lib/format';
import type { RequestItem } from '@/types';

// Original scope approval card: submitted → approved → your commission.
export function ScopeCard({ s, rate, onAccept }: { s: RequestItem; rate: number; onAccept?: () => void }) {
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
      {(attachments(s).length > 0 || lines(s).length > 0) && (
        <details className="scope-more">
          <summary>
            {lines(s).length} scope item{lines(s).length === 1 ? '' : 's'} · {attachments(s).length} attachment{attachments(s).length === 1 ? '' : 's'}
            {attachments(s).length > 0 && <AttachmentList files={attachments(s)} compact />}
          </summary>
          <ScopeDetails s={s} />
        </details>
      )}
      <div className="between wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', flex: 1, minWidth: 240 }}>
          <span style={{ color: 'var(--faint)' }}>Mariox solutions team:</span> {String(s.comment || 'Reviewing your submission.')}
        </p>
        {s.status === 'revised' && onAccept && <button className="btn fire sm" onClick={onAccept}>Accept revised amount</button>}
      </div>
    </div>
  );
}

const lines = (s: RequestItem) => (s.lines as { name: string; amount: number }[] | undefined) ?? [];
const attachments = (s: RequestItem) => (s.attachments as Attachment[] | undefined) ?? [];

// What the partner sent: requirement, priced items and downloadable attachments.
// Used inside the scope card and in the admin review dialog.
export function ScopeDetails({ s }: { s: RequestItem }) {
  const items = lines(s);
  const files = attachments(s);
  return (
    <div className="stack" style={{ gap: 14, marginTop: 12 }}>
      {s.needs ? (
        <div className="note"><span className="lbl">What the client needs</span><span style={{ whiteSpace: 'pre-line' }}>{String(s.needs)}</span></div>
      ) : null}
      {items.length > 0 && (
        <div>
          <div className="between" style={{ marginBottom: 6 }}><span className="lbl">Scope items</span><span className="lbl">Amount</span></div>
          {items.map((l, i) => (
            <div key={i} className="between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : undefined, fontSize: 14 }}>
              <span>{l.name || '—'}</span>
              <span className="num strong">{inr(l.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="lbl">Attachments</span>
          <AttachmentList files={files} />
        </div>
      )}
    </div>
  );
}
