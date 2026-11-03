import { handle, admin, body, ok } from '@/lib/api';
import { add } from '@/lib/acquisition';
import { applyUpdate, dayOf, editLead, loadLead, patchSchema, startOnboarding } from '@/lib/acquisition-server';
import { AcqLead } from '@/models/AcqLead';

// PATCH /api/admin/acquisition/:id
//   { action: 'update', opt, ... }  the update dialog (meeting, follow-up, convert, reject…)
//   { action: 'edit', lead, meet? } edit details (a meeting date books the meeting)
//   { action: 'invited' }           the invite went out · { action: 'onboard' } converted → onboarding
//   { action: 'temp' } · { action: 'notes' } · { action: 'reopen' }
export const PATCH = handle(async (req, { id }) => {
  await admin();
  const p = await body(req, patchSchema);
  const l = await loadLead(id);
  let partner = null;

  let needsInvite = false;
  if (p.action === 'edit') needsInvite = editLead(l, p.lead, p.meet, dayOf(p.today));
  if (p.action === 'invited' && l.meet) l.meet.invited = true;
  if (p.action === 'onboard') startOnboarding(l, dayOf(p.today));
  if (p.action === 'temp') l.temp = p.temp;
  if (p.action === 'notes') l.notes = p.notes;
  if (p.action === 'reopen') {
    const t = dayOf(p.today);
    l.status = l.steps.some(s => s.k === 'done') ? 'followup' : 'contacted';
    l.next = add(t, 1);
    l.reason = '';
    l.steps.push({ k: 'followup', date: t, note: 'Reopened' });
  }
  if (p.action === 'update') partner = await applyUpdate(l, p);

  const { _id, code, partner: linked, ...rest } = l;
  void _id; void code;
  const ref = typeof linked === 'object' && linked ? linked._id : linked;
  await AcqLead.updateOne({ _id: id }, { $set: { ...rest, partner: ref || undefined } });
  return ok({ lead: await loadLead(id), partner, needsInvite });
});

export const DELETE = handle(async (_req, { id }) => {
  await admin();
  await AcqLead.deleteOne({ _id: id });
  return ok({ ok: true });
});
