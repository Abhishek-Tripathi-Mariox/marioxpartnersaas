// Gives every existing partner an ID in the new format, MX-P-243-1, MX-P-243-2, …, in the order they joined.
// Partners that already have a new-format ID keep it; numbering continues after the highest one.
//   npm run renumber-partners            → shows what would change (nothing is saved)
//   npm run renumber-partners -- --apply → saves the new IDs
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { PARTNER_CODE_PREFIX } from '../src/lib/constants';

const apply = process.argv.includes('--apply');
const re = new RegExp(`^${PARTNER_CODE_PREFIX}-(\\d+)$`);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const partners = await User.find({ role: 'partner' }).sort({ createdAt: 1, _id: 1 }).select('name email partnerCode createdAt').lean<{ _id: unknown; name: string; email: string; partnerCode?: string }[]>();
  let n = partners.reduce((m, p) => Math.max(m, Number(re.exec(p.partnerCode ?? '')?.[1] ?? 0)), 0);
  const changes = partners.filter(p => !re.test(p.partnerCode ?? '')).map(p => ({ p, code: `${PARTNER_CODE_PREFIX}-${++n}` }));
  if (!changes.length) console.log('All partners already use the new format.');
  for (const { p, code } of changes) console.log(`${(p.partnerCode ?? '—').padEnd(12)} → ${code.padEnd(14)} ${p.name} <${p.email}>`);
  if (apply && changes.length) {
    for (const { p, code } of changes) await User.updateOne({ _id: p._id }, { $set: { partnerCode: code } });
    console.log(`\nSaved ${changes.length} new partner ID(s).`);
  } else if (changes.length) console.log(`\nNothing saved. Run with --apply to save these ${changes.length} change(s).`);
  await mongoose.disconnect();
})();
