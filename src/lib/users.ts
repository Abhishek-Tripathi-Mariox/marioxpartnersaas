import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '@/models/User';
import { HttpError } from './api';
import { nextCode } from './codes';

export const newPartnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  industries: z.string().optional(),
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
