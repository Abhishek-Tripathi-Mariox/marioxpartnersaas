import { NextResponse } from 'next/server';
import { handle, session, HttpError } from '@/lib/api';
import { openFile, signedUrl } from '@/lib/files';

// GET /api/uploads/:id[?download=1]  → redirect to a 5-minute signed S3 link (download=1 saves instead of opening).
// Readable by its uploader, by admins, and by everyone when shared (visible sales kit files).
export const GET = handle(async (req, { id }) => {
  const s = await session();
  const f = await openFile(id);
  if (s.role !== 'admin' && !f.shared && String(f.owner) !== s.sub) throw new HttpError(404, 'File not found');
  const download = new URL(req.url).searchParams.get('download') === '1';
  return NextResponse.redirect(await signedUrl(f.key, f.name, f.type, download), 302);
});
