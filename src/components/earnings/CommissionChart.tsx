import { short, inr } from '@/lib/format';
import type { CommissionState } from '@/lib/metrics';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type Row = { due?: string; commission: number; state: CommissionState };

// Stacked monthly bars (released / processing / future), ported from the original SVG chart.
export function CommissionChart({ ledger }: { ledger: Row[] }) {
  const dated = ledger.filter(l => l.due);
  if (!dated.length) return <div className="empty">No payment schedule yet</div>;

  const keys = [...new Set(dated.map(l => l.due!.slice(0, 7)))].sort();
  const months: string[] = [];
  let [y, mo] = keys[0].split('-').map(Number);
  while (`${y}-${String(mo).padStart(2, '0')}` <= keys[keys.length - 1]) {
    months.push(`${y}-${String(mo).padStart(2, '0')}`);
    if (++mo > 12) { mo = 1; y++; }
  }
  const data = months.map(k => {
    const r = { k, rel: 0, proc: 0, fut: 0 };
    dated.filter(l => l.due!.startsWith(k)).forEach(l => {
      if (l.state === 'released') r.rel += l.commission;
      else if (l.state === 'processing') r.proc += l.commission;
      else r.fut += l.commission;
    });
    return r;
  });

  const max = Math.ceil(Math.max(...data.map(d => d.rel + d.proc + d.fut)) / 1e5) * 1e5 || 1e5;
  const W = 720, H = 230, L = 52, B = 26, T = 10;
  const cw = (W - L) / data.length, bw = Math.min(42, cw * 0.56);
  const ys = (v: number) => H - B - (v / max) * (H - B - T);

  return (
    <div className="scroll-x">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520 }} role="img" aria-label="Commission by month, stacked by status">
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line className="gl" x1={L} x2={W} y1={ys(max * f)} y2={ys(max * f)} />
            <text x={L - 10} y={ys(max * f) + 4} textAnchor="end">{f ? short(max * f) : '0'}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * cw + (cw - bw) / 2;
          let base = 0;
          const part = (v: number, cls: string) => {
            if (!v) return null;
            const y1 = ys(base + v), y0 = ys(base);
            base += v;
            return <rect key={cls} className={cls} x={x} y={y1} width={bw} height={Math.max(0, y0 - y1 - 1)} rx={5} />;
          };
          const [yy, mm] = d.k.split('-');
          return (
            <g className="col" key={d.k}>
              <title>{`${MONTHS[+mm - 1]} ${yy} · Released ${inr(d.rel)} · Processing ${inr(d.proc)} · Future ${inr(d.fut)}`}</title>
              <rect x={L + i * cw} y={T} width={cw} height={H - B - T} fill="transparent" />
              {part(d.rel, 'b1')}
              {part(d.proc, 'b2')}
              {part(d.fut, 'b3')}
              <text x={x + bw / 2} y={H - 6} textAnchor="middle">{MONTHS[+mm - 1]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
