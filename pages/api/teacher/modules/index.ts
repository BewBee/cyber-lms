/**
 * pages/api/teacher/modules/index.ts — Teacher module listing and creation.
 * GET  /api/teacher/modules?teacherId= → lists modules created by teacher.
 * POST /api/teacher/modules → creates a new teacher module with questions.
 *
 * SECURITY: In production, verify teacher role via Supabase JWT claim.
 * For the demo, teacherId is passed as a query/body param. Add JWT validation before going live.
 * To test: POST with { teacherId, module_name, description, questions: [...] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';
import type { ModuleFormData, QuestionFormData } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();

  // ─── GET: List teacher modules ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { teacherId } = req.query;
    if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId query param', 400);

    const { data, error } = await supabase
      .from('modules')
      .select(`
        module_id, module_name, description, module_type, is_locked,
        exp_bonus_percent, created_at,
        questions ( question_id )
      `)
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (error) return err(res, 'Failed to fetch modules', 500);

    const modules = (data ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      question_count: Array.isArray(m.questions) ? (m.questions as unknown[]).length : 0,
      questions: undefined,
    }));

    return res.status(200).json({ modules });
  }

  // ─── POST: Create teacher module with questions ─────────────────────────────
  if (req.method === 'POST') {
    const { teacherId, module_name, description, course_id, exp_bonus_percent, questions } = req.body ?? {} as {
      teacherId: unknown;
      module_name: unknown;
      description?: unknown;
      course_id?: unknown;
      exp_bonus_percent?: unknown;
      questions: QuestionFormData[];
    };

    if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId', 400);
    if (!isNonEmptyString(module_name)) return err(res, 'module_name is required', 400);
    if (!Array.isArray(questions) || questions.length === 0) {
      return err(res, 'questions must be a non-empty array', 400);
    }

    // Verify teacher exists and has correct role
    const { data: teacher, error: tErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', teacherId)
      .single();

    if (tErr || !teacher) return err(res, 'Teacher not found', 404);
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
      return err(res, 'Forbidden: only teachers and admins can create modules', 403);
    }

    // Create module
    const { data: newModule, error: modErr } = await supabase
      .from('modules')
      .insert({
        module_name: String(module_name).trim(),
        description: description ? String(description).trim() : null,
        course_id: isValidUUID(course_id) ? course_id : null,
        created_by: teacherId,
        module_type: 'teacher',
        is_locked: false,
        exp_bonus_percent: typeof exp_bonus_percent === 'number' ? Math.max(0, exp_bonus_percent) : 0,
      })
      .select('module_id')
      .single();

    if (modErr || !newModule) {
      console.error('[POST /teacher/modules] Module insert error:', modErr?.message);
      return err(res, 'Failed to create module', 500);
    }

    // Insert questions and options
    const moduleId = newModule.module_id;
    for (const q of questions as QuestionFormData[]) {
      if (!isNonEmptyString(q.question_text)) continue;
      if (!Array.isArray(q.options) || q.options.length < 2) continue;

      const { data: newQ, error: qErr } = await supabase
        .from('questions')
        .insert({
          module_id: moduleId,
          question_text: q.question_text.trim(),
          difficulty: q.difficulty ?? 1,
          explanation: q.explanation ?? null,
          created_by: teacherId,
        })
        .select('question_id')
        .single();

      if (qErr || !newQ) continue;

      const optionRows = q.options.map((o) => ({
        question_id: newQ.question_id,
        option_key: o.option_key,
        option_text: o.option_text,
        is_correct: Boolean(o.is_correct),
      }));
      await supabase.from('question_options').insert(optionRows);
    }

    return res.status(201).json({ module_id: moduleId, message: 'Module created successfully' });
  }

  methodNotAllowed(req, res, ['GET', 'POST']);
}
