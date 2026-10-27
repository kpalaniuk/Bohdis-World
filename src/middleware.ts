import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(request.method)) {
    const contentType = request.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.startsWith('application/json')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const origin = request.headers.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== request.nextUrl.host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
