/**
 * pages/api/quizzes/index.ts — Lists all available (unlocked) quiz modules.
 * GET /api/quizzes → returns array of module metadata (no question content).
 * To test: GET /api/quizzes — expect array of modules with module_id, module_name, etc.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const supabase = getServiceClient();

  // Fetch modules with a count of their questions (joined)
  const { data, error } = await supabase
    .from('modules')
    .select(
      `
      module_id,
      module_name,
      description,
      module_type,
      is_locked,
      exp_bonus_percent,
      created_at,
      questions ( question_id )
    `
    )
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/quizzes] DB error:', error.message);
    return err(res, 'Failed to fetch modules', 500);
  }

  // Map to include question_count
  const modules = (data ?? []).map((m: Record<string, unknown>) => ({
    module_id: m.module_id,
    module_name: m.module_name,
    description: m.description,
    module_type: m.module_type,
    is_locked: m.is_locked,
    exp_bonus_percent: m.exp_bonus_percent,
    created_at: m.created_at,
    question_count: Array.isArray(m.questions) ? m.questions.length : 0,
  }));

  res.status(200).json({ modules });
}
