/**
 * pages/api/assignments/[id]/submissions/index.ts — Submission management.
 * GET   /api/assignments/:id/submissions             → list all submissions (teacher), includes latest grader info
 * POST  /api/assignments/:id/submissions             → student submits work
 * PATCH /api/assignments/:id/submissions             → teacher grades a submission (writes to grades table + cache)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isNonEmptyString, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PATCH') return handlePatch(req, res);
  return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH']);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!isValidUUID(id)) return err(res, 'Invalid assignment id', 400);

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      assignment_id,
      student_id,
      file_url,
      grade,
      feedback,
      submitted_at,
      users!submissions_student_id_fkey ( id, name, email )
    `)
    .eq('assignment_id', id)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[GET /api/assignments/[id]/submissions] DB error:', error.message);
    return err(res, 'Failed to fetch submissions', 500);
  }

  const submissionIds = (data ?? []).map((s: Record<string, unknown>) => s.id as string);

  // Fetch the latest grading event per submission from the grades table
  const latestGradeMap: Record<string, { grade: string; feedback: string | null; graded_at: string; grader_name: string }> = {};

  if (submissionIds.length > 0) {
    const { data: gradesData } = await supabase
      .from('grades')
      .select('submission_id, grade, feedback, graded_at, users!grades_graded_by_fkey ( name )')
      .in('submission_id', submissionIds)
      .order('graded_at', { ascending: false });

    (gradesData ?? []).forEach((g: Record<string, unknown>) => {
      const sid = g.submission_id as string;
      // Keep only the first (latest) entry per submission
      if (!latestGradeMap[sid]) {
        latestGradeMap[sid] = {
          grade: g.grade as string,
          feedback: (g.feedback as string | null) ?? null,
          graded_at: g.graded_at as string,
          grader_name: ((g.users as { name: string } | null)?.name) ?? 'Unknown',
        };
      }
    });
  }

  // Merge into submissions response
  const submissions = (data ?? []).map((s: Record<string, unknown>) => {
    const latest = latestGradeMap[s.id as string] ?? null;
    return {
      id: s.id,
      assignment_id: s.assignment_id,
      student_id: s.student_id,
      file_url: s.file_url,
      grade: s.grade,
      feedback: s.feedback,
      submitted_at: s.submitted_at,
      graded_by_name: latest?.grader_name ?? null,
      graded_at: latest?.graded_at ?? null,
      student: s.users,
    };
  });

  return res.status(200).json({ submissions });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!isValidUUID(id)) return err(res, 'Invalid assignment id', 400);

  const { student_id, file_url } = req.body ?? {};
  if (!isValidUUID(student_id)) return err(res, 'Invalid student_id', 400);

  const supabase = getServiceClient();

  // Verify assignment exists
  const { data: assignment, error: assignError } = await supabase
    .from('assignments')
    .select('id')
    .eq('id', id)
    .single();

  if (assignError || !assignment) {
    return err(res, 'Assignment not found', 404);
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        assignment_id: id,
        student_id,
        file_url: isNonEmptyString(file_url) ? file_url.trim() : null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[POST /api/assignments/[id]/submissions] DB error:', error.message);
    return err(res, 'Failed to submit', 500);
  }

  return res.status(201).json({ submission: data });
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!isValidUUID(id)) return err(res, 'Invalid assignment id', 400);

  const { submission_id, grade, feedback, graded_by } = req.body ?? {};
  if (!isValidUUID(submission_id)) return err(res, 'Invalid submission_id', 400);
  if (!isNonEmptyString(grade)) return err(res, 'grade is required', 400);
  if (!isValidUUID(graded_by)) return err(res, 'graded_by (teacher UUID) is required', 400);

  const supabase = getServiceClient();

  // Update the denormalized cache on submissions
  const { data, error } = await supabase
    .from('submissions')
    .update({
      grade: grade.trim(),
      feedback: isNonEmptyString(feedback) ? feedback.trim() : null,
    })
    .eq('id', submission_id)
    .eq('assignment_id', id)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/assignments/[id]/submissions] DB error:', error.message);
    return err(res, 'Failed to grade submission', 500);
  }

  // Insert into grades audit table
  const { error: gradeErr } = await supabase.from('grades').insert({
    submission_id,
    graded_by,
    grade: grade.trim(),
    feedback: isNonEmptyString(feedback) ? feedback.trim() : null,
  });

  if (gradeErr) {
    // Non-fatal: log but don't fail the request — cache is already updated
    console.error('[PATCH /api/assignments/[id]/submissions] grades insert error:', gradeErr.message);
  }

  return res.status(200).json({ submission: data });
}
