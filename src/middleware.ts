import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifySession } from '@/lib/jwt';

const PUBLIC = ['/login', '/set-password'];

// Page-level guard. API routes check the session themselves (see lib/api.ts).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(COOKIE)?.value);

  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return s ? NextResponse.redirect(new URL(home(s.role), req.url)) : NextResponse.next();
  }
  if (!s) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === '/') return NextResponse.redirect(new URL(home(s.role), req.url));
  if (pathname.startsWith('/admin') && s.role !== 'admin') return NextResponse.redirect(new URL('/dashboard', req.url));
  return NextResponse.next();
}

const home = (role: string) => (role === 'admin' ? '/admin' : '/dashboard');

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|icon.svg).*)'],
};
