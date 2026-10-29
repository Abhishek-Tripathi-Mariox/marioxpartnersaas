import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ZodError, type ZodSchema } from 'zod';
import { connectDB } from './db';
import { COOKIE, verifySession, type Session } from './jwt';
import { User } from '@/models/User';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });

// Verifies the cookie, then re-checks the account so suspensions and role changes apply immediately.
export async function session(): Promise<Session> {
  const jar = await cookies();
  const s = await verifySession(jar.get(COOKIE)?.value);
  if (!s) throw new HttpError(401, 'Not signed in');
  const user = await User.findById(s.sub).select('status role name sessionVersion').lean<{ status: string; role: Session['role']; name: string; sessionVersion?: number }>();
  const expired = user && (user.sessionVersion ?? 0) !== (s.v ?? 0);
  if (!user || user.status === 'disabled' || expired) {
    jar.delete(COOKIE); // otherwise middleware would bounce the user straight back in
    throw new HttpError(401, !user ? 'Account not found' : expired ? 'Your session ended. Please sign in again.' : 'Your account is suspended');
  }
  return { sub: s.sub, role: user.role, name: user.name, v: s.v };
}

export async function admin(): Promise<Session> {
  const s = await session();
  if (s.role !== 'admin') throw new HttpError(403, 'Admins only');
  return s;
}

export async function body<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'Body must be JSON');
  }
  return schema.parse(raw);
}

// Partners only ever see their own records; admins see everything.
export const scope = (s: Session) => (s.role === 'admin' ? {} : { owner: s.sub });

type Ctx = { params: Promise<Record<string, string>> };

// Admins can act for a partner (create a lead for them, reassign); partners always act as themselves.
export function ownerFor(s: Session, requested?: string) {
  return s.role === 'admin' && requested ? requested : s.sub;
}

// Wraps a route handler: connects to Mongo and turns thrown errors into JSON responses.
export function handle(fn: (req: Request, params: Record<string, string>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      await connectDB();
      return await fn(req, ctx?.params ? await ctx.params : {});
    } catch (e) {
      if (e instanceof HttpError) return ok({ error: e.message }, e.status);
      if (e instanceof ZodError) {
        const first = e.issues[0];
        const msg = first ? `${first.path.join('.') ? first.path.join('.') + ': ' : ''}${first.message}` : 'Invalid input';
        return ok({ error: msg, issues: e.issues }, 400);
      }
      if ((e as { code?: number }).code === 11000) return ok({ error: 'Already exists' }, 409);
      if ((e as Error).name === 'CastError') return ok({ error: 'Not found' }, 404);
      console.error(e);
      return ok({ error: 'Server error' }, 500);
    }
  };
}
