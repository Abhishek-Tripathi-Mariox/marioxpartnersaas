import { z } from 'zod';
import { handle, session, body, ok, HttpError } from '@/lib/api';
import { User } from '@/models/User';
import { publicUser } from '@/lib/users';

export const GET = handle(async () => {
  const s = await session();
  const user = await User.findById(s.sub);
  if (!user) throw new HttpError(401, 'Account not found');
  return ok({ user: publicUser(user) });
});

// Partners can edit their own contact and payout details, not role/rate/status.
const profile = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  industries: z.string().optional(),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
});

export const PATCH = handle(async req => {
  const s = await session();
  const user = await User.findByIdAndUpdate(s.sub, await body(req, profile), { new: true });
  return ok({ user: publicUser(user) });
});
