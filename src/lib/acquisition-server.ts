import { z } from 'zod';
import { AcqLead } from '@/models/AcqLead';
import { Setting } from '@/models/Content';
import { User } from '@/models/User';
import { HttpError } from './api';
import { nextCode } from './codes';
import { createPartner } from './users';
import { ACQ_LIST_KEYS, HOME, MTYPE, OPEN, OPTS, add, fdt, isDay, t12, today as localToday, withDefaults, type AcqLead as Lead, type AcqLists, type Meet, type Step, type TeamEmails, type UpdateOpt } from './acquisition';

// Server side of partner acquisition. The browser sends its own "today" so dates match the team's day.
export const dayOf = (v: unknown) => (isDay(v) ? v : localToday());

const str = z.string().trim().max(500).optional().default('');
const day = z.string().regex(/^\d{4}-\d\d-\d\d$/);
const meetSchema = z.object({
  date: day.optional(),
  time: str,
  link: str,
  attendees: z.array(z.string()).max(20).optional().default([]),
  duration: z.number().int().min(5).max(480).optional().default(30),
  type: z.string().trim().max(60).optional().default(MTYPE[0]),
  prep: z.array(z.string().max(60)).max(20).optional().default([]),
  agenda: z.string().trim().max(500).optional().default(''),
});
type MeetIn = z.infer<typeof meetSchema>;
// A booked meeting as stored; `invited` resets whenever the meeting is (re)booked.
const toMeet = (m: MeetIn, fallbackDate: string, invited = false): Meet => ({ ...m, date: m.date || fallbackDate, time: m.time || '16:00', invited });
// "linkedin.com/in/x" → "https://linkedin.com/in/x"
const url = (u: string) => (u && !/^https?:\/\//i.test(u) ? 'https://' + u : u);

export const leadFields = z.object({
  name: z.string().trim().min(1, 'Add the name').max(120),
  company: str,
  source: str,
  channel: str,
  owner: str,
  contactedAt: day,
  phone: z.string().trim().max(40).optional().default(''),
  email: z.union([z.literal(''), z.string().trim().email('Email looks wrong')]).optional().default(''),
  linkedin: str,
  notes: z.string().max(4000).optional().default(''),
  services: z.array(z.string()).max(30).optional().default([]),
  temp: z.enum(['hot', 'warm', 'cold']).default('warm'),
  country: z.string().trim().max(60).optional().default(HOME),
  city: str,
});

// With a meeting date the lead goes straight to Meeting; without one it is a Lead with a next step.
export const createSchema = leadFields.extend({
  next: day.optional(),
  meet: meetSchema.optional(),
  force: z.boolean().optional(),
  today: day.optional(),
});

export const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('edit'), lead: leadFields, meet: meetSchema.optional(), today: day.optional() }),
  z.object({ action: z.literal('invited') }),
  z.object({ action: z.literal('onboard'), today: day.optional() }),
  z.object({ action: z.literal('temp'), temp: z.enum(['hot', 'warm', 'cold']) }),
  z.object({ action: z.literal('notes'), notes: z.string().max(4000) }),
  z.object({ action: z.literal('reopen'), today: day.optional() }),
  z.object({
    action: z.literal('update'),
    opt: z.enum(['meet', 'later', 'reject', 'done', 'convert', 'move', 'again']),
    today: day.optional(),
    temp: z.enum(['hot', 'warm', 'cold']).optional(),
    note: z.string().max(2000).optional().default(''),
    meet: meetSchema.optional(),
    why: z.enum(['missed', 'moved']).optional(),
    next: day.optional(),
    convertedAt: day.optional(),
    email: z.string().trim().optional(),
    commissionRate: z.number().min(0).max(1).optional(),
    reason: z.string().optional(),
  }),
]);
export type UpdateInput = Extract<z.infer<typeof patchSchema>, { action: 'update' }>;

export const listsSchema = z.object(Object.fromEntries(ACQ_LIST_KEYS.map(k => [k, z.array(z.string().trim().min(1).max(80)).min(1, 'Keep at least one').max(60)])) as Record<keyof AcqLists, z.ZodArray<z.ZodString>>);
export const emailsSchema = z.record(z.string().max(80), z.union([z.literal(''), z.string().trim().email('Team email looks wrong')]));

export async function getLists(): Promise<{ lists: AcqLists; emails: TeamEmails }> {
  const doc = await Setting.findOne({ key: 'portal' }).select('acquisition').lean<{ acquisition?: Partial<AcqLists> & { emails?: TeamEmails } }>();
  return { lists: withDefaults(doc?.acquisition), emails: { ...(doc?.acquisition?.emails ?? {}) } };
}

