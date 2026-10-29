import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { handle, body, ok, HttpError } from '@/lib/api';
import { createPartner, newPartnerSchema } from '@/lib/users';

// Public API for the main Mariox website: creates a partner account.
//
//   POST /api/v1/users
//   x-api-key: <MAIN_SITE_API_KEY>
//   { "name": "...", "email": "...", "phone": "...", "company": "...", "password"?: "..." }
//
// Returns the new user and, when no password was sent, a one-time
// setPasswordUrl to email to the partner.

function cors(req: Request) {
  const allowed = (process.env.MAIN_SITE_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin') || '';
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-api-key',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function checkKey(req: Request) {
  const expected = process.env.MAIN_SITE_API_KEY || '';
  const got = req.headers.get('x-api-key') || '';
  const a = Buffer.from(got), b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(401, 'Invalid API key');
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

const create = handle(async req => {
  checkKey(req);
  const input = await body(req, newPartnerSchema);
  return ok(await createPartner(input, 'main-site'), 201);
});

export async function POST(req: Request, ctx: { params: Promise<Record<string, string>> }) {
  const res = await create(req, ctx);
  for (const [k, v] of Object.entries(cors(req))) res.headers.set(k, v);
  return res;
}
