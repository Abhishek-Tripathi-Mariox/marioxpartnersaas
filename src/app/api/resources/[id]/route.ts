import { handle, admin, body, ok, HttpError } from '@/lib/api';
import { deleteFile, openFile, setShared } from '@/lib/files';
import { resourceSchema } from '@/lib/schemas';
import { Resource } from '@/models/Content';

export const PATCH = handle(async (req, { id }) => {
  await admin();
  const item = await Resource.findById(id);
  if (!item) throw new HttpError(404, 'Resource not found');
  const data = await body(req, resourceSchema.partial());
  const oldFileId: string | undefined = item.file?.fileId;

  if (data.file) await openFile(data.file.fileId); // must exist
  item.set({ ...data, file: data.file === undefined ? item.file : data.file ?? undefined });
  await item.save();

  // Replaced or removed file → delete the old one from S3. Visible kit files are readable by every partner.
  const newFileId: string | undefined = item.file?.fileId;
  if (oldFileId && oldFileId !== newFileId) await deleteFile(oldFileId);
  await setShared(newFileId, !item.hidden);
  return ok({ item });
});

export const DELETE = handle(async (_req, { id }) => {
  await admin();
  const item = await Resource.findByIdAndDelete(id);
  await deleteFile(item?.file?.fileId);
  return ok({ ok: true });
});
