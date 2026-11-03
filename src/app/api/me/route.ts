import { z } from 'zod';
import { handle, session, body, ok, HttpError } from '@/lib/api';
import { User } from '@/models/User';
import { profileFields, publicUser } from '@/lib/users';

export const GET = handle(async () => {
  const s = await session();
  const user = await User.findById(s.sub);
  if (!user) throw new HttpError(401, 'Account not found');
  return ok({ user: publicUser(user) });
});

// Partners can edit their own contact and payout details, not role/rate/status.
const profile = z.object(profileFields);

export const PATCH = handle(async req => {
  const s = await session();
  const user = await User.findByIdAndUpdate(s.sub, await body(req, profile), { new: true });
  return ok({ user: publicUser(user) });
});
