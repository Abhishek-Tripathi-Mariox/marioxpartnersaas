import { handle, session, admin, body, ok, scope, HttpError } from '@/lib/api';
import { projectSchema } from '@/lib/schemas';
import { Project } from '@/models/Project';

export const GET = handle(async (_req, { id }) => {
  const s = await session();
  const project = await Project.findOne({ _id: id, ...scope(s) }).lean();
  if (!project) throw new HttpError(404, 'Project not found');
  return ok({ project });
});

export const PATCH = handle(async (req, { id }) => {
  await admin();
  const project = await Project.findByIdAndUpdate(id, await body(req, projectSchema.partial()), { new: true, runValidators: true });
  if (!project) throw new HttpError(404, 'Project not found');
  return ok({ project });
});

export const DELETE = handle(async (_req, { id }) => {
  await admin();
  await Project.findByIdAndDelete(id);
  return ok({ ok: true });
});
