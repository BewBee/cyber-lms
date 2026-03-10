/**
 * pages/api/admin/core-modules.ts — Admin-only endpoint for managing core modules.
 * GET  /api/admin/core-modules?adminId= → lists all core modules with question counts.
 * POST /api/admin/core-modules → creates a new core module (admin only).
 *
 * SECURITY: Verifies adminId maps to a user with role='admin'.
 * In production, replace adminId param with JWT claim verification.
 * To test: GET /api/admin/core-modules?adminId={adminUserId}
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';

async function verifyAdmin(supabase: ReturnType<typeof getServiceClient>, adminId: unknown) {
  if (!isValidUUID(adminId)) return false;
  const { data } = await supabase.from('users').select('role').eq('id', adminId).single();
  return data?.role === 'admin';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const adminId = req.method === 'GET' ? req.query.adminId : req.body?.adminId;

  if (!(await verifyAdmin(supabase, adminId))) {
    return err(res, 'Forbidden: admin access required', 403);
  }

  // ─── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        module_id, module_name, description, is_locked, exp_bonus_percent, created_at,
        questions ( question_id )
      `)
      .eq('module_type', 'core')
      .order('created_at');

    if (error) return err(res, 'Failed to fetch core modules', 500);

    const modules = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      question_count: Array.isArray(m.questions) ? (m.questions as unknown[]).length : 0,
      questions: undefined,
    }));

    return res.status(200).json({ modules });
  }

  // ─── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { module_name, description, course_id, is_locked, exp_bonus_percent } = req.body ?? {};

    if (!isNonEmptyString(module_name)) return err(res, 'module_name is required', 400);

    const { data: newModule, error: modErr } = await supabase
      .from('modules')
      .insert({
        module_name: String(module_name).trim(),
        description: description ? String(description).trim() : null,
        course_id: isValidUUID(course_id) ? course_id : null,
        created_by: adminId,
        module_type: 'core',
        is_locked: Boolean(is_locked ?? true),
        exp_bonus_percent: typeof exp_bonus_percent === 'number' ? Math.max(0, exp_bonus_percent) : 0,
      })
      .select('module_id')
      .single();

    if (modErr || !newModule) return err(res, 'Failed to create core module', 500);
    return res.status(201).json({ module_id: newModule.module_id, message: 'Core module created' });
  }

  methodNotAllowed(req, res, ['GET', 'POST']);
}
