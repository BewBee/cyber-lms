/**
 * pages/api/quizzes/[id]/attempt.ts — Submits a completed quiz session.
 * POST /api/quizzes/:id/attempt → validates answers, creates game_session + attempts, returns GameResult.
 *
 * Payload: { studentId, answers: [{ questionId, selectedOption, responseTimeMs, streakAtAttempt }], classId? }
 * Response: { result: GameResult }
 *
 * SECURITY: Server fetches correct answers from DB — the client never sends is_correct.
 * To test: POST /api/quizzes/{moduleId}/attempt with a valid payload and check the returned medal/EXP.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { validateAnswer as validatePayloadAnswer, err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';
import { processSessionResult, checkEarnedBadges } from '@/lib/gamification';
import { computeSessionStats } from '@/lib/quizEngine';
import type { AttemptAnswer, Question } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  const { id: moduleId } = req.query;
  if (!isValidUUID(moduleId)) return err(res, 'Invalid module ID', 400);

  // ─── Validate Payload ───────────────────────────────────────────────────────
  const { studentId, answers, classId } = req.body ?? {};

  if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);
  if (!Array.isArray(answers) || answers.length === 0) return err(res, 'answers must be a non-empty array', 400);

  // Validate each answer entry
  for (let i = 0; i < answers.length; i++) {
    const raw = answers[i];
    const validationError = validatePayloadAnswer(raw);
    if (validationError) return err(res, `answers[${i}]: ${validationError}`, 400);
  }

  if (classId !== undefined && classId !== null && !isValidUUID(classId)) {
    return err(res, 'Invalid classId', 400);
  }

  const supabase = getServiceClient();

  // ─── Fetch Student ──────────────────────────────────────────────────────────
  const { data: student, error: stuErr } = await supabase
    .from('users')
    .select('id, total_exp, level, role')
    .eq('id', studentId)
    .single();

  if (stuErr || !student) return err(res, 'Student not found', 404);
  if (student.role !== 'student') return err(res, 'Only students can submit quiz attempts', 403);

  // ─── Fetch Module ───────────────────────────────────────────────────────────
  const { data: module, error: modErr } = await supabase
    .from('modules')
    .select('module_id, exp_bonus_percent')
    .eq('module_id', moduleId)
    .single();

  if (modErr || !module) return err(res, 'Module not found', 404);

  // ─── Fetch Correct Answers from DB ─────────────────────────────────────────
  // Server-side only — never trust client-provided correctness
  const questionIds = (answers as AttemptAnswer[]).map((a) => a.questionId);

  const { data: dbQuestions, error: qErr } = await supabase
    .from('questions')
    .select('question_id, question_options ( option_key, is_correct )')
    .in('question_id', questionIds)
    .eq('module_id', moduleId); // Ensures questions belong to this module

  if (qErr || !dbQuestions) return err(res, 'Failed to fetch questions', 500);

  // Build a map: questionId → correct option key
  const correctKeyMap = new Map<string, string>();
  for (const q of dbQuestions as Question[]) {
    const correct = q.question_options.find((o) => o.is_correct);
    if (correct) correctKeyMap.set(q.question_id, correct.option_key);
  }

  // ─── Compute Correctness ────────────────────────────────────────────────────
  const correctness = (answers as AttemptAnswer[]).map((a) => {
    const correctKey = correctKeyMap.get(a.questionId);
    return correctKey !== undefined && a.selectedOption === correctKey;
  });

  // ─── Compute Streak Server-Side ─────────────────────────────────────────────
  // Never trust the client-provided streakAtAttempt — recompute from correctness.
  let runningStreak = 0;
  const serverStreaks = correctness.map((isCorrect) => {
    runningStreak = isCorrect ? runningStreak + 1 : 0;
    return runningStreak;
  });

  // Merge server-computed streaks into the answers array
  const verifiedAnswers: AttemptAnswer[] = (answers as AttemptAnswer[]).map((a, i) => ({
    ...a,
    streakAtAttempt: serverStreaks[i],
  }));

  // ─── Process Session Results ────────────────────────────────────────────────
  const tempSessionId = crypto.randomUUID();
  const result = processSessionResult({
    sessionId: tempSessionId,
    answers: verifiedAnswers,
    correctness,
    expBonusPercent: module.exp_bonus_percent,
    currentTotalExp: student.total_exp,
  });

  const stats = computeSessionStats(
    verifiedAnswers.map((a, i) => ({
      isCorrect: correctness[i],
      responseTimeMs: a.responseTimeMs,
    }))
  );

  // ─── Persist Game Session ───────────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabase
    .from('game_sessions')
    .insert({
      module_id: moduleId,
      class_id: classId ?? null,
      student_id: studentId,
      finished_at: new Date().toISOString(),
      total_score: stats.correctCount,
      accuracy: stats.accuracy,
      medal_awarded: result.medal,
      exp_awarded: result.expAwarded,
      average_response_time: stats.averageResponseTime,
    })
    .select('session_id')
    .single();

  if (sessionErr || !session) {
    console.error('[POST attempt] Session insert error:', sessionErr?.message);
    return err(res, 'Failed to record session', 500);
  }

  // ─── Persist Attempts ───────────────────────────────────────────────────────
  const attemptRows = verifiedAnswers.map((a, i) => ({
    session_id: session.session_id,
    question_id: a.questionId,
    selected_option: a.selectedOption,
    is_correct: correctness[i],
    response_time_ms: a.responseTimeMs,
    streak_at_attempt: a.streakAtAttempt, // now always server-computed
  }));

  const { error: attErr } = await supabase.from('attempts').insert(attemptRows);
  if (attErr) {
    console.error('[POST attempt] Attempts insert error:', attErr.message);
    // Non-fatal: session is already saved, continue
  }

  // ─── Update Student EXP & Level ─────────────────────────────────────────────
  const { error: expErr } = await supabase
    .from('users')
    .update({
      total_exp: result.newTotalExp,
      level: result.newLevel,
    })
    .eq('id', studentId);

  if (expErr) {
    console.error('[POST attempt] EXP update error:', expErr.message);
  }

  // ─── Badge Awards ──────────────────────────────────────────────────────────
  const { count: sessionCount } = await supabase
    .from('game_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .not('finished_at', 'is', null);

  const badgeKeys = checkEarnedBadges({
    isFirstSession: (sessionCount ?? 0) <= 1,
    medal: result.medal,
    accuracy: result.accuracy,
    maxStreak: result.maxStreak,
    totalSessionsCompleted: sessionCount ?? 0,
  });

  if (badgeKeys.length > 0) {
    const { data: badges } = await supabase
      .from('badges')
      .select('badge_id, badge_key')
      .in('badge_key', badgeKeys);

    if (badges && badges.length > 0) {
      const badgeInserts = badges.map((b: { badge_id: string }) => ({
        student_id: studentId,
        badge_id: b.badge_id,
      }));
      await supabase
        .from('student_badges')
        .upsert(badgeInserts, { onConflict: 'student_id,badge_id', ignoreDuplicates: true });
    }
  }

  // ─── Return Result ──────────────────────────────────────────────────────────
  res.status(200).json({
    result: { ...result, sessionId: session.session_id },
    badgesEarned: badgeKeys,
  });
}
