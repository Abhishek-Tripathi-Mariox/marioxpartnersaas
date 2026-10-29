// Admin-configurable sales pipeline. Shared by server and client.
// Open stages are editable; "won" and "lost" are fixed keys that always close a lead.

export const TONES = ['bad', 'warn', 'info', 'good', 'violet', 'fire', 'mute'] as const;
export type ToneName = (typeof TONES)[number];

export type StageDef = { key: string; name: string; prob: number };
export type PriorityDef = { name: string; tone: ToneName };
export type PipelineConfig = { stages: StageDef[]; sources: string[]; priorities: PriorityDef[]; lostReasons: string[] };

export const WON = 'won';
export const LOST = 'lost';
const CLOSED: StageDef[] = [
  { key: WON, name: 'Won', prob: 100 },
  { key: LOST, name: 'Lost', prob: 0 },
];

export const DEFAULT_PIPELINE: PipelineConfig = {
  stages: [
    { key: 'lead', name: 'Lead', prob: 10 },
    { key: 'contacted', name: 'Contacted', prob: 20 },
    { key: 'meeting', name: 'Meeting done', prob: 40 },
    { key: 'proposal', name: 'Proposal sent', prob: 60 },
    { key: 'negotiation', name: 'Negotiation', prob: 80 },
  ],
  sources: ['Referral', 'Existing network', 'LinkedIn', 'Event', 'Cold outreach'],
  priorities: [
    { name: 'Hot', tone: 'bad' },
    { name: 'Warm', tone: 'warn' },
    { name: 'Cold', tone: 'info' },
  ],
  lostReasons: ['Not specified', 'Budget', 'Went with competitor', 'No decision', 'Timing'],
};

// Fills any missing part of a stored config with defaults.
export function withDefaults(c?: Partial<PipelineConfig> | null): PipelineConfig {
  return {
    stages: c?.stages?.length ? c.stages : DEFAULT_PIPELINE.stages,
    sources: c?.sources?.length ? c.sources : DEFAULT_PIPELINE.sources,
    priorities: c?.priorities?.length ? c.priorities : DEFAULT_PIPELINE.priorities,
    lostReasons: c?.lostReasons?.length ? c.lostReasons : DEFAULT_PIPELINE.lostReasons,
  };
}

export const allStages = (c: PipelineConfig) => [...c.stages, ...CLOSED];
export const isOpen = (key: string) => key !== WON && key !== LOST;
export const stageName = (c: PipelineConfig, key: string) => allStages(c).find(s => s.key === key)?.name ?? key;
export const stageProb = (c: PipelineConfig, key: string) => allStages(c).find(s => s.key === key)?.prob ?? 0;
export const priorityTone = (c: PipelineConfig, name?: string): ToneName => c.priorities.find(p => p.name === name)?.tone ?? 'mute';

// Open stages cycle through these; won/lost are always green/red.
const PALETTE = ['var(--faint)', 'var(--info)', 'var(--violet)', 'var(--warn)', 'var(--accent)', 'var(--good)', 'var(--bad)'];
const OPEN_PALETTE = PALETTE.slice(0, 5);
export function stageColor(c: PipelineConfig, key: string) {
  if (key === WON) return 'var(--good)';
  if (key === LOST) return 'var(--bad)';
  const i = c.stages.findIndex(s => s.key === key);
  return OPEN_PALETTE[Math.max(0, i) % OPEN_PALETTE.length];
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'stage';
