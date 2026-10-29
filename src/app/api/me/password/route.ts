import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { handle, session, body, ok, HttpError } from '@/lib/api';
import { setSessionCookie } from '@/lib/cookie';
import { hashPassword } from '@/lib/users';
import { User } from '@/models/User';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
});

// Change own password. Every other signed-in device is signed out; this one stays signed in.
export const POST = handle(async req => {
  const s = await session();
  const { currentPassword, newPassword } = await body(req, schema);
  const user = await User.findById(s.sub).select('+passwordHash');
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Current password is wrong');
  }
  if (currentPassword === newPassword) throw new HttpError(400, 'Choose a password you have not used just now');

  user.passwordHash = await hashPassword(newPassword);
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();
  await setSessionCookie({ sub: s.sub, role: user.role, name: user.name, v: user.sessionVersion });
  return ok({ ok: true });
});
