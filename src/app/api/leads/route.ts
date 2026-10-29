import { handle, session, body, ok, scope, ownerFor, HttpError } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { leadSchema, today } from '@/lib/schemas';
import { getPipeline, stageKeys } from '@/lib/settings';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';

const LIST: ListSpec = {
  search: ['company', 'project', 'contact', 'email', 'phone', 'city'],
  sorts: ['updatedAt', 'createdAt', 'value', 'expectedClose', 'company'],
  defaultSort: '-updatedAt',
  filters: { stage: eq('stage'), source: eq('source'), priority: eq('priority') },
};

export const GET = handle(async req => {
  const s = await session();
  const owner = new URL(req.url).searchParams.get('owner');
  const base = { ...scope(s), ...(s.role === 'admin' && owner ? { owner } : {}) };
  const { items, meta } = await runList(Lead, base, req, LIST, { path: 'owner', select: 'name company partnerCode commissionRate' });
  return ok({ leads: items, meta });
});

export const POST = handle(async req => {
  const s = await session();
  const { owner: requested, ...data } = await body(req, leadSchema);
  const owner = ownerFor(s, requested);
  if (owner === s.sub && s.role === 'admin') throw new HttpError(400, 'Choose the partner this lead belongs to');
  if (s.role === 'admin' && !(await User.exists({ _id: owner, role: 'partner' }))) throw new HttpError(400, 'Unknown partner');

  const pipe = await getPipeline();
  const stage = data.stage ?? pipe.stages[0].key;
  if (!stageKeys(pipe).includes(stage)) throw new HttpError(400, 'Unknown stage');

  const lead = await Lead.create({
    ...data,
    stage,
    owner,
    activities: [{ type: 'note', text: s.role === 'admin' ? 'Lead created by Mariox' : 'Lead created', date: today() }],
  });
  return ok({ lead }, 201);
});
