import { Setting } from '@/models/Content';
import { withDefaults, allStages, type PipelineConfig } from './pipeline';

// Server-side read of portal settings with pipeline defaults applied.
export async function getSettings() {
  const doc = await Setting.findOne({ key: 'portal' }).lean<{ contacts?: unknown[]; announcement?: string; pipeline?: Partial<PipelineConfig> }>();
  return {
    contacts: doc?.contacts ?? [],
    announcement: doc?.announcement ?? '',
    pipeline: withDefaults(doc?.pipeline),
  };
}

export async function getPipeline() {
  return (await getSettings()).pipeline;
}

export const stageKeys = (c: PipelineConfig) => allStages(c).map(s => s.key);
