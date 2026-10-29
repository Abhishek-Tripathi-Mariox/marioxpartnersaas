import { cookies } from 'next/headers';
import { ok } from '@/lib/api';
import { COOKIE } from '@/lib/jwt';

export async function POST() {
  (await cookies()).delete(COOKIE);
  return ok({ ok: true });
}
