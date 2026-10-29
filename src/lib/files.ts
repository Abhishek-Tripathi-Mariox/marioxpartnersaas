import mongoose from 'mongoose';
import { Readable } from 'node:stream';
import { connectDB } from './db';
import { HttpError } from './api';

// File storage in MongoDB GridFS (bucket "uploads"), so attachments work on any host
// without extra storage setup. Each file records its owner for access checks.

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|webp|gif|zip)$/i;

export type StoredFile = { fileId: string; name: string; size: number; type: string };

async function bucket() {
  await connectDB();
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'uploads' });
}

export async function saveFile(file: File, owner: string): Promise<StoredFile> {
  if (!file.name || !ALLOWED.test(file.name)) throw new HttpError(400, `${file.name || 'File'}: only PDF, Word, Excel, PowerPoint, CSV, text, images or ZIP`);
  if (file.size > MAX_FILE_BYTES) throw new HttpError(400, `${file.name} is larger than 25 MB`);

  const b = await bucket();
  const upload = b.openUploadStream(file.name, { metadata: { owner, type: file.type || 'application/octet-stream' } });
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(file.stream() as never).pipe(upload).on('finish', () => resolve()).on('error', reject);
  });
  return { fileId: String(upload.id), name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
}

export async function openFile(id: string) {
  const b = await bucket();
  let _id: mongoose.Types.ObjectId;
  try {
    _id = new mongoose.Types.ObjectId(id);
  } catch {
    throw new HttpError(404, 'File not found');
  }
  const [doc] = await b.find({ _id }).toArray();
  if (!doc) throw new HttpError(404, 'File not found');
  return { doc, stream: () => b.openDownloadStream(_id) };
}

export async function deleteFile(id: string) {
  const b = await bucket();
  await b.delete(new mongoose.Types.ObjectId(id)).catch(() => {});
}
