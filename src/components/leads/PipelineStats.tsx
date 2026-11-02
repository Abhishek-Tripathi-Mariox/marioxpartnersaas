import { StatCard, Stats } from '@/components/ui';
import { short } from '@/lib/format';
import type { pipeline } from '@/lib/metrics';

type Summary = ReturnType<typeof pipeline>;
export type PipelinePick = 'open' | 'won' | 'closed' | 'tasks';

type Props = {
  s: Summary;
  followUps: number;
  // Commission from client payments on won deals (projects): shown next to the pipeline numbers.
  commission?: { released: number; processing: number; future: number; href: string; admin?: boolean };
  overdue: number;
  active?: PipelinePick | null;
  onPick?: (p: PipelinePick) => void;
  hrefFor?: (p: PipelinePick) => string; // when shown on another page (dashboard, partner detail)
};

// Pipeline KPIs. Each tile opens the leads behind its number.
export function PipelineStats({ s, commission, followUps, overdue, active, onPick, hrefFor }: Props) {
  const link = (p: PipelinePick) => (hrefFor ? { href: hrefFor(p) } : onPick ? { onClick: () => onPick(p), active: active === p } : {});
  return (
    <Stats min={180}>
      <StatCard
        icon="pipe" tone="fire" label="Open pipeline" value={short(s.openValue)} hint={`${s.open} active leads`}
        info="Sum of deal values of every lead that is not Won or Lost."
        {...link('open')}
      />
      <StatCard
        icon="trophy" tone="good" label="Won" value={short(s.wonValue)} hint={`${s.won} deal${s.won === 1 ? '' : 's'} won`} good
        info="Total deal value of leads marked Won. Open the list to see each won lead."
        {...link('won')}
      />
      <StatCard
        icon="target" tone="info" label="Win rate" value={s.won + s.lost ? `${s.winRate}%` : '—'} hint={`${s.won} won · ${s.lost} lost`}
        info="Won ÷ (Won + Lost) leads. Open leads are not counted."
        {...link('closed')}
      />
      <StatCard
        icon="checkSq" tone="warn" label="Open follow-ups" value={followUps} hint={overdue ? <span style={{ color: 'var(--bad)' }}>{overdue} overdue</span> : 'None overdue'}
        info="Unfinished tasks on open leads. Overdue = due date before today."
        {...link('tasks')}
      />
      {commission && (
        <StatCard
          icon="wallet" tone="good" good href={commission.href}
          label={commission.admin ? 'Commission paid out' : 'Commission earned'}
          value={short(commission.released)}
          hint={`${short(commission.processing)} processing · ${short(commission.future)} upcoming`}
          info={
            commission.admin
              ? "Commission already released to partners, each at their own rate. Processing = client paid, payout not released yet. Upcoming = on client payments still to come."
              : 'Commission already paid to you (released). Processing = client has paid Mariox, payout on the way. Upcoming = on client payments still to come.'
          }
        />
      )}
    </Stats>
  );
}
