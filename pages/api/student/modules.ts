/**
 * pages/api/student/modules.ts — Student-visible modules filtered by class enrollment.
 * GET /api/student/modules?studentId=
 *
 * Returns:
 *   - Core modules that are assigned to an unlocked campaign chapter (admin-curated)
 *   - Teacher modules only for classes the student has an approved enrollment in
 *
 * Each module in the response carries class_id / class_name (null for core modules).
 * If a student is in two classes with the same module, it appears once.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const supabase = getServiceClient();
  const { studentId } = req.query;

  if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);

  // ─── 1. Core modules — only those assigned to an unlocked campaign chapter ──
  // Unassigned core modules are admin drafts and must not be student-visible.
  const { data: campaignMissions, error: coreErr } = await supabase
    .from('chapter_missions')
    .select('module_id, chapters!inner(is_unlocked, is_coming_soon)')
    .eq('chapters.is_unlocked', true)
    .eq('chapters.is_coming_soon', false);

  if (coreErr) return err(res, 'Failed to fetch campaign missions', 500);

  const assignedModuleIds = [...new Set(
    (campaignMissions ?? []).map((r: Record<string, unknown>) => r.module_id as string)
  )];

  const { data: coreModules } = assignedModuleIds.length > 0
    ? await supabase
        .from('modules')
        .select('module_id, module_name, description, module_type, is_locked, exp_bonus_percent, created_by, created_at')
        .eq('module_type', 'core')
        .eq('is_locked', false)
        .in('module_id', assignedModuleIds)
        .order('created_at')
    : { data: [] };

  // ─── 2. Student's approved enrollments ──────────────────────────────────────
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id, classes ( class_id, class_name )')
    .eq('student_id', studentId as string)
    .eq('status', 'approved');

  const enrolledClasses = (enrollments ?? []).map((e: Record<string, unknown>) => ({
    class_id: e.class_id as string,
    class_name: (e.classes as { class_name: string } | null)?.class_name ?? 'Unknown',
  }));

  const enrolledClassIds = enrolledClasses.map((c) => c.class_id);

  // ─── 3. Teacher modules from enrolled classes ────────────────────────────────
  type TeacherModuleRow = {
    module_id: string;
    module_name: string;
    description: string | null;
    module_type: string;
    is_locked: boolean;
    exp_bonus_percent: number;
    created_by: string;
    created_at: string;
    class_id: string | null;
    class_name: string | null;
  };

  let teacherModules: TeacherModuleRow[] = [];

  if (enrolledClassIds.length > 0) {
    const { data: classModuleRows } = await supabase
      .from('class_modules')
      .select(`
        class_id,
        module_id,
        modules ( module_id, module_name, description, module_type, is_locked, exp_bonus_percent, created_by, created_at )
      `)
      .in('class_id', enrolledClassIds);

    // Deduplicate by module_id — if the same module is in multiple enrolled classes, show once
    const seen = new Set<string>();

    teacherModules = (classModuleRows ?? [])
      .filter((row: Record<string, unknown>) => {
        const mod = row.modules as Record<string, unknown> | null;
        if (!mod) return false;
        if (mod.module_type !== 'teacher') return false;
        if (mod.is_locked) return false;
        const mid = mod.module_id as string;
        if (seen.has(mid)) return false;
        seen.add(mid);
        return true;
      })
      .map((row: Record<string, unknown>) => {
        const mod = row.modules as Record<string, unknown>;
        const cls = enrolledClasses.find((c) => c.class_id === (row.class_id as string));
        return {
          module_id: mod.module_id as string,
          module_name: mod.module_name as string,
          description: (mod.description as string | null) ?? null,
          module_type: mod.module_type as string,
          is_locked: mod.is_locked as boolean,
          exp_bonus_percent: mod.exp_bonus_percent as number,
          created_by: mod.created_by as string,
          created_at: mod.created_at as string,
          class_id: row.class_id as string,
          class_name: cls?.class_name ?? null,
        };
      });
  }

  // ─── Merge core + teacher ───────────────────────────────────────────────────
  const allModules = [
    ...(coreModules ?? []).map((m) => ({ ...m, class_id: null as string | null, class_name: null as string | null })),
    ...teacherModules,
  ];

  return res.status(200).json({ modules: allModules });
}
