import crypto from 'node:crypto';
import { z } from 'zod';
import { handle, admin, body, ok, HttpError } from '@/lib/api';
import { User } from '@/models/User';
import { Lead } from '@/models/Lead';
import { Project } from '@/models/Project';
import { Booking, Scope, TechRequest, Ticket } from '@/models/Requests';
import { FileRecord } from '@/models/File';
import { deleteFile } from '@/lib/files';
import { emailInvite, emailWelcome, hashPassword, hashToken, profileFields, publicUser } from '@/lib/users';

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
  ...profileFields,
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254).optional(),
  status: z.enum(['invited', 'active', 'disabled']).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  password: z.string().min(8).optional(),   // admin sets a new password
  newInvite: z.boolean().optional(),        // admin generates a fresh set-password link
  emailPassword: z.boolean().optional(),    // with password: email the partner their new login details
});

export const PATCH = handle(async (req, { id }) => {
  const me = await admin();
  const user = await findUser(id);
  const { password, newInvite, emailPassword, ...fields } = await body(req, adminPatch);
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
  // A fresh link is emailed straight away (it replaces the old one).
  const mail = setPasswordUrl ? await emailInvite(user, setPasswordUrl, true)
    : password && emailPassword ? await emailWelcome(user, password, true) : null;
  return ok({ user: publicUser(user), setPasswordUrl, mail });
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
  // Files they uploaded (scope attachments) are removed from S3 too; shared sales kit files belong to admins.
  const files = await FileRecord.find({ owner: id }).select('_id').lean<{ _id: unknown }[]>();
  for (const f of files) await deleteFile(String(f._id)).catch(() => {});
  await user.deleteOne();
  return ok({ ok: true });
});
