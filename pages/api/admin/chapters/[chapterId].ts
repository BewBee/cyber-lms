/**
 * pages/api/admin/chapters/[chapterId].ts
 * PUT    — update chapter fields
 * DELETE — delete chapter (if no completions)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chapterId } = req.query;
  if (!isValidUUID(chapterId)) return err(res, 'Invalid chapterId', 400);

  const db = getServiceClient();

  if (req.method === 'PUT') {
    const { title, subtitle, lore_text, is_unlocked, is_coming_soon } = req.body;
    const { data, error } = await db
      .from('chapters')
      .update({ title, subtitle, lore_text, is_unlocked, is_coming_soon })
      .eq('chapter_id', String(chapterId))
      .select()
      .single();
    if (error) return err(res, error.message, 500);
    return res.status(200).json({ chapter: data });
  }

  if (req.method === 'DELETE') {
    const { count } = await db
      .from('chapter_completions')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', String(chapterId));
    if ((count ?? 0) > 0) return err(res, 'Cannot delete: students have completed this chapter', 409);
    const { error } = await db.from('chapters').delete().eq('chapter_id', String(chapterId));
    if (error) return err(res, error.message, 500);
    return res.status(200).json({ success: true });
  }

  return methodNotAllowed(req, res, ['PUT', 'DELETE']);
}
