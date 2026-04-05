/**
 * pages/api/admin/modules/index.ts
 * GET  /api/admin/modules?adminId= → all core modules + modules created by admin
 * POST /api/admin/modules          → create a module (any type, admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';

async function verifyAdmin(adminId: unknown): Promise<boolean> {
  if (!isValidUUID(adminId)) return false;
  const { data } = await getServiceClient().from('users').select('role').eq('id', adminId as string).single();
  return data?.role === 'admin';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getServiceClient();

  // ─── GET: all core modules + admin-created modules ──────────────────────────
  if (req.method === 'GET') {
    const { adminId } = req.query;
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    const { data, error } = await db
      .from('modules')
      .select('module_id, module_name, description, module_type, exp_bonus_percent, is_locked, created_at, created_by, questions(question_id)')
      .or(`module_type.eq.core,created_by.eq.${adminId}`)
      .order('module_type', { ascending: true })
      .order('module_name', { ascending: true });

    if (error) return err(res, 'Failed to fetch modules', 500);

    const modules = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      question_count: Array.isArray(m.questions) ? (m.questions as unknown[]).length : 0,
      questions: undefined,
    }));

    return res.status(200).json({ modules });
  }

  // ─── POST: create a module ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { adminId, module_name, description, module_type, exp_bonus_percent } = req.body ?? {};
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);
    if (!isNonEmptyString(module_name)) return err(res, 'module_name required', 400);

    const type = module_type === 'teacher' ? 'teacher' : 'core';

    const { data, error } = await db
      .from('modules')
      .insert({
        module_name: String(module_name).trim(),
        description: description ? String(description).trim() : null,
        module_type: type,
        exp_bonus_percent: typeof exp_bonus_percent === 'number' ? Math.max(0, exp_bonus_percent) : 0,
        is_locked: false,
        created_by: adminId,
      })
      .select('module_id')
      .single();

    if (error || !data) return err(res, 'Failed to create module', 500);
    return res.status(201).json({ module_id: data.module_id, message: 'Module created' });
  }

  methodNotAllowed(req, res, ['GET', 'POST']);
}
