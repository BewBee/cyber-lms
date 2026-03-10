/**
 * lib/browserClient.ts — Cookie-based Supabase client for browser ('use client') components.
 *
 * Uses @supabase/ssr's createBrowserClient so that the auth session is stored in
 * cookies (not just localStorage), making it readable by the Next.js middleware
 * for server-side route protection.
 *
 * Import `browserSupabase` from here (NOT from lib/supabaseClient) in any
 * 'use client' component that needs auth or DB access.
 *
 * lib/supabaseClient's `getServiceClient()` is still used in API routes (server-only).
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  console.warn(
    '[CyberShield] Supabase env vars not set. ' +
    'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

/**
 * Singleton browser Supabase client.
 * Stores the auth session in cookies — required for middleware to see it.
 * Re-use this instance everywhere in client components.
 */
export const browserSupabase = createBrowserClient(url, anonKey);
