/**
 * pages/api/enrollments/index.ts — Student class enrollment.
 * GET  /api/enrollments?studentId= → list student's enrollments with class info.
 * POST /api/enrollments → enroll student in a class (auto-approves).
 * DELETE /api/enrollments?studentId=&classId= → drop a class.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();

  // ─── GET: List student's current enrollments ────────────────────────────────
  if (req.method === 'GET') {
    const { studentId } = req.query;
    if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        enrollment_id,
        class_id,
        status,
        joined_at,
        classes ( class_name, teacher_id, users!classes_teacher_id_fkey ( name ) )
      `)
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false });

    if (error) return err(res, 'Failed to fetch enrollments', 500);

    const enrollments = (data ?? []).map((e: Record<string, unknown>) => {
      const cls = e.classes as Record<string, unknown> | null;
      return {
        enrollment_id: e.enrollment_id,
        class_id: e.class_id,
        status: e.status,
        joined_at: e.joined_at,
        class_name: cls?.class_name ?? 'Unknown',
        teacher_name: (cls?.users as { name: string } | null)?.name ?? 'Unknown',
      };
    });

    return res.status(200).json({ enrollments });
  }

  // ─── POST: Enroll in a class ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { studentId, classId } = req.body ?? {};

    if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);
    if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);

    // Verify student exists
    const { data: student } = await supabase
      .from('users')
      .select('role')
      .eq('id', studentId)
      .single();

    if (!student) return err(res, 'Student not found', 404);
    if (student.role !== 'student') return err(res, 'Only students can enroll in classes', 403);

    // Check class exists
    const { data: cls } = await supabase
      .from('classes')
      .select('class_id')
      .eq('class_id', classId)
      .single();

    if (!cls) return err(res, 'Class not found', 404);

    // Upsert enrollment (prevents duplicates — just re-activates if dropped)
    const { data: enrollment, error: enrollErr } = await supabase
      .from('enrollments')
      .upsert(
        { class_id: classId, student_id: studentId, status: 'approved' },
        { onConflict: 'class_id,student_id' }
      )
      .select('enrollment_id, status')
      .single();

    if (enrollErr) return err(res, 'Failed to enroll', 500);

    return res.status(201).json({ enrollment, message: 'Enrolled successfully' });
  }

  // ─── DELETE: Drop a class ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { studentId, classId } = req.query;

    if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);
    if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('student_id', studentId)
      .eq('class_id', classId);

    if (error) return err(res, 'Failed to drop class', 500);

    return res.status(200).json({ message: 'Dropped class successfully' });
  }

  methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
}
