import crypto from 'node:crypto';
import { z } from 'zod';
import { handle, admin, body, ok, HttpError } from '@/lib/api';
import { User } from '@/models/User';
import { Lead } from '@/models/Lead';
import { Project } from '@/models/Project';
import { Booking, Scope, TechRequest, Ticket } from '@/models/Requests';
import { hashPassword, hashToken, publicUser } from '@/lib/users';

async function findUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

export const GET = handle(async (_req, { id }) => {
  await admin();
  return ok({ user: publicUser(await findUser(id)) });
});

const adminPatch = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  industries: z.string().optional(),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  status: z.enum(['invited', 'active', 'disabled']).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  password: z.string().min(8).optional(),   // admin sets a new password
  newInvite: z.boolean().optional(),        // admin generates a fresh set-password link
});

export const PATCH = handle(async (req, { id }) => {
  const me = await admin();
  const user = await findUser(id);
  const { password, newInvite, ...fields } = await body(req, adminPatch);
  if (id === me.sub && fields.status === 'disabled') throw new HttpError(400, "You can't suspend your own account");
  if (fields.email) fields.email = fields.email.toLowerCase();

  user.set(fields);
  if (password) {
    user.passwordHash = await hashPassword(password);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    if (user.status === 'invited') user.status = 'active';
  }

  let setPasswordUrl: string | null = null;
  if (newInvite) {
    const token = crypto.randomBytes(24).toString('hex');
    user.inviteToken = hashToken(token);
    user.inviteExpires = new Date(Date.now() + 7 * 864e5);
    setPasswordUrl = `${process.env.APP_URL || 'http://localhost:3000'}/set-password?token=${token}`;
  }

  await user.save();
  return ok({ user: publicUser(user), setPasswordUrl });
});

// Deletes a partner and their leads and requests. Refused while they have projects,
// because those hold payment and commission records.
export const DELETE = handle(async (_req, { id }) => {
  const me = await admin();
  if (id === me.sub) throw new HttpError(400, "You can't delete your own account");
  const user = await findUser(id);
  const projects = await Project.countDocuments({ owner: id });
  if (projects) throw new HttpError(409, `This partner has ${projects} project(s) with payment records. Suspend them instead, or delete the projects first.`);

  await Promise.all([Lead, Scope, Booking, TechRequest, Ticket].map(m => m.deleteMany({ owner: id })));
  await user.deleteOne();
  return ok({ ok: true });
});
