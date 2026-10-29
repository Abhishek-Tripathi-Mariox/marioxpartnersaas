import { handle, session, admin, body, ok, scope, HttpError } from '@/lib/api';
import { requestKind } from '@/lib/requests';
import { requestReview } from '@/lib/schemas';

// Admin reviews a request: status, comment, assignee, approved amount, rescheduled time.
export const PATCH = handle(async (req, { kind, id }) => {
  await admin();
  const { model } = requestKind(kind);
  const item = await model.findByIdAndUpdate(id, await body(req, requestReview), { new: true });
  if (!item) throw new HttpError(404, 'Request not found');
  return ok({ item });
});

// A partner can withdraw their own request; admins can delete any.
export const DELETE = handle(async (_req, { kind, id }) => {
  const s = await session();
  const { model } = requestKind(kind);
  const res = await model.deleteOne({ _id: id, ...scope(s) });
  if (!res.deletedCount) throw new HttpError(404, 'Request not found');
  return ok({ ok: true });
});
