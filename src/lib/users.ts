import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '@/models/User';
import { HttpError } from './api';
import { nextCode } from './codes';
import { R, zPhone, zs, zUpper } from './validate';
import { partnerInvite, partnerWelcome } from './emails';
import { sendMail } from './mail';

// Also used by the main-site API (POST /api/v1/users), so the same rules apply there.
export const newPartnerSchema = z.object({
  name: zs(R.person, true, 80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  phone: zPhone(),
  company: zs(R.company, false, 120),
  city: zs(R.city, false, 60),
  industries: zs(R.tags, false, 200),
  externalId: z.string().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
});
export type NewPartner = z.infer<typeof newPartnerSchema>;

export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
export const hashPassword = (p: string) => bcrypt.hash(p, 10);

// Creates a partner. Without a password the account is "invited" and gets a
// one-time link to set one; with a password it is active straight away.
export async function createPartner(input: NewPartner, source: string) {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) throw new HttpError(409, 'A user with this email already exists');

  const { password, ...rest } = input;
  const token = password ? null : crypto.randomBytes(24).toString('hex');
  const user = await User.create({
    ...rest,
    email,
    role: 'partner',
    source,
    partnerCode: await nextCode(User, 'partnerCode', 'MXP', 4, 1),
    status: password ? 'active' : 'invited',
    passwordHash: password ? await hashPassword(password) : undefined,
    inviteToken: token ? hashToken(token) : undefined,
    inviteExpires: token ? new Date(Date.now() + 7 * 864e5) : undefined,
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return {
    user: publicUser(user),
    setPasswordUrl: token ? `${appUrl}/set-password?token=${token}` : null,
  };
}

export function publicUser(u: Record<string, unknown> & { _id: unknown; toObject?: () => Record<string, unknown> }) {
  const o = u.toObject ? u.toObject() : u;
  const { passwordHash, inviteToken, inviteExpires, __v, ...rest } = o as Record<string, unknown>;
  void passwordHash; void inviteToken; void inviteExpires; void __v;
  return { ...rest, id: String(o._id) };
}

// Emails the set-password link. Returns whether it went out; never throws.
export function emailInvite(user: { name: string; email: string; partnerCode?: string }, url: string, again = false) {
  return sendMail({ to: user.email, ...partnerInvite({ name: user.name, email: user.email, partnerCode: user.partnerCode, url, again }) });
}

// Emails the portal link with the email and password the admin set. Returns whether it went out; never throws.
export function emailWelcome(user: { name: string; email: string; partnerCode?: string }, password: string, reset = false) {
  const loginUrl = `${(process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')}/login`;
  return sendMail({ to: user.email, ...partnerWelcome({ name: user.name, email: user.email, partnerCode: user.partnerCode, password, loginUrl, reset }) });
}

// Contact and payout details a partner (or an admin for them) can edit. Codes are stored in capitals.
export const profileFields = {
  name: zs(R.person, true, 80).optional(),
  phone: zPhone(),
  company: zs(R.company, false, 120),
  city: zs(R.city, false, 60),
  industries: zs(R.tags, false, 200),
  pan: zUpper(R.pan),
  gstin: zUpper(R.gstin),
  bankAccount: zs(R.bankAccount, false, 18),
  ifsc: zUpper(R.ifsc),
};
