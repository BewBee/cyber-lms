/**
 * pages/api/teacher/assignments/index.ts — CRUD for teacher-created assignments.
 * GET  /api/teacher/assignments?teacherId=<uuid>  → list assignments for teacher's modules
 * POST /api/teacher/assignments                   → create a new assignment
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '@/lib/supabaseClient';
import { err, methodNotAllowed, isNonEmptyString, isValidUUID } from '@/lib/apiHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return methodNotAllowed(req, res, ['GET', 'POST']);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { teacherId } = req.query;
  if (!isValidUUID(teacherId)) {
    return err(res, 'Missing or invalid teacherId', 400);
  }

  const supabase = getServiceClient();

  // Get all module IDs belonging to this teacher
  const { data: modules, error: modError } = await supabase
    .from('modules')
    .select('module_id')
    .eq('created_by', teacherId);

  if (modError) {
    console.error('[GET /api/teacher/assignments] modules error:', modError.message);
    return err(res, 'Failed to fetch modules', 500);
  }

  const moduleIds = (modules ?? []).map((m: { module_id: string }) => m.module_id);

  if (moduleIds.length === 0) {
    return res.status(200).json({ assignments: [] });
  }

  const { data, error } = await supabase
    .from('assignments')
    .select('id, module_id, title, instructions, due_date, created_by, created_at')
    .in('module_id', moduleIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/teacher/assignments] DB error:', error.message);
    return err(res, 'Failed to fetch assignments', 500);
  }

  return res.status(200).json({ assignments: data ?? [] });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { module_id, title, instructions, due_date, created_by } = req.body ?? {};

  if (!isValidUUID(module_id)) return err(res, 'Invalid module_id', 400);
  if (!isNonEmptyString(title)) return err(res, 'title is required', 400);
  if (!isValidUUID(created_by)) return err(res, 'Invalid created_by', 400);

  const supabase = getServiceClient();

  // Verify the module belongs to this teacher
  const { data: mod, error: modError } = await supabase
    .from('modules')
    .select('module_id, module_type')
    .eq('module_id', module_id)
    .eq('created_by', created_by)
    .single();

  if (modError || !mod) {
    return err(res, 'Module not found or not owned by this teacher', 403);
  }

  // Validate due_date if provided — must be a future ISO timestamp
  let parsedDueDate: string | null = null;
  if (isNonEmptyString(due_date)) {
    const d = new Date(due_date);
    if (isNaN(d.getTime())) return err(res, 'Invalid due_date format', 400);
    parsedDueDate = d.toISOString();
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      module_id,
      title: title.trim(),
      instructions: isNonEmptyString(instructions) ? instructions.trim() : null,
      due_date: parsedDueDate,
      created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/teacher/assignments] DB error:', error.message);
    return err(res, 'Failed to create assignment', 500);
  }

  return res.status(201).json({ assignment: data });
}
