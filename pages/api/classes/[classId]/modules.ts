/**
 * pages/api/classes/[classId]/modules.ts — Class-module assignments.
 * GET    /api/classes/:classId/modules?teacherId=          → list modules assigned to class
 * POST   /api/classes/:classId/modules { teacherId, moduleId } → assign module to class
 * DELETE /api/classes/:classId/modules?teacherId=&moduleId= → unassign module from class
 *
 * Only the class owner (teacher) can manage module assignments.
 * Students use /api/student/modules to get their filtered module list.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const { classId } = req.query;

  if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);

  // ─── Ownership check helper ──────────────────────────────────────────────────
  const verifyOwner = async (teacherId: unknown): Promise<boolean> => {
    if (!isValidUUID(teacherId)) return false;
    const { data } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('class_id', classId as string)
      .single();
    return data?.teacher_id === teacherId;
  };

  // ─── GET: List modules assigned to this class ────────────────────────────────
  if (req.method === 'GET') {
    const { teacherId } = req.query;
    if (!await verifyOwner(teacherId)) return err(res, 'Forbidden', 403);

    const { data, error } = await supabase
      .from('class_modules')
      .select(`
        module_id,
        added_at,
        modules ( module_id, module_name, description, module_type, exp_bonus_percent, is_locked )
      `)
      .eq('class_id', classId as string)
      .order('added_at', { ascending: true });

    if (error) return err(res, 'Failed to fetch class modules', 500);

    const modules = (data ?? [])
      .map((row: Record<string, unknown>) => row.modules)
      .filter(Boolean);

    return res.status(200).json({ modules });
  }

  // ─── POST: Assign a module to this class ────────────────────────────────────
  if (req.method === 'POST') {
    const { teacherId, moduleId } = req.body ?? {};

    if (!await verifyOwner(teacherId)) return err(res, 'Forbidden', 403);
    if (!isValidUUID(moduleId)) return err(res, 'Invalid moduleId', 400);

    // Verify the module belongs to this teacher
    const { data: mod } = await supabase
      .from('modules')
      .select('created_by')
      .eq('module_id', moduleId)
      .single();

    if (!mod) return err(res, 'Module not found', 404);
    if (mod.created_by !== teacherId) return err(res, 'You can only assign your own modules', 403);

    const { error } = await supabase
      .from('class_modules')
      .upsert(
        { class_id: classId as string, module_id: moduleId },
        { onConflict: 'class_id,module_id' }
      );

    if (error) return err(res, 'Failed to assign module', 500);

    return res.status(201).json({ message: 'Module assigned to class' });
  }

  // ─── DELETE: Unassign a module from this class ───────────────────────────────
  if (req.method === 'DELETE') {
    const { teacherId, moduleId } = req.query;

    if (!await verifyOwner(teacherId)) return err(res, 'Forbidden', 403);
    if (!isValidUUID(moduleId)) return err(res, 'Invalid moduleId', 400);

    const { error } = await supabase
      .from('class_modules')
      .delete()
      .eq('class_id', classId as string)
      .eq('module_id', moduleId as string);

    if (error) return err(res, 'Failed to unassign module', 500);

    return res.status(200).json({ message: 'Module unassigned from class' });
  }

  methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
}
