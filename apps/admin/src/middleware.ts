import { NextResponse, type NextRequest } from 'next/server';

const REFRESH_COOKIE = 'rb_refresh';
const PUBLIC_PATHS = ['/login'];

/**
 * Coarse route protection for the admin console. The presence of the refresh
 * cookie is required for app routes; ADMIN-role enforcement happens at login and
 * on every API call (the API rejects non-admins).
 */
export function middleware(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(REFRESH_COOKIE);
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
