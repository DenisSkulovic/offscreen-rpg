import { NextResponse, type NextRequest } from 'next/server';
import { PATHNAME_HEADER } from '@/src/features/session/safe-entry-destination';

/**
 * Expose the requested path to SSR so requireViewer can preserve a safe
 * post-sign-in destination. Does not authorize access.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  headers.set(PATHNAME_HEADER, path);
  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: [
    '/stories',
    '/stories/:path*',
    '/play/:path*',
    '/chamber',
    '/chamber/:path*',
  ],
};
