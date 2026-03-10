/**
 * pages/api/classes/index.ts — Public class listing for student enrollment.
 * GET /api/classes → returns all classes with teacher name and enrollment count.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('classes')
    .select(`
      class_id,
      class_name,
      created_at,
      teacher_id,
      users!classes_teacher_id_fkey ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) return err(res, 'Failed to fetch classes', 500);

  const classes = (data ?? []).map((c: Record<string, unknown>) => ({
    class_id: c.class_id,
    class_name: c.class_name,
    created_at: c.created_at,
    teacher_id: c.teacher_id,
    teacher_name: (c.users as { name: string } | null)?.name ?? 'Unknown',
  }));

  return res.status(200).json({ classes });
}
