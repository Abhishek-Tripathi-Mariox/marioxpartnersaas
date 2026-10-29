import { z } from 'zod';
import { handle, body, ok, HttpError } from '@/lib/api';
import { User } from '@/models/User';
import { hashPassword, hashToken, publicUser } from '@/lib/users';
import { setSessionCookie } from '@/lib/cookie';

// Completes an invite: the token comes from the setPasswordUrl returned when the user was created.
export const POST = handle(async req => {
  const { token, password } = await body(req, z.object({ token: z.string().min(10), password: z.string().min(8) }));
  const user = await User.findOne({ inviteToken: hashToken(token), inviteExpires: { $gt: new Date() } });
  if (!user) throw new HttpError(400, 'This link is invalid or has expired');

  user.passwordHash = await hashPassword(password);
  user.inviteToken = undefined;
  user.inviteExpires = undefined;
  if (user.status === 'invited') user.status = 'active';
  await user.save();
  await setSessionCookie({ sub: String(user._id), role: user.role, name: user.name, v: user.sessionVersion ?? 0 });
  return ok({ user: publicUser(user) });
});
