/**
 * pages/api/teacher/modules/[id]/index.ts — Teacher module detail, update, and delete.
 * GET /api/teacher/modules/:id → full module with questions (teacher view, includes is_correct).
 * PUT /api/teacher/modules/:id → update module metadata + questions. Blocked for core modules.
 *
 * SECURITY: Teachers can only edit their own modules. Core modules are read-only.
 * To test: PUT /api/teacher/modules/{id} with { teacherId, module_name } — expect 200 on teacher module, 403 on core module.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: moduleId } = req.query;
  if (!isValidUUID(moduleId)) return err(res, 'Invalid module ID', 400);

  const supabase = getServiceClient();

  // ─── GET: Fetch module with full question data (teacher view) ───────────────
  if (req.method === 'GET') {
    const { data: module, error: modErr } = await supabase
      .from('modules')
      .select(`
        module_id, module_name, description, module_type, is_locked,
        exp_bonus_percent, created_at, created_by,
        questions (
          question_id, question_text, difficulty, explanation, created_at,
          question_options ( option_id, option_key, option_text, is_correct )
        )
      `)
      .eq('module_id', moduleId)
      .single();

    if (modErr || !module) return err(res, 'Module not found', 404);
    return res.status(200).json({ module });
  }

  // ─── PUT: Update teacher module ─────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { teacherId, module_name, description, exp_bonus_percent, questions } = req.body ?? {};

    if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId', 400);

    // Fetch existing module to check ownership and type
    const { data: existing, error: exErr } = await supabase
      .from('modules')
      .select('module_type, created_by, is_locked')
      .eq('module_id', moduleId)
      .single();

    if (exErr || !existing) return err(res, 'Module not found', 404);

    // Block edits on core modules
    if (existing.module_type === 'core') {
      return err(res, 'Core modules cannot be edited by teachers', 403);
    }

    // Block edits on locked modules
    if (existing.is_locked) {
      return err(res, 'This module is locked and cannot be edited', 403);
    }

    // Only the creator or admin can edit
    if (existing.created_by !== teacherId) {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', teacherId)
        .single();
      if (!user || user.role !== 'admin') {
        return err(res, 'Forbidden: you can only edit your own modules', 403);
      }
    }

    // ── Update module metadata ──────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {};
    if (isNonEmptyString(module_name)) updatePayload.module_name = module_name.trim();
    if (description !== undefined) updatePayload.description = String(description).trim() || null;
    if (typeof exp_bonus_percent === 'number') {
      updatePayload.exp_bonus_percent = Math.max(0, exp_bonus_percent);
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: upErr } = await supabase
        .from('modules')
        .update(updatePayload)
        .eq('module_id', moduleId);

      if (upErr) return err(res, 'Failed to update module', 500);
    }

    // ── Update questions if provided ────────────────────────────────────────
    // For each question with a question_id: update text/options in-place.
    // For each question without a question_id: insert as new.
    // Questions absent from the payload are left untouched to preserve
    // historical attempt data (ON DELETE RESTRICT would block removal anyway).
    if (Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        if (!isNonEmptyString(q.question_text)) {
          return err(res, 'Each question must have non-empty question_text', 400);
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          return err(res, 'Each question must have exactly 4 options', 400);
        }

        const difficulty = Math.max(1, Math.min(5, parseInt(String(q.difficulty)) || 1));
        const explanation = isNonEmptyString(q.explanation) ? String(q.explanation).trim() : null;

        if (isValidUUID(q.question_id)) {
          // ── Existing question: update text + replace options ──────────────
          await supabase
            .from('questions')
            .update({ question_text: q.question_text.trim(), difficulty, explanation })
            .eq('question_id', q.question_id)
            .eq('module_id', moduleId); // ownership guard

          // Replacing options is safe: attempts store the option letter (A-D),
          // not the option_id, so deleting and re-inserting options is non-destructive.
          await supabase.from('question_options').delete().eq('question_id', q.question_id);

          await supabase.from('question_options').insert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q.options.map((o: any) => ({
              question_id: q.question_id,
              option_key: String(o.option_key).toUpperCase(),
              option_text: String(o.option_text).trim(),
              is_correct: Boolean(o.is_correct),
            }))
          );
        } else {
          // ── New question: insert ────────────────────────────────────────
          const { data: newQ, error: newQErr } = await supabase
            .from('questions')
            .insert({
              module_id: moduleId,
              created_by: teacherId,
              question_text: q.question_text.trim(),
              difficulty,
              explanation,
            })
            .select('question_id')
            .single();

          if (newQErr || !newQ) {
            console.error('[PUT /api/teacher/modules/:id] Insert question error:', newQErr?.message);
            continue; // Non-fatal: skip this question rather than failing the whole request
          }

          await supabase.from('question_options').insert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q.options.map((o: any) => ({
              question_id: newQ.question_id,
              option_key: String(o.option_key).toUpperCase(),
              option_text: String(o.option_text).trim(),
              is_correct: Boolean(o.is_correct),
            }))
          );
        }
      }
    }

    return res.status(200).json({ module_id: moduleId, message: 'Module updated successfully' });
  }

  methodNotAllowed(req, res, ['GET', 'PUT']);
}
