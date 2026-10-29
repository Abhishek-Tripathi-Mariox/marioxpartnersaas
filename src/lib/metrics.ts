import { TDS_RATE } from './constants';
import { LOST, WON, isOpen, stageProb, type PipelineConfig } from './pipeline';

// Pure functions, safe to use on server and client.

type Payment = { _id?: string; label: string; amount: number; due?: string; status: string; releasedAt?: string; utr?: string };
type ProjectLike = { _id?: string; client: string; deal: number; payments: Payment[]; owner?: { commissionRate?: number } | string };
type LeadLike = { value: number; stage: string };

export type CommissionState = 'released' | 'processing' | 'due' | 'upcoming';

export function commissionState(p: Payment): CommissionState {
  if (p.status === 'received') return p.releasedAt ? 'released' : 'processing';
  return p.status === 'due' ? 'due' : 'upcoming';
}

export function earnings(projects: ProjectLike[], fallbackRate: number) {
  let deal = 0, received = 0, released = 0, processing = 0, future = 0;
  const ledger: (Payment & { commission: number; state: CommissionState; client: string; projectId?: string })[] = [];

  for (const pr of projects) {
    const rate = typeof pr.owner === 'object' && pr.owner?.commissionRate != null ? pr.owner.commissionRate : fallbackRate;
    deal += pr.deal || 0;
    for (const p of pr.payments || []) {
      const commission = p.amount * rate;
      const state = commissionState(p);
      if (p.status === 'received') received += p.amount;
      if (state === 'released') released += commission;
      else if (state === 'processing') processing += commission;
      else future += commission;
      ledger.push({ ...p, commission, state, client: pr.client, projectId: pr._id });
    }
  }
  ledger.sort((a, b) => ((a.due || '') < (b.due || '') ? -1 : 1));
  const potential = released + processing + future;
  return { deal, received, released, processing, future, potential, tds: released * TDS_RATE, ledger };
}

export function pipeline(leads: LeadLike[], cfg: PipelineConfig) {
  const open = leads.filter(l => isOpen(l.stage));
  const won = leads.filter(l => l.stage === WON);
  const lost = leads.filter(l => l.stage === LOST);
  const closed = won.length + lost.length;
  return {
    open: open.length,
    openValue: open.reduce((a, l) => a + l.value, 0),
    weighted: open.reduce((a, l) => a + (l.value * stageProb(cfg, l.stage)) / 100, 0),
    won: won.length,
    wonValue: won.reduce((a, l) => a + l.value, 0),
    lost: lost.length,
    winRate: closed ? Math.round((won.length / closed) * 100) : 0,
  };
}