export async function saveLists(lists: AcqLists) {
  const clean = Object.fromEntries(ACQ_LIST_KEYS.map(k => [k, [...new Set(lists[k].map(v => v.trim()).filter(Boolean))]]));
  // Each list on its own, so the team emails stored next to them are kept.
  await Setting.updateOne({ key: 'portal' }, { $set: Object.fromEntries(Object.entries(clean).map(([k, v]) => [`acquisition.${k}`, v])) }, { upsert: true });
  return withDefaults(clean);
}

export async function saveEmails(emails: TeamEmails) {
  const clean = Object.fromEntries(Object.entries(emails).map(([k, v]) => [k, v.trim().toLowerCase()]).filter(([, v]) => v));
  await Setting.updateOne({ key: 'portal' }, { $set: { 'acquisition.emails': clean } }, { upsert: true });
  return clean as TeamEmails;
}

export const newCode = () => nextCode(AcqLead, 'code', 'P', 4, 1);

const sameLead = (name: string, company?: string) => ({
  name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  company: company ? new RegExp(`^${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : { $in: [null, ''] },
});
export const findDuplicate = (name: string, company?: string) => AcqLead.findOne(sameLead(name, company)).select('name status').lean<{ name: string; status: string }>();

// Converted → a partner account. Links an existing partner with the same email instead of failing.
async function makePartner(l: Lead, email: string, commissionRate?: number) {
  const existing = await User.findOne({ email: email.toLowerCase() }).select('role name partnerCode').lean<{ _id: unknown; role: string; name: string; partnerCode?: string }>();
  if (existing) {
    if (existing.role !== 'partner') throw new HttpError(409, `${email} belongs to an admin account`);
    return { id: String(existing._id), code: existing.partnerCode, setPasswordUrl: null, linked: true };
  }
  const r = await createPartner(
    { name: l.name, email, phone: l.phone || undefined, company: l.company || undefined, city: [l.city, l.country].filter(Boolean).join(', ') || undefined, commissionRate },
    'acquisition',
  );
  return { id: String(r.user.id), code: (r.user as { partnerCode?: string }).partnerCode, setPasswordUrl: r.setPasswordUrl, linked: false };
}

// The one update dialog: applies the picked option to the lead (same rules as v12).
export async function applyUpdate(l: Lead, u: UpdateInput) {
  const t = dayOf(u.today), k: UpdateOpt = u.opt, note = u.note.trim();
  if (!(OPTS[l.status] || []).some(o => o[0] === k)) throw new HttpError(400, 'That step is not available for this lead. Reopen it first.');
  if (u.temp) l.temp = u.temp;
  const steps: Step[] = l.steps;
  let partner: Awaited<ReturnType<typeof makePartner>> | null = null;

  if (k === 'meet' || k === 'move') {
    const was = l.meet?.date, missed = k === 'move' && u.why !== 'moved';
    l.meet = u.meet ? toMeet(u.meet, add(t, 1)) : { ...l.meet, date: add(t, 1), invited: false };
    l.status = 'meeting';
    steps.push({
      k: k === 'move' ? 'moved' : 'meeting',
      date: k === 'move' && was && was <= t ? was : t,
      missed,
      note: [missed ? 'Missed: they didn’t join' : k === 'move' ? 'Rescheduled' : '', `New meeting ${fdt(l.meet.date)}${l.meet.time ? ' ' + l.meet.time : ''}`, l.meet.attendees?.length ? 'Attending: ' + l.meet.attendees.join(', ') : '', note].filter(Boolean).join(' · '),
    });
  }
  if (k === 'done' || k === 'again' || k === 'later') {
    const nx = u.next || add(t, 3);
    if (k === 'done') steps.push({ k: 'done', date: l.meet?.date && l.meet.date <= t ? l.meet.date : t, note });
    else if (k === 'again' || note) steps.push({ k: 'followup', date: t, note });
    l.status = k === 'later' ? 'contacted' : 'followup';
    l.next = nx;
  }
  if (k === 'convert') {
    const email = (u.email || l.email || '').trim();
    if (!z.string().email().safeParse(email).success) throw new HttpError(400, 'Add their email: it is their partner login');
    const wasMeet = l.status === 'meeting', fromContacted = l.status === 'contacted';
    l.email = email;
    l.convertedAt = u.convertedAt || t;
    partner = await makePartner(l, email, u.commissionRate);
    l.status = 'converted';
    l.next = '';
    // Counts as a meeting held (v12), except when they signed straight from Contacted without one.
    if (wasMeet || (!fromContacted && !steps.some(s => s.k === 'done'))) steps.push({ k: 'done', date: l.convertedAt, note: '' });
    steps.push({ k: 'converted', date: l.convertedAt, note });
    l.partner = partner.id;
  }
  if (k === 'reject') {
    if (!u.reason) throw new HttpError(400, 'Pick a reason. It shows in “Why rejected”');
    l.reason = u.reason;
    l.rejectedAt = t;
    l.status = 'rejected';
    l.next = '';
    steps.push({ k: 'rejected', date: t, reason: l.reason, note });
  }
  l.steps = steps;
  return partner;
}

// First steps for a newly added lead: with a meeting date it starts in Meeting, otherwise as a Lead.
export function startLead(r: z.infer<typeof createSchema>, code: string) {
  const t = dayOf(r.today);
  const { next, meet, force, today, ...fields } = r;
  void force; void today;
  const l: Omit<Lead, '_id'> = { ...fields, linkedin: url(fields.linkedin), code, status: 'contacted', steps: [{ k: 'contacted', date: r.contactedAt, note: `Contacted on ${r.channel}` }], meet: { duration: 30, attendees: [] } };
  if (meet?.date) {
    l.status = 'meeting';
    l.meet = toMeet({ ...meet, attendees: meet.attendees.length ? meet.attendees : [r.owner].filter(Boolean) }, add(t, 1));
    l.steps.push({ k: 'meeting', date: t, note: `${l.meet.type} on ${fdt(l.meet.date)} ${t12(l.meet.time)}` });
  } else l.next = next || add(t, 1);
  return l;
}

// Edit details. An open lead given a meeting date moves to Meeting; a changed date or time needs a new invite.
export function editLead(l: Lead, fields: z.infer<typeof leadFields>, meet: MeetIn | undefined, t: string) {
  Object.assign(l, { ...fields, linkedin: url(fields.linkedin) });
  const c = l.steps.find(s => s.k === 'contacted');
  if (c) c.date = fields.contactedAt;
  if (!meet?.date || !OPEN.includes(l.status)) return false;
  const changed = l.status !== 'meeting' || l.meet.date !== meet.date || l.meet.time !== meet.time;
  l.meet = toMeet({ ...meet, attendees: meet.attendees.length ? meet.attendees : [l.owner].filter(Boolean) as string[] }, meet.date, changed ? false : !!l.meet.invited);
  if (l.status !== 'meeting') {
    l.status = 'meeting';
    l.steps.push({ k: 'meeting', date: t, note: `${l.meet.type} on ${fdt(l.meet.date)} ${t12(l.meet.time)}` });
  }
  return changed;
}

// Converted → onboarding (the partner account was created when they converted).
export function startOnboarding(l: Lead, t: string) {
  if (l.status !== 'converted') throw new HttpError(400, 'Only converted leads can start onboarding');
  l.status = 'onboarding';
  l.onboardAt = t;
  l.steps.push({ k: 'onboarding', date: t, note: 'Onboarding started in Partners' });
}

// Sample leads so the page has something to show before the team adds real ones.
export function sampleLeads(t: string): Omit<Lead, '_id'>[] {
  const d = (n: number) => add(t, n);
  type X = Partial<Lead>;
  const L = (code: string, name: string, company: string, source: string, channel: string, owner: string, contactedAt: string, status: Lead['status'], x: X = {}): Omit<Lead, '_id'> => ({
    code, name, company, source, channel, owner, contactedAt, status, steps: [{ k: 'contacted', date: contactedAt, note: `Contacted on ${channel}` }], meet: {}, services: [], temp: 'warm', sample: true, ...x,
  });
  const leads = [
    L('P-S01', 'Ananya Mehta', 'BrightPath Consulting', 'LinkedIn', 'LinkedIn', 'Ritika', d(-26), 'converted', { convertedAt: d(-12), phone: '+91 98450 11223', linkedin: 'https://www.linkedin.com/in/ananya-mehta' }),
    L('P-S02', 'Rohan Kapoor', 'Kapoor Digital', 'Job portal', 'Email', 'Aman', d(-20), 'converted', { convertedAt: d(-3), email: 'rohan@kapoordigital.in' }),
    L('P-S03', 'Priya Nair', 'Nair Tech Advisors', 'LinkedIn', 'LinkedIn', 'Ritika', d(-12), 'followup', { next: d(-1), phone: '+91 99200 44110' }),
    L('P-S04', 'James Carter', 'Carter & Co', 'Referral', 'Email', 'Neha', d(-10), 'followup', { next: d(0) }),
    L('P-S05', 'Meera Iyer', 'Iyer Ventures', 'LinkedIn', 'LinkedIn', 'Aman', d(-6), 'meeting', { meet: { date: d(-1), time: '10:00', link: 'https://meet.google.com/mee-raiy-er1' } }),
    L('P-S06', 'Daniel Weber', 'Weber Solutions', 'Job portal', 'Email', 'Ritika', d(-3), 'meeting', { meet: { date: d(0), time: '17:30', link: 'https://zoom.us/j/5512345' } }),
    L('P-S07', 'Sarah Thompson', 'Northside Partners', 'LinkedIn', 'LinkedIn', 'Neha', d(-2), 'meeting', { meet: { date: d(3), time: '16:00', link: 'https://teams.microsoft.com/l/meetup-join/sample' } }),
    L('P-S08', 'Arjun Reddy', 'Reddy Growth Labs', 'Website', 'WhatsApp', 'Aman', d(-1), 'contacted', { next: d(1), phone: '+91 98490 77881' }),
    L('P-S09', 'Kiran Shah', 'Shah Ventures', 'Event', 'Call', 'Neha', d(0), 'contacted', { next: d(0) }),
    L('P-S10', 'Fatima Khan', 'Khan Business Network', 'LinkedIn', 'LinkedIn', 'Ritika', d(-18), 'rejected', { rejectedAt: d(-9), reason: 'Commission / terms' }),
    L('P-S11', 'Liam O\'Brien', 'Harbour Advisory', 'Referral', 'Email', 'Neha', d(-15), 'rejected', { rejectedAt: d(-4), reason: 'No response' }),
    L('P-S12', 'Vikram Joshi', 'Joshi & Associates', 'LinkedIn', 'LinkedIn', 'Aman', d(-9), 'rejected', { rejectedAt: d(-5), reason: 'Not interested' }),
  ];
  const H: Record<string, [Step['k'], number, string?][]> = {
    'P-S01': [['meeting', -22, 'Meeting arranged'], ['done', -20, 'Runs a 12-person advisory; 3 clients need apps'], ['followup', -15, 'Sent the agreement']],
    'P-S02': [['meeting', -16], ['done', -14, 'Asked for payout examples'], ['followup', -8, 'Reviewing with co-founder']],
    'P-S03': [['meeting', -9], ['done', -8, 'Strong AI network in Mumbai. Wants case studies.']],
    'P-S04': [['meeting', -7], ['done', -6], ['followup', -3, 'Reviewing the agreement with his partner']],
    'P-S05': [['meeting', -5]], 'P-S06': [['meeting', -2]], 'P-S07': [['meeting', -1]],
    'P-S10': [['meeting', -14], ['done', -12, 'Wanted a fixed retainer']],
    'P-S11': [['meeting', -11], ['done', -10], ['followup', -7, 'No reply to 3 messages']],
  };
  const EX: Record<string, [string[], Lead['temp'], string[]]> = {
    'P-S01': [['IT consulting', 'Business consulting'], 'hot', ['Ritika', 'Karan']], 'P-S02': [['Digital marketing agency'], 'hot', ['Aman']], 'P-S03': [['IT consulting'], 'hot', ['Ritika', 'Neha']],
    'P-S04': [['Business consulting'], 'warm', ['Neha']], 'P-S05': [['Freelance developer'], 'warm', ['Aman', 'Karan']], 'P-S06': [['Recruitment / staffing'], 'hot', ['Ritika', 'Aman']],
    'P-S07': [['Digital marketing agency', 'Sales consultant'], 'warm', ['Neha', 'Karan']], 'P-S08': [['CA / accounting'], 'cold', []], 'P-S09': [['Real estate'], 'warm', []],
    'P-S10': [['Business consulting'], 'cold', ['Ritika']], 'P-S11': [['IT consulting'], 'warm', ['Neha']], 'P-S12': [['Freelance developer'], 'cold', ['Aman']],
  };
  const LOC: Record<string, [string, string]> = {
    'P-S01': ['Bengaluru', 'India'], 'P-S02': ['Delhi', 'India'], 'P-S03': ['Dubai', 'UAE'], 'P-S04': ['New York', 'USA'], 'P-S05': ['Singapore', 'Singapore'], 'P-S06': ['Dubai', 'UAE'],
    'P-S07': ['Toronto', 'Canada'], 'P-S08': ['Hyderabad', 'India'], 'P-S09': ['Riyadh', 'Saudi Arabia'], 'P-S10': ['Abu Dhabi', 'UAE'], 'P-S11': ['London', 'UK'], 'P-S12': ['Pune', 'India'],
  };
  const PH: Record<string, string> = { 'P-S03': '+971 50 412 7788', 'P-S04': '+1 646 555 0142', 'P-S05': '+65 9123 4567', 'P-S06': '+971 55 290 1144', 'P-S07': '+1 416 555 0199', 'P-S09': '+966 50 123 4567', 'P-S12': '+91 98220 61834', 'P-S02': '+91 98110 22334' };
  const now = new Date();
  now.setMinutes(now.getMinutes() + 95);
  for (const l of leads) {
    const [services, temp, attendees] = EX[l.code];
    l.services = services;
    l.temp = temp;
    l.meet = { duration: 30, ...l.meet, attendees };
    [l.city, l.country] = LOC[l.code];
    if (!l.phone && PH[l.code]) l.phone = PH[l.code];
    if (l.channel === 'LinkedIn') l.channel = 'WhatsApp';
    if (l.code === 'P-S06') l.meet.time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (l.code === 'P-S11') l.steps.push({ k: 'moved', date: d(-12), missed: true, note: 'Did not join' });
    if (l.code === 'P-S04') l.steps.push({ k: 'moved', date: d(-8), missed: true, note: 'Did not join, rebooked' });
    for (const [k, n, note] of H[l.code] || []) l.steps.push({ k, date: d(n), note: note || '' });
    if (l.status === 'converted') l.steps.push({ k: 'converted', date: l.convertedAt!, note: 'Signed' });
    if (l.status === 'rejected') l.steps.push({ k: 'rejected', date: l.rejectedAt!, reason: l.reason });
  }
  const hm = (m: number) => { const x = new Date(Date.now() + m * 6e4); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
  const o = leads.find(l => l.code === 'P-S01')!;
  o.status = 'onboarding';
  o.onboardAt = d(-10);
  o.steps.push({ k: 'onboarding', date: d(-10), note: 'Agreement signed, KYC requested' });
  const MT: Record<string, [string, string[], string]> = {
    'P-S05': ['Intro call', [], ''],
    'P-S06': ['Demo', ['Product demo', 'Client PPT'], 'Walk through the partner model and two live client projects'],
    'P-S07': ['Client presentation', ['Client PPT', 'Commission plan'], 'Present to their 3 partners'],
  };
  for (const l of leads) { const m = MT[l.code]; if (m) Object.assign(l.meet, { type: m[0], prep: m[1], agenda: m[2], invited: l.code !== 'P-S05' }); }
  leads.push({
    code: 'P-S13', name: 'Omar Haddad', company: 'Haddad Consulting', source: 'LinkedIn', channel: 'WhatsApp', owner: 'Karan', contactedAt: d(-1), status: 'meeting', sample: true,
    phone: '+971 52 600 3344', email: 'omar@haddadconsulting.ae', linkedin: 'https://www.linkedin.com/in/omar-haddad', city: 'Dubai', country: 'UAE', services: ['Business consulting'], temp: 'hot',
    meet: { date: d(0), time: hm(25), duration: 30, link: 'https://meet.google.com/abc-omar-hdd', type: 'Intro call', attendees: ['Karan', 'Neha'], prep: ['Commission plan'], agenda: 'Understand his client base in the GCC', invited: true },
    steps: [{ k: 'contacted', date: d(-1), note: 'Chatted on LinkedIn, moved to WhatsApp' }, { k: 'meeting', date: d(-1), note: 'Intro call booked' }],
  });
  return leads;
}

// Lead as the page expects it: string ids, converted partner populated.
type Raw = Record<string, unknown> & { _id: unknown; partner?: unknown };
export function toClient(r: Raw) {
  const { __v, createdAt, updatedAt, ...rest } = r;
  void __v; void createdAt; void updatedAt;
  const p = r.partner as { _id?: unknown; name?: string; partnerCode?: string; status?: string } | null | undefined;
  return { ...rest, _id: String(r._id), partner: p && typeof p === 'object' && 'name' in p ? { _id: String(p._id), name: p.name, partnerCode: p.partnerCode, status: p.status } : p ? String(p) : null } as unknown as Lead;
}
export async function loadLead(id: string) {
  const r = await AcqLead.findById(id).populate('partner', 'name partnerCode status').lean<Raw>().catch(() => null);
  if (!r) throw new HttpError(404, 'Lead not found');
  return toClient(r);
}
