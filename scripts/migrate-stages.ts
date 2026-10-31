/* Data migrations. Safe to re-run; each step only touches records that still need it.
   1. lead.stage used to be a number (0–6); it is now a stage key.
   2. projects get their own commissionRate, locked to the partner's current rate.
   Usage: npm run migrate */
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';

const KEYS = ['lead', 'contacted', 'meeting', 'proposal', 'negotiation', 'won', 'lost'];

async function main() {
  await connectDB();
  const leads = mongoose.connection.collection('leads');
  let changed = 0;
  for (const [n, key] of KEYS.entries()) {
    const res = await leads.updateMany({ stage: n }, { $set: { stage: key } });
    changed += res.modifiedCount;
  }
  console.log(`migrated ${changed} lead(s)`);

  // Lock each older project's commission to its partner's current rate.
  const users = mongoose.connection.collection('users');
  const projects = mongoose.connection.collection('projects');
  let locked = 0;
  for await (const pr of projects.find({ commissionRate: { $exists: false } })) {
    const partner = await users.findOne({ _id: pr.owner }, { projection: { commissionRate: 1 } });
    await projects.updateOne({ _id: pr._id }, { $set: { commissionRate: partner?.commissionRate ?? 0.5 } });
    locked++;
  }
  console.log(`locked commission rate on ${locked} project(s)`);
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
