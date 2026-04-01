/**
 * pages/api/classes/[classId]/students.ts
 * GET  /api/classes/[classId]/students?teacherId= → list enrolled students
 * DELETE /api/classes/[classId]/students?teacherId=&studentId= → drop a student
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();
  const { classId } = req.query;

  if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);

  // Ownership check helper
  const verifyOwner = async (teacherId: unknown): Promise<boolean> => {
    if (!isValidUUID(teacherId)) return false;
    const { data } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('class_id', classId as string)
      .single();
    return data?.teacher_id === teacherId;
  };

  // ─── GET: List enrolled students ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const { teacherId } = req.query;
    if (!await verifyOwner(teacherId)) return err(res, 'Forbidden', 403);

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        enrollment_id,
        student_id,
        status,
        joined_at,
        users!enrollments_student_id_fkey ( name, email, total_exp, level )
      `)
      .eq('class_id', classId as string)
      .eq('status', 'approved')
      .order('joined_at', { ascending: true });

    if (error) return err(res, 'Failed to fetch students', 500);

    const students = (data ?? []).map((e: Record<string, unknown>) => {
      const u = e.users as { name: string; email: string; total_exp: number; level: number } | null;
      return {
        enrollment_id: e.enrollment_id,
        student_id: e.student_id,
        joined_at: e.joined_at,
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '',
        total_exp: u?.total_exp ?? 0,
        level: u?.level ?? 1,
      };
    });

    return res.status(200).json({ students });
  }

  // ─── DELETE: Drop a student from the class ────────────────────────────────────
  if (req.method === 'DELETE') {
    const { teacherId, studentId } = req.query;
    if (!await verifyOwner(teacherId)) return err(res, 'Forbidden', 403);
    if (!isValidUUID(studentId)) return err(res, 'Invalid studentId', 400);

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('class_id', classId as string)
      .eq('student_id', studentId as string);

    if (error) return err(res, 'Failed to drop student', 500);
    return res.status(200).json({ message: 'Student removed from class' });
  }

  methodNotAllowed(req, res, ['GET', 'DELETE']);
}
