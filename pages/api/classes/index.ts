/**
 * pages/api/classes/index.ts — Class listing and creation.
 * GET  /api/classes → all classes with teacher name (for student enrollment browser).
 * GET  /api/classes?teacherId= → only classes owned by that teacher.
 * POST /api/classes → create a new class (teacher only).
 * DELETE /api/classes?classId=&teacherId= → delete a class (owner only).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isValidUUID, isNonEmptyString } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getServiceClient();

  // ─── GET: List classes ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { teacherId } = req.query;

    let query = supabase
      .from('classes')
      .select(`
        class_id,
        class_name,
        created_at,
        teacher_id,
        users!classes_teacher_id_fkey ( name ),
        enrollments ( enrollment_id, status )
      `)
      .order('created_at', { ascending: false });

    if (isValidUUID(teacherId)) {
      query = query.eq('teacher_id', teacherId as string);
    }

    const { data, error } = await query;
    if (error) return err(res, 'Failed to fetch classes', 500);

    const classes = (data ?? []).map((c: Record<string, unknown>) => {
      const enrollments = Array.isArray(c.enrollments) ? c.enrollments as { status: string }[] : [];
      return {
        class_id: c.class_id,
        class_name: c.class_name,
        created_at: c.created_at,
        teacher_id: c.teacher_id,
        teacher_name: (c.users as { name: string } | null)?.name ?? 'Unknown',
        student_count: enrollments.filter((e) => e.status === 'approved').length,
      };
    });

    return res.status(200).json({ classes });
  }

  // ─── POST: Create a class ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { teacherId, class_name } = req.body ?? {};

    if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId', 400);
    if (!isNonEmptyString(class_name)) return err(res, 'class_name is required', 400);

    // Verify teacher role
    const { data: teacher } = await supabase
      .from('users')
      .select('role')
      .eq('id', teacherId)
      .single();

    if (!teacher) return err(res, 'Teacher not found', 404);
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
      return err(res, 'Only teachers can create classes', 403);
    }

    const { data: newClass, error: insertErr } = await supabase
      .from('classes')
      .insert({ class_name: String(class_name).trim(), teacher_id: teacherId })
      .select('class_id, class_name, created_at, teacher_id')
      .single();

    if (insertErr || !newClass) return err(res, 'Failed to create class', 500);

    return res.status(201).json({ class: { ...newClass, student_count: 0 }, message: 'Class created' });
  }

  // ─── DELETE: Remove a class ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { classId, teacherId } = req.query;

    if (!isValidUUID(classId)) return err(res, 'Invalid classId', 400);
    if (!isValidUUID(teacherId)) return err(res, 'Invalid teacherId', 400);

    // Ownership check
    const { data: cls } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('class_id', classId)
      .single();

    if (!cls) return err(res, 'Class not found', 404);
    if (cls.teacher_id !== teacherId) return err(res, 'Forbidden', 403);

    const { error } = await supabase.from('classes').delete().eq('class_id', classId);
    if (error) return err(res, 'Failed to delete class', 500);

    return res.status(200).json({ message: 'Class deleted' });
  }

  methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
}
