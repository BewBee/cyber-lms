/**
 * middleware.ts — Route protection for CyberShield LMS.
 * Runs on every request matching /student/* and /teacher/*.
 * Uses @supabase/ssr to read the cookie-based session (set by browserSupabase
 * in lib/browserClient.ts) and redirects unauthenticated users to /login.
 * Role enforcement (student vs teacher) is handled in each dashboard page.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // We need to mutate the response to allow Supabase to refresh the session cookie
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request.cookies.set only accepts (name, value) — no options
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response so refreshed cookies are passed to the browser
          supabaseResponse = NextResponse.next({ request });
          // response cookies DO support options (secure, httpOnly, etc.)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() makes a server-side network call to verify the JWT — more secure than getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated — redirect to /login, preserving the intended destination
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  // Protect student and teacher routes; leave everything else public
  matcher: ['/student/:path*', '/teacher/:path*'],
};
