import { z } from 'zod';
import { handle, session, body, ok, scope, HttpError } from '@/lib/api';
import { deleteFile } from '@/lib/files';
import { requestKind } from '@/lib/requests';
import { requestReview } from '@/lib/schemas';

// Admin reviews a request: status, comment, assignee, approved amount, rescheduled time.
export const PATCH = handle(async (req, { kind, id }) => {
  const s = await session();
  const { model } = requestKind(kind);

  // A partner's only change: accepting Mariox's revised amount on their own scope.
  if (s.role !== 'admin') {
    const { accept } = await body(req, z.object({ accept: z.literal(true) }));
    if (kind !== 'scope' || !accept) throw new HttpError(403, 'Admins only');
    const item = await model.findOne({ _id: id, owner: s.sub });
    if (!item) throw new HttpError(404, 'Request not found');
    if (item.status !== 'revised') throw new HttpError(400, 'Only a revised amount can be accepted');
    item.status = 'approved';
    item.comment = `${item.comment ? item.comment + ' ' : ''}Partner accepted the revised amount.`;
    await item.save();
    return ok({ item });
  }

  const item = await model.findByIdAndUpdate(id, await body(req, requestReview), { new: true });
  if (!item) throw new HttpError(404, 'Request not found');
  return ok({ item });
});

// A partner can withdraw their own request; admins can delete any.
export const DELETE = handle(async (_req, { kind, id }) => {
  const s = await session();
  const { model } = requestKind(kind);
  const item = await model.findOneAndDelete({ _id: id, ...scope(s) });
  if (!item) throw new HttpError(404, 'Request not found');
  // Remove its attachments from S3 too.
  for (const f of (item.attachments as { fileId: string }[] | undefined) ?? []) await deleteFile(f.fileId);
  return ok({ ok: true });
});
