import { SignJWT, jwtVerify } from 'jose';

// Edge-safe (used by middleware), so no mongoose or node-only imports here.
export const COOKIE = 'mx_session';
export type Session = { sub: string; role: 'admin' | 'partner'; name: string; v?: number };

const key = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret');

export function signSession(s: Session) {
  return new SignJWT({ role: s.role, name: s.name, v: s.v ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { sub: String(payload.sub), role: payload.role as Session['role'], name: String(payload.name || ''), v: Number(payload.v ?? 0) };
  } catch {
    return null;
  }
}
