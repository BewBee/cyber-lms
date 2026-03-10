/**
 * pages/api/leaderboard/index.ts — Returns ranked leaderboard data.
 * GET /api/leaderboard?classId=&limit= → top students by total_exp.
 * Optionally filtered by classId (class leaderboard).
 * To test: GET /api/leaderboard — expect array of LeaderboardEntry objects.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';
import { config } from '@/lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const supabase = getServiceClient();
  const { classId, limit: limitRaw } = req.query;

  const limit = Math.min(
    parseInt(String(limitRaw ?? config.LEADERBOARD_PAGE_SIZE), 10) || config.LEADERBOARD_PAGE_SIZE,
    config.LEADERBOARD_PAGE_SIZE
  );

  // If classId is provided, filter to enrolled students
  if (classId) {
    if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);

    // Get enrolled student IDs for this class
    const { data: enrollments, error: enrErr } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved');

    if (enrErr) return err(res, 'Failed to fetch enrollments', 500);

    const studentIds = (enrollments ?? []).map((e: { student_id: string }) => e.student_id);
    if (studentIds.length === 0) return res.status(200).json({ leaderboard: [], total: 0 });

    const { data, error } = await supabase
      .from('leaderboard_view')
      .select('*')
      .in('id', studentIds)
      .order('total_exp', { ascending: false })
      .limit(limit);

    if (error) return err(res, 'Failed to fetch leaderboard', 500);
    return res.status(200).json({ leaderboard: data ?? [], total: (data ?? []).length, classId });
  }

  // Global leaderboard via the view
  const { data, error } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order('total_exp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[GET /api/leaderboard] DB error:', error.message);
    return err(res, 'Failed to fetch leaderboard', 500);
  }

  res.status(200).json({ leaderboard: data ?? [], total: (data ?? []).length });
}
