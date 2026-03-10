/**
 * pages/api/teacher/analytics.ts — Analytics summary for a teacher's class.
 * GET /api/teacher/analytics?classId=&teacherId= → avg score, accuracy, weak questions.
 * Returns aggregate stats plus the bottom N questions by accuracy (weak questions).
 * To test: GET /api/teacher/analytics?classId={classId}&teacherId={teacherId}
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';
import { config } from '@/lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const { classId, teacherId } = req.query;
  if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);
  if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId', 400);

  const supabase = getServiceClient();

  // Verify teacher owns this class
  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('class_id, class_name')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .single();

  if (clsErr || !cls) return err(res, 'Class not found or not authorized', 403);

  // Get enrolled student IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('status', 'approved');

  const studentIds = (enrollments ?? []).map((e: { student_id: string }) => e.student_id);
  const totalStudents = studentIds.length;

  if (totalStudents === 0) {
    return res.status(200).json({
      classId, className: cls.class_name, totalStudents: 0,
      avgScore: 0, avgAccuracy: 0, completedSessions: 0, weakQuestions: [],
    });
  }

  // Get sessions for enrolled students in this class
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('session_id, total_score, accuracy, student_id')
    .eq('class_id', classId)
    .in('student_id', studentIds)
    .not('finished_at', 'is', null);

  const completedSessions = (sessions ?? []).length;
  const avgScore = completedSessions > 0
    ? (sessions ?? []).reduce((s: number, r: { total_score: number }) => s + (r.total_score ?? 0), 0) / completedSessions
    : 0;
  const avgAccuracy = completedSessions > 0
    ? (sessions ?? []).reduce((s: number, r: { accuracy: number }) => s + (r.accuracy ?? 0), 0) / completedSessions
    : 0;

  // Compute per-question accuracy from attempts
  const sessionIds = (sessions ?? []).map((s: { session_id: string }) => s.session_id);

  let weakQuestions: unknown[] = [];
  if (sessionIds.length > 0) {
    const { data: attempts } = await supabase
      .from('attempts')
      .select('question_id, is_correct')
      .in('session_id', sessionIds);

    // Aggregate per question
    const qMap = new Map<string, { total: number; correct: number }>();
    for (const a of attempts ?? []) {
      const entry = qMap.get(a.question_id) ?? { total: 0, correct: 0 };
      entry.total++;
      if (a.is_correct) entry.correct++;
      qMap.set(a.question_id, entry);
    }

    // Fetch question texts for the weak questions
    const allQIds = [...qMap.keys()];
    if (allQIds.length > 0) {
      const { data: qTexts } = await supabase
        .from('questions')
        .select('question_id, question_text')
        .in('question_id', allQIds);

      const qTextMap = new Map(
        (qTexts ?? []).map((q: { question_id: string; question_text: string }) => [q.question_id, q.question_text])
      );

      weakQuestions = [...qMap.entries()]
        .map(([qId, stats]) => ({
          question_id: qId,
          question_text: qTextMap.get(qId) ?? 'Unknown',
          total_attempts: stats.total,
          correct_attempts: stats.correct,
          accuracy_pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        }))
        .sort((a, b) => (a as { accuracy_pct: number }).accuracy_pct - (b as { accuracy_pct: number }).accuracy_pct)
        .slice(0, config.ANALYTICS_WEAK_QUESTION_LIMIT);
    }
  }

  res.status(200).json({
    classId,
    className: cls.class_name,
    totalStudents,
    avgScore: Math.round(avgScore * 10) / 10,
    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
    completedSessions,
    weakQuestions,
  });
}
