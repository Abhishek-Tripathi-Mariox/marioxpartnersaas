import { StatCard, Stats } from '@/components/ui';
import { short } from '@/lib/format';
import type { pipeline } from '@/lib/metrics';

type Summary = ReturnType<typeof pipeline>;
export type PipelinePick = 'open' | 'commission' | 'closed' | 'tasks';

type Props = {
  s: Summary;
  rateLabel: string;
  followUps: number;
  overdue: number;
  active?: PipelinePick | null;
  onPick?: (p: PipelinePick) => void;
  hrefFor?: (p: PipelinePick) => string; // when shown on another page (dashboard, partner detail)
};

// Pipeline KPIs. Each tile opens the leads behind its number.
export function PipelineStats({ s, rateLabel, followUps, overdue, active, onPick, hrefFor }: Props) {
  const link = (p: PipelinePick) => (hrefFor ? { href: hrefFor(p) } : onPick ? { onClick: () => onPick(p), active: active === p } : {});
  return (
    <Stats min={190}>
      <StatCard
        icon="pipe" tone="fire" label="Open pipeline" value={short(s.openValue)} hint={`${s.open} active leads`}
        info="Sum of deal values of every lead that is not Won or Lost."
        {...link('open')}
      />
      <StatCard
        icon="rupee" tone="good" label="Expected commission" value={short(s.expected)} hint={`On ${s.won} won deal${s.won === 1 ? '' : 's'} · ${short(s.wonValue)}`} good
        info={`Value of Won deals × ${rateLabel} commission. Open leads count only once they are won.`}
        {...link('commission')}
      />
      <StatCard
        icon="trophy" tone="info" label="Win rate" value={s.won + s.lost ? `${s.winRate}%` : '—'} hint={`${s.won} won · ${s.lost} lost`}
        info="Won ÷ (Won + Lost) leads. Open leads are not counted."
        {...link('closed')}
      />
      <StatCard
        icon="checkSq" tone="warn" label="Open follow-ups" value={followUps} hint={overdue ? <span style={{ color: 'var(--bad)' }}>{overdue} overdue</span> : 'None overdue'}
        info="Unfinished tasks on open leads. Overdue = due date before today."
        {...link('tasks')}
      />
    </Stats>
  );
}
