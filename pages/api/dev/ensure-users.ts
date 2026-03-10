/**
 * pages/api/dev/ensure-users.ts — Dev-only endpoint to create test accounts.
 * POST /api/dev/ensure-users
 *
 * Creates three test accounts in Supabase Auth + public.users (one per role)
 * if they don't already exist. Safe to call repeatedly — idempotent.
 *
 * ⚠️  DEVELOPMENT ONLY — returns 404 in production.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';

const DEV_PASSWORD = 'CyberDev@1';

const DEV_ACCOUNTS = [
  { email: 'dev-admin@cybershield.dev',   name: 'Dev Admin',   role: 'admin'   },
  { email: 'dev-teacher@cybershield.dev', name: 'Dev Teacher', role: 'teacher' },
  { email: 'dev-student@cybershield.dev', name: 'Dev Student', role: 'student' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServiceClient();
  const results: { email: string; status: string }[] = [];

  for (const account of DEV_ACCOUNTS) {
    // Ensure Auth user exists (createUser is idempotent-ish; we catch "already exists")
    let userId: string | null = null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: DEV_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      // If the user already exists in Auth, look them up by email
      if (authError.message.toLowerCase().includes('already been registered') ||
          authError.message.toLowerCase().includes('already exists')) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email === account.email);
        userId = found?.id ?? null;
      } else {
        results.push({ email: account.email, status: `auth_error: ${authError.message}` });
        continue;
      }
    } else {
      userId = authData?.user?.id ?? null;
    }

    if (!userId) {
      results.push({ email: account.email, status: 'auth_error: could not resolve user id' });
      continue;
    }

    // Upsert into public.users — handles the case where a DB trigger already
    // inserted a minimal row (e.g. with wrong role/name) when the auth user was created.
    const { error: dbError } = await supabase.from('users').upsert(
      {
        id: userId,
        email: account.email,
        name: account.name,
        role: account.role,
        total_exp: 0,
        level: 1,
      },
      { onConflict: 'id' }
    );

    if (dbError) {
      results.push({ email: account.email, status: `db_error: ${dbError.message}` });
    } else {
      results.push({ email: account.email, status: authData ? 'created' : 'updated' });
    }
  }

  return res.status(200).json({ results });
}
