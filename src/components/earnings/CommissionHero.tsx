import Link from 'next/link';
import { Icon, InfoTip } from '@/components/ui';
import { date, inr, pct } from '@/lib/format';
import type { earnings } from '@/lib/metrics';

type Summary = ReturnType<typeof earnings>;
const R = 76, C = 2 * Math.PI * R;

// Dark hero card: released amount, progress ring and the next client payment.
export function CommissionHero({ e, bankLabel, className = 'c8' }: { e: Summary; bankLabel?: string; className?: string }) {
  const fa = e.potential ? e.released / e.potential : 0;
  const fb = e.potential ? e.processing / e.potential : 0;
  const next = e.ledger.find(x => x.state === 'due' || x.state === 'upcoming');

  return (
    <div className={`hero ${className}`} style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'space-between' }}>
      <div className="between wrap">
        <span className="lbl">Commission released to you</span>
        {bankLabel && (
          <span className="pill nd" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--hero-ink)' }}>
            <Icon name="shield" size="s" />
            {bankLabel}
          </span>
        )}
      </div>
      <Link href="/earnings?status=Released" className="big num" title="See released payouts">{inr(e.released)}</Link>
      <div className="row wrap" style={{ gap: 30 }}>
        <div className="ring">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle className="trk" cx="90" cy="90" r={R} />
            <circle className="seg-a" cx="90" cy="90" r={R} strokeDasharray={`${C * fa} ${C}`} />
            <circle className="seg-b" cx="90" cy="90" r={R} strokeDasharray={`${C * fb} ${C}`} strokeDashoffset={-C * fa} />
          </svg>
          <div className="ring-c">
            <div>
              <div style={{ font: '700 30px var(--display)', letterSpacing: '-.03em' }}>{pct(e.released + e.processing, e.potential)}%</div>
              <div className="muted" style={{ fontSize: 12 }}>paid or processing</div>
            </div>
          </div>
        </div>
        <div className="legend" style={{ flex: 1, minWidth: 240, gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '18px 24px' }}>
          <Legend color="#f2b54a" label="Processing" value={e.processing} href="/earnings?status=Processing" info="Client paid Mariox; your payout is on the way." />
          <Legend color="rgba(255,255,255,.18)" label="Future commission" value={e.future} href="/earnings?status=Upcoming" info="Commission on client payments that are not due or not paid yet." />
          <Legend color="var(--accent)" label="Released" value={e.released} href="/earnings?status=Released" info="Already paid to your bank account." />
          <Legend color="#fff" label="Total potential" value={e.potential} href="/earnings" info="Released + Processing + Future." />
        </div>
      </div>
      {next && (
        <Link
          href="/earnings"
          className="between wrap"
          style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.06)', boxShadow: '0 0 0 1px var(--hero-line) inset', gap: 12 }}
        >
          <span className="row" style={{ gap: 12 }}>
            <span className="ico" style={{ background: 'rgba(60,207,149,.15)', color: '#3ccf95', width: 36, height: 36 }}>
              <Icon name="cal" size="s" />
            </span>
            <span>
              <span className="muted" style={{ fontSize: 12, display: 'block' }}>Next client payment · {date(next.due)}</span>
              <b style={{ fontWeight: 600 }}>{next.client} pays {inr(next.amount)}</b>
            </span>
          </span>
          <span className="row" style={{ color: '#3ccf95', fontWeight: 600, gap: 6 }}>
            +{inr(next.commission)} to you <Icon name="arr" size="s" />
          </span>
        </Link>
      )}
    </div>
  );
}

function Legend({ color, label, value, href, info }: { color: string; label: string; value: number; href: string; info: string }) {
  return (
    <Link href={href}>
      <div className="k"><i style={{ background: color }} />{label}<InfoTip text={info} /></div>
      <div className="v num">{inr(value)}</div>
    </Link>
  );
}
