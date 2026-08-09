import { NextResponse, type NextRequest } from 'next/server';

const SESSION_MARKER = 'rb_session';
const PUBLIC_PATHS = ['/login'];

/**
 * Coarse route protection for the admin console. Gated on the first-party
 * marker cookie rather than the API's httpOnly refresh cookie, which lives on
 * the API's own domain and is invisible here whenever the two are deployed
 * separately. ADMIN-role enforcement happens at login, in SessionProvider, and
 * on every API call (the API rejects non-admins).
 */
export function middleware(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_MARKER);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
