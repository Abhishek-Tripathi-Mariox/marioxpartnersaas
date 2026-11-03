import { z } from 'zod';
import { handle, session, body, ok, scope, HttpError } from '@/lib/api';
import { LOST, WON, stageName } from '@/lib/pipeline';
import { leadSchema, today } from '@/lib/schemas';
import { getPipeline, stageKeys } from '@/lib/settings';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { R, notPast, zs } from '@/lib/validate';

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
  // Logged calls / notes need real words (not just a phone number); a follow-up can't be due in the past.
  addActivity: z.object({ type: z.enum(['call', 'meeting', 'email', 'note']), text: zs(R.words(3, 1000), true, 1000) }).optional(),
  addTask: z.object({ text: zs(R.words(2, 200), true, 200), due: zs(v => notPast(v, 'Due date'), false, 10) }).optional(),
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
  if (fields.expectedClose && fields.expectedClose !== lead.expectedClose) {
    const e = notPast(fields.expectedClose, 'Expected close');
    if (e) throw new HttpError(400, e);
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
