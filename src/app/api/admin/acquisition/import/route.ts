import { z } from 'zod';
import { handle, admin, body, ok } from '@/lib/api';
import { HOME, add, fdt, isUrl, today as localToday } from '@/lib/acquisition';
import { findDuplicate, getLists, newCode } from '@/lib/acquisition-server';
import { AcqLead } from '@/models/AcqLead';

const s = z.string().trim().max(500).optional().default('');
const day = z.union([z.literal(''), z.string().regex(/^\d{4}-\d\d-\d\d$/)]).optional().default('');
const rowSchema = z.object({ name: z.string().trim().min(1).max(120), company: s, source: s, channel: s, owner: s, email: s, phone: s, linkedin: s, notes: s, country: s, city: s, cdate: day, mdate: day, mtime: s, mlink: s });

// POST /api/admin/acquisition/import { rows, today } → rows mapped from a CSV / Excel file in the browser.
// Same name + company as an existing lead is skipped. Rows with a meeting date start in Meeting.
export const POST = handle(async req => {
  await admin();
  const { rows, today } = await body(req, z.object({ rows: z.array(rowSchema).max(2000), today: z.string().optional() }));
  const t = today && /^\d{4}-\d\d-\d\d$/.test(today) ? today : localToday();
  const team = (await getLists()).lists.team;
  const next = Number(/\d+$/.exec(await newCode())![0]);
  const docs = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.name.toLowerCase()}|${r.company.toLowerCase()}`;
    if (seen.has(key) || (await findDuplicate(r.name, r.company))) continue;
    seen.add(key);
    const cd = r.cdate || t, md = r.mdate;
    docs.push({
      code: `P-${String(next + docs.length).padStart(4, '0')}`,
      name: r.name, company: r.company, source: r.source || 'LinkedIn', channel: r.channel || 'LinkedIn', owner: r.owner || team[0], email: r.email, phone: r.phone, linkedin: r.linkedin, notes: r.notes,
      country: r.country || HOME, city: r.city, services: [], temp: 'warm', contactedAt: cd,
      status: md ? 'meeting' : 'contacted',
      meet: md ? { date: md, time: r.mtime, link: isUrl(r.mlink) ? r.mlink : '', duration: 30, attendees: [] } : { duration: 30, attendees: [] },
      next: md ? '' : add(t, 1),
      steps: [{ k: 'contacted', date: cd }, ...(md ? [{ k: 'meeting', date: cd, note: 'Imported with meeting ' + fdt(md) }] : [])],
    });
  }
  if (docs.length) await AcqLead.insertMany(docs);
  return ok({ imported: docs.length, skipped: rows.length - docs.length });
});
