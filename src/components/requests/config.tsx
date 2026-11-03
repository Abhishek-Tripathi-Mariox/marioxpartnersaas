import type { ReactNode } from 'react';
import type { FieldDef } from '@/components/forms/DynamicForm';
import { AttachmentList, type Attachment } from '@/components/forms/FileUploader';
import {
  DURATIONS, MEET_MODES, OFFICES, REQUEST_STATUS, SLOTS, TEAMS, TECH_TYPES, TICKET_CATS, VISIT_PURPOSES,
} from '@/lib/constants';
import { date, inr } from '@/lib/format';
import type { RequestItem } from '@/types';
import { R, slotError, slotPassed } from '@/lib/validate';

export type RequestKind = keyof typeof REQUEST_STATUS;

type ListItem = { title: ReactNode; sub: ReactNode; detail?: ReactNode };

type Config = {
  eyebrow: string;
  title: string;
  subtitle: string;
  formTitle: string;
  submitLabel: string;
  listTitle: string;
  empty: string;
  fields: FieldDef[];                     // partner create form
  reviewFields: FieldDef[];               // admin review form (status is always added)
  columns: { key: string; header: string; width?: string; render: (r: RequestItem) => ReactNode }[];  // admin table
  item: (r: RequestItem) => ListItem;     // partner "your requests" list
};

const s = (v: unknown) => (v == null || v === '' ? '—' : String(v));

