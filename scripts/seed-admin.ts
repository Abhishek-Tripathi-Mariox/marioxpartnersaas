/* Creates (or updates) ONE admin account. No demo data is touched.

   Usage:
     npm run seed:admin                                         uses ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env.local
     npm run seed:admin -- admin@company.com 'StrongPass@1'     email and password on the command line
     npm run seed:admin -- admin@company.com 'StrongPass@1' "Your Name"

   If the email already exists it is made an active admin and its password is reset
   (all its existing sessions are signed out). */
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { hashPassword } from '../src/lib/users';
import { User } from '../src/models/User';

async function main() {
  const [argEmail, argPassword, argName] = process.argv.slice(2);
  const email = (argEmail || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = argPassword || process.env.ADMIN_PASSWORD || '';

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Give a valid admin email (argument or ADMIN_EMAIL in .env.local)');
  if (password.length < 8) throw new Error('Admin password must be at least 8 characters (argument or ADMIN_PASSWORD in .env.local)');

  await connectDB();
  await User.init();

  const existing = await User.findOne({ email });
  // Keep an existing account's name unless a new one is given.
  const name = argName || process.env.ADMIN_NAME || existing?.name || 'Mariox Admin';
  if (existing && existing.role !== 'admin') {
    console.warn(`note: ${email} was a ${existing.role}; it is now an admin.`);
  }

  await User.updateOne(
    { email },
    {
      $set: { name, role: 'admin', status: 'active', passwordHash: await hashPassword(password), source: existing?.source ?? 'seed' },
      $inc: { sessionVersion: existing ? 1 : 0 },
    },
    { upsert: true },
  );

  console.log(`${existing ? 'updated' : 'created'} admin  ${email}`);
  console.log('sign in at', `${process.env.APP_URL || 'http://localhost:3000'}/login`);
  await mongoose.disconnect();
}

main().catch(async e => {
  console.error('error:', (e as Error).message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
