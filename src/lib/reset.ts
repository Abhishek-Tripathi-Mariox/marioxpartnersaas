import crypto from 'node:crypto';
import { HttpError } from './api';
import { hashToken } from './users';
import { User } from '@/models/User';

// Forgot password, in three steps: request a code by email → verify the code → set the new password.
export const OTP_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const RESET_TOKEN_MINUTES = 15;

const SECRET_FIELDS = '+resetOtpHash +resetOtpExpires +resetOtpSentAt +resetOtpAttempts +resetTokenHash +resetTokenExpires';

// The code is tied to the account, so the same digits are useless for anyone else.
export const otpHash = (userId: string, code: string) => hashToken(`${userId}:${code}`);
export const newOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

export const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// The account the reset is for: must exist and not be suspended.
export async function resetUser(email: string) {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(SECRET_FIELDS);
  if (!user) throw new HttpError(404, 'No account found with this email');
  if (user.status === 'disabled') throw new HttpError(403, 'This account is suspended. Contact Mariox.');
  return user;
}
