import { z } from 'zod';
import { handle, session, admin, body, ok, HttpError } from '@/lib/api';
import { LOST, WON, slug, type PipelineConfig } from '@/lib/pipeline';
import { pipelineSchema } from '@/lib/schemas';
import { getSettings } from '@/lib/settings';
import { Setting } from '@/models/Content';
import { Lead } from '@/models/Lead';

const settingsSchema = z.object({
  contacts: z
    .array(z.object({ title: z.string(), name: z.string(), role: z.string(), phone: z.string(), email: z.string(), note: z.string() }))
    .optional(),
  announcement: z.string().optional(),
  pipeline: pipelineSchema.optional(),
});

export const GET = handle(async () => {
  await session();
  return ok({ settings: await getSettings() });
});

// Gives new stages a stable key and refuses to drop a stage that still has leads.
async function preparePipeline(next: z.infer<typeof pipelineSchema>): Promise<PipelineConfig> {
  const used = new Set<string>([WON, LOST]);
  const stages = next.stages.map(s => {
    let key = s.key && !used.has(s.key) ? s.key : slug(s.name);
    for (let i = 2; used.has(key); i++) key = `${slug(s.name)}-${i}`;
    used.add(key);
    return { key, name: s.name.trim(), prob: s.prob };
  });

  const current = (await getSettings()).pipeline.stages.map(s => s.key);
  const removed = current.filter(k => !used.has(k));
  if (removed.length) {
    const count = await Lead.countDocuments({ stage: { $in: removed } });
    if (count) throw new HttpError(409, `${count} lead(s) are still in a stage you removed. Move them first.`);
  }

  const uniq = (a: string[]) => [...new Set(a.map(x => x.trim()).filter(Boolean))];
  return { stages, sources: uniq(next.sources), priorities: next.priorities, lostReasons: uniq(next.lostReasons) };
}

export const PUT = handle(async req => {
  await admin();
  const { pipeline, ...rest } = await body(req, settingsSchema);
  const update = { ...rest, ...(pipeline ? { pipeline: await preparePipeline(pipeline) } : {}) };
  await Setting.findOneAndUpdate({ key: 'portal' }, update, { upsert: true });
  return ok({ settings: await getSettings() });
});
