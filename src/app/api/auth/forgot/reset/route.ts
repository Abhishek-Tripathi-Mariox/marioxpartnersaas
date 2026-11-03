import { z } from 'zod';
import { handle, body, ok, HttpError } from '@/lib/api';
import { hashPassword, hashToken } from '@/lib/users';
import { resetUser, same } from '@/lib/reset';

// Step 3 · POST /api/auth/forgot/reset { email, token, password } → sets the new password.
// Signs the account out everywhere; the partner then signs in with the new password.
export const POST = handle(async req => {
  const { email, token, password } = await body(req, z.object({
    email: z.string().trim().email(),
    token: z.string().min(10),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }));
  const user = await resetUser(email);
  if (!user.resetTokenHash || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now() || !same(hashToken(token), user.resetTokenHash)) {
    throw new HttpError(400, 'This reset has expired. Start again.');
  }

  user.passwordHash = await hashPassword(password);
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  if (user.status === 'invited') user.status = 'active';
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.resetOtpSentAt = undefined;
  user.inviteToken = undefined;
  user.inviteExpires = undefined;
  await user.save();
  return ok({ ok: true });
});
