import { handle, session, admin, body, ok } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { resourceSchema } from '@/lib/schemas';
import { Resource } from '@/models/Content';

const LIST: ListSpec = {
  search: ['title', 'industry', 'type', 'format'],
  sorts: ['title', 'type', 'createdAt'],
  defaultSort: 'type',
  filters: { type: eq('type') },
};

export const GET = handle(async req => {
  const s = await session();
  const { items, meta } = await runList(Resource, s.role === 'admin' ? {} : { hidden: { $ne: true } }, req, LIST);
  return ok({ items, meta });
});

export const POST = handle(async req => {
  await admin();
  return ok({ item: await Resource.create(await body(req, resourceSchema)) }, 201);
});
