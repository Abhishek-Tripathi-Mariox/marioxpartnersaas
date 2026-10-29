import { z } from 'zod';
import { handle, session, body, ok, scope, HttpError } from '@/lib/api';
import { LOST, WON, stageName } from '@/lib/pipeline';
import { leadSchema, today } from '@/lib/schemas';
import { getPipeline, stageKeys } from '@/lib/settings';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';

async function findLead(id: string) {
  const s = await session();
  const lead = await Lead.findOne({ _id: id, ...scope(s) });
  if (!lead) throw new HttpError(404, 'Lead not found');
  return { lead, s };
}

export const GET = handle(async (_req, { id }) => {
  const { lead } = await findLead(id);
  await lead.populate('owner', 'name company partnerCode commissionRate');
  return ok({ lead });
});

const patch = leadSchema.partial().extend({
  // Lead tasks and activities are edited through the same PATCH to keep the client simple.
  addActivity: z.object({ type: z.string(), text: z.string().min(1) }).optional(),
  addTask: z.object({ text: z.string().min(1), due: z.string().optional() }).optional(),
  toggleTask: z.string().optional(),
  removeTask: z.string().optional(),
});

export const PATCH = handle(async (req, { id }) => {
  const { lead, s } = await findLead(id);
  const { addActivity, addTask, toggleTask, removeTask, owner, ...fields } = await body(req, patch);

  if (fields.stage !== undefined && fields.stage !== lead.stage) {
    const pipe = await getPipeline();
    if (!stageKeys(pipe).includes(fields.stage)) throw new HttpError(400, 'Unknown stage');
    const text = fields.stage === LOST ? `Marked lost: ${fields.lostReason || 'Not specified'}` : `Moved to ${stageName(pipe, fields.stage)}`;
    lead.activities.unshift({ type: fields.stage === WON ? 'won' : 'stage', text, date: today() });
  }
  lead.set(fields);

  if (owner && s.role === 'admin' && owner !== String(lead.owner)) {
    const to = await User.findOne({ _id: owner, role: 'partner' }).select('name');
    if (!to) throw new HttpError(400, 'Unknown partner');
    lead.owner = to._id;
    lead.activities.unshift({ type: 'note', text: `Reassigned to ${to.name} by Mariox`, date: today() });
  }

  if (addActivity) lead.activities.unshift({ ...addActivity, date: today() });
  if (addTask) lead.tasks.push({ ...addTask, done: false });
  if (toggleTask) {
    const t = lead.tasks.id(toggleTask);
    if (t) {
      t.done = !t.done;
      if (t.done) lead.activities.unshift({ type: 'task', text: t.text, date: today() });
    }
  }
  if (removeTask) lead.tasks.pull({ _id: removeTask });

  await lead.save();
  await lead.populate('owner', 'name company partnerCode commissionRate');
  return ok({ lead });
});

export const DELETE = handle(async (_req, { id }) => {
  const { lead } = await findLead(id);
  await lead.deleteOne();
  return ok({ ok: true });
});
