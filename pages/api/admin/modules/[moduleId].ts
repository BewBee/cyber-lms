/**
 * pages/api/admin/modules/[moduleId].ts
 * GET  → full module with questions + options (admin view, includes is_correct)
 * PUT  → update module metadata + questions (allows core modules, admin only)
 * DELETE → delete module (blocks if has student attempts via FK)
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
  const { moduleId } = req.query;
  if (!isValidUUID(moduleId)) return err(res, 'Invalid moduleId', 400);

  // ─── GET: full module for editing ───────────────────────────────────────────
  if (req.method === 'GET') {
    const adminId = req.query.adminId;
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    const { data: module, error } = await db
      .from('modules')
      .select(`
        module_id, module_name, description, module_type, exp_bonus_percent, is_locked,
        questions (
          question_id, question_text, difficulty, explanation,
          question_options ( option_key, option_text, is_correct )
        ),
        lessons ( lesson_id, lesson_title, content )
      `)
      .eq('module_id', moduleId as string)
      .single();

    if (error || !module) return err(res, 'Module not found', 404);

    const lessons = Array.isArray((module as Record<string, unknown>).lessons)
      ? (module as Record<string, unknown>).lessons as { lesson_id: string; lesson_title: string; content: string }[]
      : [];

    return res.status(200).json({ module: { ...module, lesson: lessons[0] ?? null, lessons: undefined } });
  }

  // ─── PUT: update module metadata ────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { adminId, module_name, description, exp_bonus_percent } = req.body ?? {};
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    const update: Record<string, unknown> = {};
    if (isNonEmptyString(module_name)) update.module_name = String(module_name).trim();
    if (description !== undefined) update.description = String(description).trim() || null;
    if (typeof exp_bonus_percent === 'number') update.exp_bonus_percent = Math.max(0, exp_bonus_percent);

    if (Object.keys(update).length === 0) return err(res, 'Nothing to update', 400);

    const { error } = await db.from('modules').update(update).eq('module_id', moduleId as string);
    if (error) return err(res, 'Failed to update module', 500);

    return res.status(200).json({ message: 'Module updated' });
  }

  // ─── DELETE: remove module ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const adminId = req.query.adminId;
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    const { error } = await db.from('modules').delete().eq('module_id', moduleId as string);
    if (error) {
      const isFk = error.code === '23503';
      return err(res, isFk ? 'Cannot delete — module has student activity history' : 'Failed to delete', 409);
    }
    return res.status(200).json({ message: 'Module deleted' });
  }

  methodNotAllowed(req, res, ['GET', 'PUT', 'DELETE']);
}
