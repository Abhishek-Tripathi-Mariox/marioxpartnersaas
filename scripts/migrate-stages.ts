/* One-time migration: lead.stage used to be a number (0–6). It is now a stage key.
   Safe to re-run; only numeric stages are touched.
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
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
