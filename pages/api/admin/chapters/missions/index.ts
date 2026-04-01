/**
 * pages/api/admin/chapters/missions/index.ts
 * POST   — add mission to chapter
 * DELETE — remove mission from chapter (?chapterId=&moduleId=)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getServiceClient();

  if (req.method === 'POST') {
    const { chapter_id, module_id, mission_order, is_boss } = req.body;
    if (!isValidUUID(chapter_id) || !isValidUUID(module_id)) return err(res, 'Invalid IDs', 400);
    const { data, error } = await db
      .from('chapter_missions')
      .insert({ chapter_id, module_id, mission_order: mission_order ?? 99, is_boss: !!is_boss })
      .select('*, modules(module_name)')
      .single();
    if (error) return err(res, error.message, 500);
    return res.status(201).json({ mission: data });
  }

  if (req.method === 'DELETE') {
    const { chapterId, moduleId } = req.query;
    if (!isValidUUID(chapterId) || !isValidUUID(moduleId)) return err(res, 'Invalid IDs', 400);
    const { error } = await db
      .from('chapter_missions')
      .delete()
      .eq('chapter_id', String(chapterId))
      .eq('module_id', String(moduleId));
    if (error) return err(res, error.message, 500);
    return res.status(200).json({ success: true });
  }

  return methodNotAllowed(req, res, ['POST', 'DELETE']);
}
