import { handle, admin, body, ok, HttpError } from '@/lib/api';
import { resourceSchema } from '@/lib/schemas';
import { Resource } from '@/models/Content';

export const PATCH = handle(async (req, { id }) => {
  await admin();
  const item = await Resource.findByIdAndUpdate(id, await body(req, resourceSchema.partial()), { new: true });
  if (!item) throw new HttpError(404, 'Resource not found');
  return ok({ item });
});

export const DELETE = handle(async (_req, { id }) => {
  await admin();
  await Resource.findByIdAndDelete(id);
  return ok({ ok: true });
});
