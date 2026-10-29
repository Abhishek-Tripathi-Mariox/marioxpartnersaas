import { handle, session, ok, HttpError } from '@/lib/api';
import { saveFile } from '@/lib/files';

// POST /api/uploads  (multipart/form-data, field "files", one or more)
// Returns [{ fileId, name, size, type }] to attach to a request (e.g. a scope submission).
export const POST = handle(async req => {
  const s = await session();
  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Send files as multipart/form-data');
  });
  const files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  if (!files.length) throw new HttpError(400, 'No files received');
  if (files.length > 10) throw new HttpError(400, 'Up to 10 files at a time');

  const saved = [];
  for (const f of files) saved.push(await saveFile(f, s.sub));
  return ok({ files: saved }, 201);
});