// Everything that differs between request types lives here; RequestsView renders any of them.
export const REQUESTS: Record<RequestKind, Config> = {
  scope: {
    eyebrow: 'Toolkit',
    title: 'Scope approvals',
    subtitle: 'Submit scope and amount. Mariox approves or revises before you quote the client.',
    formTitle: 'New scope',
    submitLabel: 'Submit for approval',
    listTitle: 'Your submissions',
    empty: 'No scope submissions yet',
    fields: [
      { name: 'client', label: 'Client', required: true, rule: R.company },
      { name: 'project', label: 'Project', required: true, rule: R.title },
      { name: 'needs', label: 'What the client needs', type: 'textarea', placeholder: 'Modules, platforms, integrations, timelines', rule: R.words(5) },
      { name: 'lines', label: 'Your estimate', type: 'lines' },
    ],
    reviewFields: [
      { name: 'approved', label: 'Approved amount (₹)', type: 'number', rule: R.money('Approved amount') },
      { name: 'comment', label: 'Comment to partner', type: 'textarea', rule: R.words(3) },
    ],
    columns: [
      { key: 'project', header: 'Project', width: 'minmax(0,1.5fr)', render: r => <><div className="strong">{s(r.project)}</div><div className="sub">{s(r.client)}</div></> },
      { key: 'submitted', header: 'Submitted', render: r => <span className="num">{inr(r.submitted as number)}</span> },
      { key: 'approved', header: 'Approved', render: r => (r.approved ? <span className="num earn">{inr(r.approved as number)}</span> : '—') },
      { key: 'files', header: 'Files', width: 'minmax(0,1.2fr)', render: r => <AttachmentList files={r.attachments as Attachment[]} compact /> },
      { key: 'comment', header: 'Mariox comment', width: 'minmax(0,1.6fr)', render: r => <span className="sub">{s(r.comment)}</span> },
    ],
    item: r => ({ title: s(r.project), sub: `${s(r.client)} · ${inr(r.submitted as number)}` }),
  },
  booking: {
    eyebrow: 'Toolkit',
    title: 'Book an office visit',
    subtitle: 'Meet your client at a Mariox office. A meeting room and host are arranged for you.',
    formTitle: 'Your booking',
    submitLabel: 'Confirm booking',
    listTitle: 'Upcoming visits',
    empty: 'No visits booked',
    fields: [
      { name: 'office', label: 'Office', type: 'chips', options: OFFICES },
      { name: 'date', label: 'Date', type: 'date', required: true, min: 'today' },
      { name: 'time', label: 'Time slot · 90 min', type: 'chips', options: SLOTS, optionsWhen: v => SLOTS.filter(t => !slotPassed(String(v.date), t)), check: v => slotError(String(v.date), String(v.time), 'That slot') },
      { name: 'client', label: 'Client', required: true, rule: R.company },
      { name: 'guests', label: 'Guests from client side', type: 'number', rule: v => (v && (+v < 0 || +v > 50 || !Number.isInteger(+v)) ? 'Guests: a whole number up to 50' : null) },
      { name: 'purpose', label: 'Purpose', type: 'chips', options: VISIT_PURPOSES },
      { name: 'team', label: 'Mariox team required in the meeting', type: 'select', options: TEAMS },
    ],
    reviewFields: [
      { name: 'date', label: 'Date', type: 'date', min: 'today' },
      { name: 'time', label: 'Time', type: 'select', options: SLOTS, optionsWhen: v => SLOTS.filter(t => !slotPassed(String(v.date), t) || t === v.time), check: v => slotError(String(v.date), String(v.time), 'That slot') },
      { name: 'comment', label: 'Comment to partner', type: 'textarea', rule: R.words(3) },
    ],
    columns: [
      { key: 'client', header: 'Client', width: 'minmax(0,1.4fr)', render: r => <><div className="strong">{s(r.client)}</div><div className="sub">{s(r.purpose)}</div></> },
      { key: 'when', header: 'When', render: r => `${date(r.date as string)} · ${s(r.time)}` },
      { key: 'office', header: 'Office', render: r => s(r.office) },
      { key: 'team', header: 'Team', render: r => s(r.team) },
    ],
    item: r => ({
      title: s(r.client),
      sub: `${s(r.office)} · ${date(r.date as string)}, ${s(r.time)} · ${s(r.purpose)}`,
      detail: `With ${s(r.team)}${r.comment ? ` · ${r.comment}` : ''}`,
    }),
  },
  tech: {
    eyebrow: 'Toolkit',
    title: 'Technical team',
    subtitle: 'Bring in a Mariox architect or tech lead for pre-sales calls, demos and scoping.',
    formTitle: 'What do you need?',
    submitLabel: 'Send request',
    listTitle: 'Your requests',
    empty: 'No tech requests yet',
    fields: [
      { name: 'type', label: 'Request type', type: 'chips', options: TECH_TYPES },
      { name: 'client', label: 'Client', required: true, rule: R.company },
      { name: 'date', label: 'Preferred date', type: 'date', required: true, min: 'today' },
      { name: 'time', label: 'Preferred time (IST)', type: 'time', check: v => slotError(String(v.date), String(v.time)) },
      { name: 'duration', label: 'Duration', type: 'select', options: DURATIONS },
      { name: 'mode', label: 'Meeting platform', type: 'chips', options: MEET_MODES },
      { name: 'link', label: 'Meeting link', placeholder: 'Leave blank and Mariox will send the invite', full: true, rule: R.url },
      { name: 'context', label: 'Context for the team', type: 'textarea', placeholder: "Client's stack, questions they've raised, decision makers in the call", rule: R.words(5) },
    ],
    reviewFields: [
      { name: 'assignee', label: 'Assigned expert', rule: R.person },
      { name: 'link', label: 'Meeting link', rule: R.url },
      { name: 'comment', label: 'Comment to partner', type: 'textarea', rule: R.words(3) },
    ],
    columns: [
      { key: 'type', header: 'Request', width: 'minmax(0,1.4fr)', render: r => <><div className="strong">{s(r.type)}</div><div className="sub">{s(r.client)}</div></> },
      { key: 'when', header: 'When', render: r => `${date(r.date as string)} · ${s(r.time)}` },
      { key: 'mode', header: 'Mode', render: r => s(r.mode) },
      { key: 'assignee', header: 'Expert', render: r => s(r.assignee) },
    ],
    item: r => ({
      title: s(r.type),
      sub: `${s(r.client)} · ${date(r.date as string)}, ${s(r.time)} · ${s(r.duration)} · ${s(r.mode)}`,
      detail: r.assignee ? String(r.assignee) : 'Waiting for an expert to be assigned',
    }),
  },
  ticket: {
    eyebrow: 'Help',
    title: 'Support',
    subtitle: 'Talk directly to Mariox leadership, or raise a ticket with the partner team.',
    formTitle: 'Raise a ticket',
    submitLabel: 'Submit ticket',
    listTitle: 'Your tickets',
    empty: 'No tickets',
    fields: [
      { name: 'category', label: 'Category', type: 'chips', options: TICKET_CATS },
      { name: 'subject', label: 'Subject', required: true, placeholder: 'e.g. MedCare M2 commission not received', full: true, rule: R.words(5, 150) },
      { name: 'body', label: 'Details', type: 'textarea', placeholder: 'Client, project, amounts, dates', rule: R.words(5) },
      { name: 'escalate', label: "Escalate to founder's office", hint: 'For urgent payout or delivery issues', type: 'checkbox' },
    ],
    reviewFields: [
      { name: 'assignee', label: 'Owner', rule: R.person },
      { name: 'comment', label: 'Reply to partner', type: 'textarea', rule: R.words(3) },
    ],
    columns: [
      { key: 'code', header: 'Ticket', width: '100px', render: r => <span className="mono sub">{s(r.code)}</span> },
      { key: 'subject', header: 'Subject', width: 'minmax(0,1.6fr)', render: r => <><div className="strong">{s(r.subject)}</div><div className="sub">{s(r.category)}</div></> },
      { key: 'reply', header: 'Reply', width: 'minmax(0,1.6fr)', render: r => <span className="sub">{s(r.comment || r.assignee)}</span> },
    ],
    item: r => ({
      title: s(r.subject),
      sub: <span className="mono" style={{ fontSize: 11.5 }}>{s(r.code)} · {s(r.category)} · {date(r.createdAt)}</span>,
      detail: r.comment ? String(r.comment) : r.assignee ? `With ${r.assignee}` : undefined,
    }),
  },
};
