/**
 * pages/api/admin/chapters/index.ts
 * GET  — list all chapters with missions
 * POST — create new chapter
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getServiceClient();

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('chapters')
      .select('*, chapter_missions(id, mission_order, is_boss, module_id, modules(module_name))')
      .order('chapter_number', { ascending: true });
    if (error) return err(res, 'Failed to fetch chapters', 500);
    return res.status(200).json({ chapters: data });
  }

  if (req.method === 'POST') {
    const { title, subtitle, lore_text, chapter_number, is_unlocked, is_coming_soon } = req.body;
    if (!title || !chapter_number) return err(res, 'title and chapter_number required', 400);
    const { data, error } = await db
      .from('chapters')
      .insert({ title, subtitle, lore_text, chapter_number, is_unlocked: !!is_unlocked, is_coming_soon: !!is_coming_soon })
      .select()
      .single();
    if (error) return err(res, error.message, 500);
    return res.status(201).json({ chapter: data });
  }

  return methodNotAllowed(req, res, ['GET', 'POST']);
}
