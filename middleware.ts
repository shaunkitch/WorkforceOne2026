import { NextResponse, type NextRequest } from 'next/server'
import { middleware as updateSession } from '@/lib/supabase/middleware'

// Mock database mapping for custom domains to org IDs
const CUSTOM_DOMAINS: Record<string, string> = {
  // e.g. 'workforce.acme.com': 'org-uuid-for-acme'
  'demo.workforceone.app': 'demo-org-id', // Example mapping
};

export async function middleware(request: NextRequest) {
  // 1. Update Supabase auth session
  const response = await updateSession(request);

  // 2. Custom Domain Routing (White-labeling)
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Ignore localhost and standard vercel/production domains
  if (
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app") &&
    !hostname.includes("workforceone.app") // Base domain
  ) {
    // Find org ID. In production, this would query Edge Config or a fast KV store.
    const orgId = CUSTOM_DOMAINS[hostname];

    if (orgId) {
      // Rewrite internally to the dynamic org dashboard route
      url.pathname = `/dashboard/${orgId}${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}