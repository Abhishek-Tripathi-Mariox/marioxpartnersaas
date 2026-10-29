import { cookies } from 'next/headers';
import { COOKIE, signSession, type Session } from './jwt';

// Secure cookies are only sent over HTTPS. Turning them on for a plain http://IP deployment
// makes the browser drop the session, so every login bounces back to /login.
// Default: secure when APP_URL is https. Override with COOKIE_SECURE=true|false.
const secure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (process.env.APP_URL ?? '').startsWith('https://');

export async function setSessionCookie(s: Session) {
  (await cookies()).set(COOKIE, await signSession(s), {
    httpOnly: true,
    sameSite: 'lax',
    secure: secure(),
    path: '/',
    maxAge: 7 * 86400,
  });
}
