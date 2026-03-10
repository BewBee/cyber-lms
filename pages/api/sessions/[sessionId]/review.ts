/**
 * pages/api/sessions/[sessionId]/review.ts — Returns full session details for review.
 * GET /api/sessions/:sessionId/review?studentId= → session metadata + attempts with question text.
 *
 * Includes the student's selected answer, the correct answer, and the explanation for each question.
 * Only the session owner may access this endpoint.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const { sessionId } = req.query;
  const { studentId } = req.query;

  if (!isValidUUID(sessionId)) return err(res, 'Invalid sessionId', 400);
  if (!isValidUUID(studentId)) return err(res, 'studentId query param required', 400);

  const supabase = getServiceClient();

  // Fetch the session
  const { data: session, error: sessionErr } = await supabase
    .from('game_sessions')
    .select('session_id, module_id, student_id, finished_at, total_score, accuracy, medal_awarded, exp_awarded, average_response_time')
    .eq('session_id', sessionId)
    .single();

  if (sessionErr || !session) return err(res, 'Session not found', 404);

  // Ownership check
  if (session.student_id !== studentId) return err(res, 'Forbidden', 403);

  // Fetch module name
  const { data: module } = await supabase
    .from('modules')
    .select('module_name')
    .eq('module_id', session.module_id)
    .single();

  // Fetch attempts with full question and options data
  const { data: attempts, error: attErr } = await supabase
    .from('attempts')
    .select(`
      attempt_id,
      selected_option,
      is_correct,
      response_time_ms,
      streak_at_attempt,
      questions (
        question_id,
        question_text,
        explanation,
        question_options ( option_key, option_text, is_correct )
      )
    `)
    .eq('session_id', sessionId)
    .order('attempt_id');

  if (attErr) return err(res, 'Failed to fetch attempts', 500);

  return res.status(200).json({
    session: {
      ...session,
      module_name: module?.module_name ?? 'Unknown Module',
    },
    attempts: attempts ?? [],
  });
}
