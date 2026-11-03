import { z } from 'zod';
import { R, slotError, zMoney, zPhone, zs } from './validate';

export const today = () => new Date().toISOString().slice(0, 10);

const str = z.string().optional();
const num = z.coerce.number().min(0).optional();

// Text fields use the shared rules in lib/validate.ts (the forms check the same rules before sending).
const day = zs(R.date, false, 10);
export const leadSchema = z.object({
  company: zs(R.company, true, 120),
  project: zs(R.words(2, 120), false, 120),
  value: zMoney('Estimated value').optional(),
  contact: zs(R.person, false, 80),
  phone: zPhone(),
  email: zs(R.email, false, 254),
  city: zs(R.city, false, 60),
  source: zs(undefined, false, 60),
  priority: zs(undefined, false, 40),
  stage: z.string().min(1).optional(),   // checked against the pipeline config in the route
  lostReason: zs(undefined, false, 120),
  expectedClose: day,
  owner: str,                            // admins only: create for / reassign to a partner
});

const tone = z.enum(['bad', 'warn', 'info', 'good', 'violet', 'fire', 'mute']);
export const pipelineSchema = z.object({
  stages: z.array(z.object({ key: z.string().optional(), name: z.string().min(1), prob: z.coerce.number().min(0).max(100) })).min(1),
  sources: z.array(z.string().min(1)).min(1),
  priorities: z.array(z.object({ name: z.string().min(1), tone })).min(1),
  lostReasons: z.array(z.string().min(1)).min(1),
});

export const paymentSchema = z.object({
  _id: str,
  label: zs(R.words(2, 80), true, 80),
  amount: zMoney('Milestone amount'),
  due: day,
  status: z.enum(['upcoming', 'due', 'received']).default('upcoming'),
  releasedAt: day,
  utr: zs(v => (!v || /^[A-Za-z0-9]{6,30}$/.test(v) ? null : 'UTR is 6–30 letters or digits'), false, 30),
});

export const projectSchema = z.object({
  owner: z.string().min(1),
  lead: str,
  client: zs(R.company, true, 120),
  contact: zPhone(),
  city: zs(R.city, false, 60),
  title: zs(R.title, true, 120),
  deal: zMoney('Deal value').optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
  closedAt: day,
  stage: z.number().int().min(0).max(4).optional(),
  pm: zs(R.person, false, 80),
  update: zs(R.words(3), false, 2000),
  milestones: z.array(z.string()).optional(),
  payments: z.array(paymentSchema).optional(),
});

// What a partner may send when creating each request type.
export const requestCreate = {
  scope: z.object({
    client: zs(R.company, true, 120),
    project: zs(R.title, true, 120),
    needs: zs(R.words(5), false, 4000),
    lines: z.array(z.object({ name: zs(R.words(2, 120), true, 120), amount: zMoney('Line amount') })).max(50).default([]),
    // From POST /api/uploads; the route checks each file belongs to the submitter.
    attachments: z.array(z.object({ fileId: z.string(), name: z.string(), size: z.number(), type: z.string() })).max(10).default([]),
  }),
  // A visit or expert call can't be booked for a time that has already gone by (IST).
  booking: z.object({
    client: zs(R.company, true, 120),
    office: str,
    date: zs(R.date, true, 10),
    time: zs(R.time, true, 5),
    purpose: str,
    team: str,
    guests: z.coerce.number().int('Guests must be a whole number').min(1, 'At least 1 guest').max(20, 'Up to 20 guests').optional(),
  }).superRefine((v, ctx) => { const e = slotError(v.date ?? '', v.time ?? '', 'That slot'); if (e) ctx.addIssue({ code: 'custom', path: ['time'], message: e }); }),
  tech: z.object({
    type: z.string().min(1),
    client: zs(R.company, true, 120),
    date: zs(R.date, true, 10),
    time: zs(R.time, false, 5),
    duration: str,
    mode: str,
    link: zs(R.url, false, 500),
    context: zs(R.words(5), false, 4000),
  }).superRefine((v, ctx) => { const e = slotError(v.date ?? '', v.time ?? ''); if (e) ctx.addIssue({ code: 'custom', path: ['time'], message: e }); }),
  ticket: z.object({
    subject: zs(R.words(5, 150), true, 150),
    category: str,
    body: zs(R.words(5), false, 4000),
    escalate: z.boolean().optional(),
  }),
};

// What an admin may change on a request.
export const requestReview = z.object({
  status: z.string().min(1).optional(),
  comment: zs(R.words(3), false, 4000),
  assignee: zs(R.person, false, 80),
  approved: zMoney('Approved amount').optional(),
  date: day,
  time: zs(R.time, false, 5),
  link: zs(R.url, false, 500),
});
// When Mariox reschedules a visit or call, the new slot must still be ahead.
export const reviewSlotError = (r: z.infer<typeof requestReview>) => (r.date ? slotError(r.date, r.time ?? '', 'That slot') : null);

export const resourceSchema = z.object({
  type: z.string().min(1),
  industry: zs(R.tags, false, 200),
  title: zs(R.title, true, 120),
  format: zs(v => (!v || /^[A-Za-z0-9]{2,6}$/.test(v) ? null : 'Format is a short file type, e.g. PDF'), false, 6),
  size: zs(v => (!v || /^\d+(\.\d+)?\s?(KB|MB|GB)$/i.test(v) ? null : 'Size looks like 4.2 MB'), false, 12),
  url: zs(R.url, false, 500),
  file: z.object({ fileId: z.string(), name: z.string(), size: z.number(), type: z.string() }).nullable().optional(),
  hidden: z.boolean().optional(),
});
