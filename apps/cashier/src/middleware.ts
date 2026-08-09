import { NextResponse, type NextRequest } from 'next/server';

const COOKIE = 'mb_staff';
const PUBLIC_PATHS = ['/login', '/offline'];

/**
 * Coarse route protection: app routes require the staff cookie. Real
 * authorization is enforced by the backend on every request; this only keeps
 * signed-out staff out of the app shell.
 */
export function middleware(request: NextRequest): NextResponse {
  const signedIn = request.cookies.has(COOKIE);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (signedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/session/active', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon.svg|.*\\..*).*)',
  ],
};
