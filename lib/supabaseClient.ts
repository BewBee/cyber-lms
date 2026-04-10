/**
 * lib/supabaseClient.ts — Supabase client factory for CyberShield LMS.
 *
 * SECURITY:
 *  - supabase (anon client): safe to use client-side; Row Level Security (RLS) enforced.
 *  - getServiceClient(): uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
 *    ONLY call getServiceClient() inside Next.js API routes. Never expose it to the browser.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  if (typeof window !== 'undefined') {
    console.warn('[CyberShield] Supabase env vars not set. Add them to .env.local to enable DB features.');
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
 */
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

  if (!serviceKey) {
    console.error('[CyberShield] SUPABASE_SERVICE_ROLE_KEY is not set. Server operations will fail.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
