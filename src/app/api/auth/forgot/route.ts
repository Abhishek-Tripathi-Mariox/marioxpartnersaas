import { z } from 'zod';
import { handle, body, ok, HttpError } from '@/lib/api';
import { passwordOtp } from '@/lib/emails';
import { sendMail } from '@/lib/mail';
import { OTP_MINUTES, OTP_RESEND_SECONDS, newOtp, otpHash, resetUser } from '@/lib/reset';

// Step 1 · POST /api/auth/forgot { email } → checks the account exists and emails a 6-digit code.
export const POST = handle(async req => {
  const { email } = await body(req, z.object({ email: z.string().trim().email('Enter a valid email') }));
  const user = await resetUser(email);

  const wait = user.resetOtpSentAt ? Math.ceil(OTP_RESEND_SECONDS - (Date.now() - user.resetOtpSentAt.getTime()) / 1000) : 0;
  if (wait > 0) throw new HttpError(429, `Please wait ${wait} seconds before asking for a new code`);

  const code = newOtp();
  user.resetOtpHash = otpHash(String(user._id), code);
  user.resetOtpExpires = new Date(Date.now() + OTP_MINUTES * 6e4);
  user.resetOtpSentAt = new Date();
  user.resetOtpAttempts = 0;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  const mail = await sendMail({ to: user.email, ...passwordOtp({ name: user.name, code, minutes: OTP_MINUTES }) });
  if (!mail.sent) {
    user.resetOtpHash = undefined;
    user.resetOtpSentAt = undefined;
    await user.save();
    throw new HttpError(503, 'We could not send the email right now. Please try again in a minute.');
  }
  return ok({ sent: true, expiresIn: OTP_MINUTES * 60, resendIn: OTP_RESEND_SECONDS });
});
