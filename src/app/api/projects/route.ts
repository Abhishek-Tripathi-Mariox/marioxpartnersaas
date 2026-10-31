import { handle, session, admin, body, ok, scope } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { projectSchema } from '@/lib/schemas';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { User } from '@/models/User';
import { Project } from '@/models/Project';

const LIST: ListSpec = {
  search: ['client', 'title', 'pm', 'contact', 'city'],
  sorts: ['closedAt', 'deal', 'client', 'updatedAt'],
  defaultSort: '-closedAt',
  filters: { stage: eq('stage', Number), owner: eq('owner') },
};

export const GET = handle(async req => {
  const s = await session();
  const { items, meta } = await runList(Project, scope(s), req, LIST, { path: 'owner', select: 'name company partnerCode commissionRate' });
  return ok({ projects: items, meta });
});

export const POST = handle(async req => {
  await admin();
  const data = await body(req, projectSchema);
  if (data.commissionRate == null) {
    const partner = await User.findById(data.owner).select('commissionRate').lean<{ commissionRate?: number }>();
    data.commissionRate = partner?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  }
  const project = await Project.create(data);
  return ok({ project }, 201);
});
