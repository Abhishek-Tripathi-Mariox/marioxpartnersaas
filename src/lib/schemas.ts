import { z } from 'zod';

export const today = () => new Date().toISOString().slice(0, 10);

const str = z.string().optional();
const num = z.coerce.number().min(0).optional();

export const leadSchema = z.object({
  company: z.string().min(1),
  project: str,
  value: num,
  contact: str,
  phone: str,
  email: str,
  city: str,
  source: str,
  priority: str,
  stage: z.string().min(1).optional(),   // checked against the pipeline config in the route
  lostReason: str,
  expectedClose: str,
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
  label: z.string().min(1),
  amount: z.coerce.number().min(0),
  due: str,
  status: z.enum(['upcoming', 'due', 'received']).default('upcoming'),
  releasedAt: str,
  utr: str,
});

export const projectSchema = z.object({
  owner: z.string().min(1),
  lead: str,
  client: z.string().min(1),
  contact: str,
  city: str,
  title: z.string().min(1),
  deal: num,
  commissionRate: z.coerce.number().min(0).max(1).optional(),
  closedAt: str,
  stage: z.number().int().min(0).max(4).optional(),
  pm: str,
  update: str,
  milestones: z.array(z.string()).optional(),
  payments: z.array(paymentSchema).optional(),
});

// What a partner may send when creating each request type.
export const requestCreate = {
  scope: z.object({
    client: z.string().min(1),
    project: z.string().min(1),
    needs: str,
    lines: z.array(z.object({ name: z.string(), amount: z.coerce.number().min(0) })).default([]),
    // From POST /api/uploads; the route checks each file belongs to the submitter.
    attachments: z.array(z.object({ fileId: z.string(), name: z.string(), size: z.number(), type: z.string() })).max(10).default([]),
  }),
  booking: z.object({
    client: z.string().min(1),
    office: str,
    date: str,
    time: str,
    purpose: str,
    team: str,
    guests: num,
  }),
  tech: z.object({
    type: z.string().min(1),
    client: z.string().min(1),
    date: str,
    time: str,
    duration: str,
    mode: str,
    link: str,
    context: str,
  }),
  ticket: z.object({
    subject: z.string().min(1),
    category: str,
    body: str,
    escalate: z.boolean().optional(),
  }),
};

// What an admin may change on a request.
export const requestReview = z.object({
  status: z.string().min(1).optional(),
  comment: str,
  assignee: str,
  approved: num,
  date: str,
  time: str,
  link: str,
});

export const resourceSchema = z.object({
  type: z.string().min(1),
  industry: str,
  title: z.string().min(1),
  format: str,
  size: str,
  url: str,
  file: z.object({ fileId: z.string(), name: z.string(), size: z.number(), type: z.string() }).nullable().optional(),
  hidden: z.boolean().optional(),
});
