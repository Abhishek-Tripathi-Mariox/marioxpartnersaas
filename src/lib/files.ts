import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileRecord } from '@/models/File';
import { HttpError } from './api';
import { connectDB } from './db';

// File storage on AWS S3. Env: BUCKET, REGION, ACCESSKEY, SECRETACCESSKEY
// (the standard AWS_* names also work). Each upload gets a File record in MongoDB that
// stores the S3 key and who may read it; downloads are short-lived signed S3 URLs.

export const MAX_FILE_MB = 15;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|webp|gif|zip)$/i;

export type StoredFile = { fileId: string; name: string; size: number; type: string };

const env = (...names: string[]) => names.map(n => process.env[n]?.trim()).find(Boolean);
const config = () => ({
  bucket: env('BUCKET', 'AWS_BUCKET', 'S3_BUCKET'),
  region: env('REGION', 'AWS_REGION'),
  accessKeyId: env('ACCESSKEY', 'AWS_ACCESS_KEY_ID'),
  secretAccessKey: env('SECRETACCESSKEY', 'AWS_SECRET_ACCESS_KEY'),
});

const g = globalThis as unknown as { _s3?: S3Client };
function s3() {
  const c = config();
  if (!c.bucket || !c.region) throw new HttpError(503, 'File storage is not configured (BUCKET and REGION)');
  if (!g._s3) {
    g._s3 = new S3Client({
      region: c.region,
      // Without keys the SDK falls back to the EC2 instance role, if one is attached.
      ...(c.accessKeyId && c.secretAccessKey ? { credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } } : {}),
    });
  }
  return { client: g._s3, bucket: c.bucket };
}

// For /api/health: reports whether the bucket is reachable with these credentials.
export async function storageStatus() {
  try {
    const { client, bucket } = s3();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { storage: 'up' as const, bucket };
  } catch (e) {
    return { storage: 'down' as const, storageError: (e as Error).name === 'Error' ? (e as Error).message : `${(e as Error).name}: ${(e as Error).message}` };
  }
}

const safeName = (n: string) => n.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(-120) || 'file';

export async function saveFile(file: File, owner: string): Promise<StoredFile> {
  if (!file.name || !ALLOWED.test(file.name)) throw new HttpError(400, `${file.name || 'File'}: only PDF, Word, Excel, PowerPoint, CSV, text, images or ZIP`);
  if (file.size > MAX_FILE_BYTES) throw new HttpError(400, `${file.name} is larger than ${MAX_FILE_MB} MB`);

  const { client, bucket } = s3();
  const type = file.type || 'application/octet-stream';
  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${randomUUID()}/${safeName(file.name)}`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: type, Metadata: { owner } }),
  );

  await connectDB();
  const rec = await FileRecord.create({ key, name: file.name, size: file.size, type, owner });
  return { fileId: String(rec._id), name: file.name, size: file.size, type };
}

export async function openFile(id: string) {
  await connectDB();
  const rec = await FileRecord.findById(id).lean<{ _id: unknown; key: string; name: string; type: string; owner: unknown; shared: boolean }>().catch(() => null);
  if (!rec) throw new HttpError(404, 'File not found');
  return rec;
}

// Signed URL valid for 5 minutes; the browser fetches straight from S3.
// `download` makes the browser save the file instead of opening it.
export async function signedUrl(key: string, name: string, type: string, download = false) {
  const { client, bucket } = s3();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: type, ResponseContentDisposition: `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}` }),
    { expiresIn: 300 },
  );
}

export async function setShared(id: string | undefined, shared: boolean) {
  if (!id) return;
  await connectDB();
  await FileRecord.updateOne({ _id: id }, { shared });
}

export async function deleteFile(id: string | undefined) {
  if (!id) return;
  await connectDB();
  const rec = await FileRecord.findById(id).catch(() => null);
  if (!rec) return;
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: rec.key })).catch(() => {});
  await rec.deleteOne();
}
