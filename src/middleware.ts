import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware - no Clerk, just pass through all requests
// Authentication is handled client-side via useAuth hook and simple auth
export default function middleware(request: NextRequest) {
  // Allow all requests to pass through
  // Auth is handled at the component level using the AuthContext
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
