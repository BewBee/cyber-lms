/**
 * lib/supabaseClient.ts — Supabase client factory for CyberShield LMS.
 * Exports a browser-safe anon client and a server-only service-role client.
 * To test: import { supabase } from '@/lib/supabaseClient' and call supabase.from('users').select('*').limit(1).
 *
 * SECURITY NOTE:
 *  - supabase (anon client): safe to use client-side; Row Level Security (RLS) enforced by Supabase.
 *  - getServiceClient(): uses SUPABASE_SERVICE_KEY which bypasses RLS.
 *    ONLY call getServiceClient() inside Next.js API routes (server-side). Never expose it to the browser.
 *
 * DEV STUB: If env vars are missing, the client is created with empty strings.
 *   Supabase calls will fail gracefully — you will see console warnings, but the app will not crash.
 *   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable DB features.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn(
      '[CyberShield] Supabase env vars not set. DB features disabled. ' +
        'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    );
  }
}

/** Browser-safe Supabase client using the anon key. RLS applies. */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS — use ONLY in server-side API routes.
 * Never call this function from client components.
 */
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
  if (!serviceKey) {
    console.error(
      '[CyberShield] SUPABASE_SERVICE_KEY is not set. Server operations will fail.'
    );
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
