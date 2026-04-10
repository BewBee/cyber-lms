/**
 * pages/api/student/recommended-module.ts
 * GET ?studentId= : returns the module the student should tackle next,
 * based on which difficulty tier they're weakest at.
 *
 * Algorithm:
 *  1. Read all attempts for the student
 *  2. Group by question difficulty (1-5) → compute accuracy per tier
 *  3. Find the lowest-accuracy tier the student has attempted (≥3 attempts for signal)
 *  4. Find a module that has questions in that tier they haven't mastered yet
 *  5. Return that module + the weak tier details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { isNonEmptyString } from '@/lib/apiHelpers';

interface TierStats {
  difficulty: number;
  attempts: number;
  correct: number;
  accuracy: number;
}

interface RecommendedModule {
  module_id: string;
  module_name: string;
  description: string | null;
  module_type: string;
  weak_tier: number;
  weak_accuracy: number;
  reason: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServiceClient();
  const studentId = req.query.studentId as string | undefined;

  if (!isNonEmptyString(studentId)) {
    return res.status(400).json({ error: 'studentId required' });
  }

  // ── 1. Fetch all attempts with question difficulty ────────────────────────────
  const { data: attempts, error: attErr } = await supabase
    .from('attempts')
    .select(`
      is_correct,
      questions ( difficulty, module_id )
    `)
    .eq('game_sessions.student_id', studentId)
    .not('questions', 'is', null);

  // Fallback: join via game_sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('session_id')
    .eq('student_id', studentId)
    .not('finished_at', 'is', null);

  if (!sessions || sessions.length === 0) {
    return res.status(200).json({ recommendation: null, reason: 'no_history' });
  }

  const sessionIds = sessions.map((s) => s.session_id);

  const { data: rawAttempts, error: rawErr } = await supabase
    .from('attempts')
    .select(`
      is_correct,
      question_id,
      questions ( difficulty, module_id )
    `)
    .in('session_id', sessionIds);

  if (rawErr || !rawAttempts || rawAttempts.length === 0) {
    return res.status(200).json({ recommendation: null, reason: 'no_history' });
  }

  // ── 2. Build per-difficulty stats ─────────────────────────────────────────────
  const tierMap = new Map<number, { attempts: number; correct: number }>();

  for (const attempt of rawAttempts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = attempt.questions as any;
    if (!q?.difficulty) continue;
    const diff = q.difficulty as number;
    const existing = tierMap.get(diff) ?? { attempts: 0, correct: 0 };
    existing.attempts += 1;
    if (attempt.is_correct) existing.correct += 1;
    tierMap.set(diff, existing);
  }

  const tierStats: TierStats[] = Array.from(tierMap.entries())
    .map(([difficulty, { attempts, correct }]) => ({
      difficulty,
      attempts,
      correct,
      accuracy: attempts > 0 ? (correct / attempts) * 100 : 0,
    }))
    .filter((t) => t.attempts >= 3) // need at least 3 attempts for a meaningful signal
    .sort((a, b) => a.accuracy - b.accuracy); // worst first

  if (tierStats.length === 0) {
    return res.status(200).json({ recommendation: null, reason: 'insufficient_data' });
  }

  const weakestTier = tierStats[0];

  // ── 3. Build accessible module ID set for this student ───────────────────────
  // Core: only modules assigned to an unlocked, non-coming-soon chapter
  const { data: campaignMissions } = await supabase
    .from('chapter_missions')
    .select('module_id, chapters!inner(is_unlocked, is_coming_soon)')
    .eq('chapters.is_unlocked', true)
    .eq('chapters.is_coming_soon', false);

  const accessibleIds = new Set<string>(
    (campaignMissions ?? []).map((r: Record<string, unknown>) => r.module_id as string)
  );

  // Teacher: modules from classes the student is approved in
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'approved');

  if (enrollments && enrollments.length > 0) {
    const classIds = enrollments.map((e: Record<string, unknown>) => e.class_id as string);
    const { data: classModules } = await supabase
      .from('class_modules')
      .select('module_id')
      .in('class_id', classIds);
    (classModules ?? []).forEach((r: Record<string, unknown>) => accessibleIds.add(r.module_id as string));
  }

  // ── 4. Find accessible module with most questions in the weak tier ────────────
  const { data: weakQuestions } = await supabase
    .from('questions')
    .select('module_id')
    .eq('difficulty', weakestTier.difficulty)
    .limit(50);

  if (!weakQuestions || weakQuestions.length === 0) {
    return res.status(200).json({ recommendation: null, reason: 'no_matching_module' });
  }

  // Count which accessible module has the most questions at this difficulty tier
  const modCount = new Map<string, number>();
  for (const q of weakQuestions) {
    if (!q.module_id || !accessibleIds.has(q.module_id)) continue;
    modCount.set(q.module_id, (modCount.get(q.module_id) ?? 0) + 1);
  }

  // Sort by question count descending, pick top module
  const sortedMods = Array.from(modCount.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedMods.length === 0) {
    return res.status(200).json({ recommendation: null, reason: 'no_matching_module' });
  }

  const [targetModuleId] = sortedMods[0];

  // ── 5. Fetch module details ───────────────────────────────────────────────────
  const { data: mod } = await supabase
    .from('modules')
    .select('module_id, module_name, description, module_type')
    .eq('module_id', targetModuleId)
    .single();

  if (!mod) {
    return res.status(200).json({ recommendation: null, reason: 'module_not_found' });
  }

  const TIER_LABEL: Record<number, string> = {
    1: 'Beginner', 2: 'Easy', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert',
  };

  const recommendation: RecommendedModule = {
    module_id: mod.module_id,
    module_name: mod.module_name,
    description: mod.description,
    module_type: mod.module_type,
    weak_tier: weakestTier.difficulty,
    weak_accuracy: Math.round(weakestTier.accuracy),
    reason: `Your ${TIER_LABEL[weakestTier.difficulty] ?? 'difficulty ' + weakestTier.difficulty} questions are at ${Math.round(weakestTier.accuracy)}% accuracy — below target.`,
  };

  return res.status(200).json({
    recommendation,
    tierStats,
  });
}
