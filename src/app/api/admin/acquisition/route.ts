import { handle, admin, body, ok, HttpError } from '@/lib/api';
import { createSchema, findDuplicate, getLists, loadLead, newCode, startLead, toClient } from '@/lib/acquisition-server';
import { ST } from '@/lib/acquisition';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';
import { AcqLead } from '@/models/AcqLead';

// GET  /api/admin/acquisition → every acquisition lead, the editable lists and team emails (admin only).
// The page filters, groups and measures in the browser, like the original Mariox Control.
export const GET = handle(async () => {
  await admin();
  const [rows, { lists, emails }] = await Promise.all([
    AcqLead.find().sort({ _id: -1 }).populate('partner', 'name partnerCode status').lean<Parameters<typeof toClient>[0][]>(),
    getLists(),
  ]);
  return ok({ leads: rows.map(toClient), lists, emails, rate: Math.round(DEFAULT_COMMISSION_RATE * 100) });
});

// POST /api/admin/acquisition → add a lead. A same name + company lead is refused unless force is set.
export const POST = handle(async req => {
  await admin();
  const r = await body(req, createSchema);
  if (!r.force) {
    const dup = await findDuplicate(r.name, r.company);
    if (dup) throw new HttpError(409, `${dup.name} is already here (${ST[dup.status as keyof typeof ST]?.[0] ?? dup.status}). Save again to add anyway.`);
  }
  const doc = await AcqLead.create(startLead(r, await newCode()));
  return ok({ lead: await loadLead(String(doc._id)) }, 201);
});
