/**
 * app/auth/callback/route.ts — Supabase email-confirmation callback handler.
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * Exchanges the one-time code for a session, then redirects to the correct dashboard.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Look up the user's role in public.users
        const db = getServiceClient();
        const { data } = await db
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = data?.role ?? 'student';
        const dest =
          next !== '/'
            ? next
            : role === 'teacher'
            ? '/teacher/dashboard'
            : '/student/dashboard';

        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  // Something went wrong — send back to login with error hint
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
