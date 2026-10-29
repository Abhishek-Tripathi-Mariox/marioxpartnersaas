import { handle, session, body, ok, scope } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { createDefaults, requestKind } from '@/lib/requests';

// Searchable fields differ per request type.
const SEARCH: Record<string, string[]> = {
  scope: ['client', 'project', 'needs', 'comment'],
  booking: ['client', 'office', 'purpose', 'team'],
  tech: ['client', 'type', 'assignee', 'context'],
  ticket: ['code', 'subject', 'category', 'body'],
};

// GET  /api/requests/{scope|booking|tech|ticket}  list (own for partners, all for admins)
// POST /api/requests/{kind}                        partner raises a new request
export const GET = handle(async (req, { kind }) => {
  const s = await session();
  const { model } = requestKind(kind);
  const spec: ListSpec = {
    search: SEARCH[kind],
    sorts: ['createdAt', 'updatedAt', 'status', 'date'],
    defaultSort: '-createdAt',
    filters: { status: eq('status'), ...(s.role === 'admin' ? { owner: eq('owner') } : {}) },
  };
  const { items, meta } = await runList(model, scope(s), req, spec, { path: 'owner', select: 'name company partnerCode' });
  return ok({ items, meta });
});

export const POST = handle(async (req, { kind }) => {
  const s = await session();
  const { model, create } = requestKind(kind);
  const data = await body(req, create);
  const item = await model.create({ ...data, ...(await createDefaults(kind, data)), owner: s.sub });
  return ok({ item }, 201);
});
