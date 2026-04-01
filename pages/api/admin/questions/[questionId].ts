/**
 * pages/api/admin/questions/[questionId].ts
 * PUT    /api/admin/questions/[questionId] — update question + options.
 * DELETE /api/admin/questions/[questionId] — delete question + options (FK-safe).
 * Admin only. Uses service role (bypasses RLS).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const { questionId } = req.query;

  if (!isValidUUID(questionId)) return err(res, 'Invalid questionId', 400);

  const verifyAdmin = async (adminId: unknown) => {
    if (!isValidUUID(adminId)) return false;
    const { data } = await supabase.from('users').select('role').eq('id', adminId as string).single();
    return data?.role === 'admin';
  };

  // ─── PUT: update question ─────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { adminId, question_text, difficulty, explanation, options } = req.body ?? {};
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    const { error: qErr } = await supabase
      .from('questions')
      .update({ question_text, difficulty: Number(difficulty), explanation: explanation ?? '' })
      .eq('question_id', questionId as string);

    if (qErr) return err(res, 'Failed to update question', 500);

    if (Array.isArray(options)) {
      for (const o of options as { option_key: string; option_text: string; is_correct: boolean }[]) {
        await supabase.from('question_options')
          .update({ option_text: o.option_text, is_correct: Boolean(o.is_correct) })
          .eq('question_id', questionId as string)
          .eq('option_key', o.option_key);
      }
    }

    return res.status(200).json({ message: 'Question updated' });
  }

  // ─── DELETE: remove question + options ───────────────────────────────────
  if (req.method === 'DELETE') {
    const adminId = req.query.adminId;
    if (!await verifyAdmin(adminId)) return err(res, 'Forbidden', 403);

    // Delete options first (FK dependency)
    await supabase.from('question_options').delete().eq('question_id', questionId as string);

    const { error } = await supabase.from('questions').delete().eq('question_id', questionId as string);
    if (error) {
      const isFk = error.code === '23503';
      return err(res, isFk ? 'Cannot delete — question has student attempt history' : 'Delete failed', 409);
    }

    return res.status(200).json({ message: 'Question deleted' });
  }

  methodNotAllowed(req, res, ['PUT', 'DELETE']);
}
