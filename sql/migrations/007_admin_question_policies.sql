-- Migration 007: RLS policies for admin question management
-- Allows admins to INSERT / UPDATE / DELETE questions and question_options
-- via the browser (anon) client.
-- Run in Supabase SQL Editor.

-- ─── questions ─────────────────────────────────────────────────────────────

CREATE POLICY "questions_insert_admin"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "questions_update_admin"
  ON questions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "questions_delete_admin"
  ON questions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── question_options ──────────────────────────────────────────────────────

CREATE POLICY "question_options_insert_admin"
  ON question_options FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "question_options_update_admin"
  ON question_options FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "question_options_delete_admin"
  ON question_options FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
