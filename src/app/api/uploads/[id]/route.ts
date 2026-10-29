import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { handle, session, HttpError } from '@/lib/api';
import { openFile } from '@/lib/files';

// GET /api/uploads/:id  downloads a file. Only its uploader and admins can read it.
export const GET = handle(async (_req, { id }) => {
  const s = await session();
  const { doc, stream } = await openFile(id);
  if (s.role !== 'admin' && String(doc.metadata?.owner) !== s.sub) throw new HttpError(404, 'File not found');

  return new NextResponse(Readable.toWeb(stream()) as ReadableStream, {
    headers: {
      'content-type': String(doc.metadata?.type || 'application/octet-stream'),
      'content-length': String(doc.length),
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      'cache-control': 'private, max-age=3600',
    },
  });
});
