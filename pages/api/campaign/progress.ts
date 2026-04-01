/**
 * pages/api/campaign/progress.ts — Returns full campaign structure with student progress.
 * GET /api/campaign/progress?studentId=
 * Returns all chapters, their missions, and which missions the student has completed.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const { studentId } = req.query;
  if (!studentId || !isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);

  const db = getServiceClient();

  // Fetch all chapters ordered
  const { data: chapters, error: chErr } = await db
    .from('chapters')
    .select('*')
    .order('chapter_number', { ascending: true });
  if (chErr) return err(res, 'Failed to fetch chapters', 500);

  // Fetch all missions with module info
  const { data: missions, error: mErr } = await db
    .from('chapter_missions')
    .select('id, chapter_id, mission_order, is_boss, module_id, modules(module_name, description)')
    .order('mission_order', { ascending: true });
  if (mErr) return err(res, 'Failed to fetch missions', 500);

  // Fetch student's completed sessions (which module_ids they've finished)
  const { data: sessions } = await db
    .from('game_sessions')
    .select('module_id')
    .eq('student_id', String(studentId))
    .not('finished_at', 'is', null);

  const completedModuleIds = new Set((sessions ?? []).map((s: { module_id: string }) => s.module_id));

  // Fetch chapter completions
  const { data: chapterCompletions } = await db
    .from('chapter_completions')
    .select('chapter_id')
    .eq('student_id', String(studentId));

  const completedChapterIds = new Set((chapterCompletions ?? []).map((c: { chapter_id: string }) => c.chapter_id));

  // Fetch student's earned titles
  const { data: earnedTitles } = await db
    .from('student_titles')
    .select('title_id, is_equipped')
    .eq('student_id', String(studentId));

  const earnedTitleIds = new Set((earnedTitles ?? []).map((t: { title_id: string }) => t.title_id));

  // Fetch titles per chapter
  const { data: titles } = await db.from('titles').select('*');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titlesByChapter = new Map<string, any>();
  (titles ?? []).forEach((t: Record<string, unknown>) => { if (t.chapter_id) titlesByChapter.set(t.chapter_id as string, t); });

  // Assemble response
  const result = (chapters ?? []).map((ch) => {
    const chMissions = (missions ?? []).filter((m) => m.chapter_id === ch.chapter_id);
    const normalMissions = chMissions.filter((m) => !m.is_boss);
    const bossMission = chMissions.find((m) => m.is_boss) ?? null;

    const completedNormal = normalMissions.filter((m) => completedModuleIds.has(m.module_id));
    const bossCompleted = bossMission ? completedModuleIds.has(bossMission.module_id) : false;
    const allNormalDone = normalMissions.length > 0 && completedNormal.length === normalMissions.length;
    const chapterDone = completedChapterIds.has(ch.chapter_id);

    const chapterTitle = titlesByChapter.get(ch.chapter_id) ?? null;

    return {
      ...ch,
      missions: chMissions.map((m) => ({
        ...m,
        completed: completedModuleIds.has(m.module_id),
      })),
      progress: {
        completedNormal: completedNormal.length,
        totalNormal: normalMissions.length,
        bossCompleted,
        allNormalDone,
        chapterDone,
        bossUnlocked: allNormalDone && !bossCompleted && bossMission !== null,
      },
      reward_title: chapterTitle ? {
        ...chapterTitle,
        earned: earnedTitleIds.has(chapterTitle.title_id),
      } : null,
    };
  });

  res.status(200).json({ chapters: result });
}
