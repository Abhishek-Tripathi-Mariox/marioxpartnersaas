import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { handle, body, ok, HttpError } from '@/lib/api';
import { setSessionCookie } from '@/lib/cookie';
import { User } from '@/models/User';
import { publicUser } from '@/lib/users';

export const POST = handle(async req => {
  const { email, password } = await body(req, z.object({ email: z.string().email(), password: z.string().min(1) }));
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  if (user.status === 'disabled') throw new HttpError(403, 'This account is disabled');

  user.lastLoginAt = new Date();
  await user.save();
  await setSessionCookie({ sub: String(user._id), role: user.role, name: user.name, v: user.sessionVersion ?? 0 });
  return ok({ user: publicUser(user) });
});
