/**
 * pages/api/admin/questions/index.ts
 * POST /api/admin/questions — create a question + 4 options for a core module.
 * Admin only. Uses service role (bypasses RLS).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  const supabase = getServiceClient();
  const { adminId, moduleId, question_text, difficulty, explanation, options } = req.body ?? {};

  if (!isValidUUID(adminId)) return err(res, 'Invalid adminId', 400);
  if (!isValidUUID(moduleId)) return err(res, 'Invalid moduleId', 400);
  if (!isNonEmptyString(question_text)) return err(res, 'question_text required', 400);
  if (!Array.isArray(options) || options.length !== 4) return err(res, '4 options required', 400);

  // Verify admin role
  const { data: user } = await supabase.from('users').select('role').eq('id', adminId).single();
  if (!user || user.role !== 'admin') return err(res, 'Forbidden', 403);

  // Insert question
  const { data: q, error: qErr } = await supabase
    .from('questions')
    .insert({ module_id: moduleId, question_text, difficulty: Number(difficulty) || 1, explanation: explanation ?? '' })
    .select('question_id')
    .single();

  if (qErr || !q) return err(res, 'Failed to insert question', 500);

  // Insert options
  const optRows = options.map((o: { option_key: string; option_text: string; is_correct: boolean }) => ({
    question_id: q.question_id,
    option_key: o.option_key,
    option_text: o.option_text,
    is_correct: Boolean(o.is_correct),
  }));

  const { error: optErr } = await supabase.from('question_options').insert(optRows);
  if (optErr) {
    // Roll back question
    await supabase.from('questions').delete().eq('question_id', q.question_id);
    return err(res, 'Failed to insert options', 500);
  }

  return res.status(201).json({ question_id: q.question_id, message: 'Question created' });
}
