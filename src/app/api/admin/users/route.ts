import { handle, admin, body, ok } from '@/lib/api';
import { eq, runList, type ListSpec } from '@/lib/list';
import { User } from '@/models/User';
import { z } from 'zod';
import { createPartner, emailWelcome, newPartnerSchema, publicUser } from '@/lib/users';

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

// From the admin panel: the admin sets the password, and the partner is emailed the portal link
// with their email and password. `mail` says whether the email went out.
const adminNewPartner = newPartnerSchema.extend({ password: z.string().min(8, 'Password must be at least 8 characters') });

export const POST = handle(async req => {
  await admin();
  const input = await body(req, adminNewPartner);
  const r = await createPartner(input, 'admin');
  const mail = await emailWelcome(r.user as unknown as { name: string; email: string; partnerCode?: string }, input.password);
  return ok({ ...r, mail }, 201);
});
