import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Check if Clerk is configured
const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.CLERK_SECRET_KEY
);

// Define public routes that don't require authentication
// Note: profile, settings, admin are included because they handle their own auth
// via useAuth hook (supports both Clerk and simple auth)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/calculator',
  '/math',
  '/game',
  '/profile',
  '/settings',
  '/admin',
]);

// Clerk middleware handler
const clerkHandler = clerkMiddleware(async (auth, request) => {
  // Allow public routes without authentication
  if (isPublicRoute(request)) {
    return;
  }
  
  // For all other routes, protect them (require auth)
  await auth.protect();
});

// Export middleware that handles both configured and unconfigured Clerk
export default function middleware(request: NextRequest) {
  // If Clerk isn't configured, just pass through
  if (!isClerkConfigured) {
    return NextResponse.next();
  }
  
  // Use Clerk middleware
  return clerkHandler(request, {} as any);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

