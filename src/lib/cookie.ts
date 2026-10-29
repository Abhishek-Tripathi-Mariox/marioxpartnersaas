import { cookies } from 'next/headers';
import { COOKIE, signSession, type Session } from './jwt';

export async function setSessionCookie(s: Session) {
  (await cookies()).set(COOKIE, await signSession(s), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 86400,
  });
}
