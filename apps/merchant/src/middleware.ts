import { NextResponse, type NextRequest } from 'next/server';

const REFRESH_COOKIE = 'rb_refresh';
const PUBLIC_PATHS = ['/login'];

/**
 * Coarse route protection: routes require the presence of the refresh cookie.
 * Fine-grained authorization (and token validity) is enforced by the API on each
 * call; this just keeps unauthenticated users out of the app shell.
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
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
