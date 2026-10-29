import { handle, admin, body, ok } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { User } from '@/models/User';
import { createPartner, newPartnerSchema, publicUser } from '@/lib/users';

const LIST: ListSpec = {
  search: ['name', 'email', 'company', 'partnerCode', 'phone', 'city'],
  sorts: ['createdAt', 'name', 'commissionRate', 'lastLoginAt', 'company'],
  defaultSort: '-createdAt',
  filters: { status: eq('status'), source: eq('source'), role: eq('role') },
};

export const GET = handle(async req => {
  await admin();
  const { items, meta } = await runList<Record<string, unknown> & { _id: unknown }>(User, {}, req, LIST);
  return ok({ users: items.map(publicUser), meta });
});

// Same as the main-site API, but from the admin panel.
export const POST = handle(async req => {
  await admin();
  return ok(await createPartner(await body(req, newPartnerSchema), 'admin'), 201);
});
