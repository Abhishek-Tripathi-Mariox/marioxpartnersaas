import { z } from 'zod';
import { handle, admin, body, ok } from '@/lib/api';
import { dayOf, sampleLeads } from '@/lib/acquisition-server';
import { AcqLead } from '@/models/AcqLead';

// POST /api/admin/acquisition/sample { action: 'load' | 'clear' } → add or remove the sample leads.
export const POST = handle(async req => {
  await admin();
  const { action, today } = await body(req, z.object({ action: z.enum(['load', 'clear']), today: z.string().optional() }));
  if (action === 'clear') return ok({ removed: (await AcqLead.deleteMany({ sample: true })).deletedCount });
  const have = new Set((await AcqLead.find({ sample: true }).select('code').lean<{ code: string }[]>()).map(l => l.code));
  // Inserted last-first so the newest-first list shows them in the listed order, like v12.
  const add = sampleLeads(dayOf(today)).filter(l => !have.has(l.code)).reverse();
  if (add.length) await AcqLead.insertMany(add);
  return ok({ added: add.length });
});
