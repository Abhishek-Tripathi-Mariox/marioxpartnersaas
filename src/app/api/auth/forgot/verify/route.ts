import crypto from 'node:crypto';
import { z } from 'zod';
import { handle, body, ok, HttpError } from '@/lib/api';
import { hashToken } from '@/lib/users';
import { OTP_MAX_ATTEMPTS, RESET_TOKEN_MINUTES, otpHash, resetUser, same } from '@/lib/reset';

// Step 2 · POST /api/auth/forgot/verify { email, otp } → checks the code and returns a short-lived reset token.
// A code allows 5 wrong tries; after that a new code has to be requested.
export const POST = handle(async req => {
  const { email, otp } = await body(req, z.object({ email: z.string().trim().email(), otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') }));
  const user = await resetUser(email);

  if (!user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires.getTime() < Date.now()) {
    throw new HttpError(400, 'This code has expired. Ask for a new one.');
  }
  if ((user.resetOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong codes. Ask for a new one.');

  if (!same(otpHash(String(user._id), otp), user.resetOtpHash)) {
    user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
    await user.save();
    const left = OTP_MAX_ATTEMPTS - user.resetOtpAttempts;
    throw new HttpError(400, left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes. Ask for a new one.');
  }

  const token = crypto.randomBytes(24).toString('hex');
  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  user.resetTokenHash = hashToken(token);
  user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 6e4);
  await user.save();
  return ok({ token });
});
