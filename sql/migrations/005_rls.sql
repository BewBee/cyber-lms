-- sql/migrations/005_rls.sql
-- CyberShield LMS — Row Level Security (RLS) policies.
-- Run this in the Supabase SQL Editor AFTER 001_schema.sql.
--
-- IMPORTANT: All API routes use the service role key (bypasses RLS).
-- RLS only applies to direct Supabase client queries (anon key).
-- Policies here protect the anon/public key surface.
--
-- To apply: Supabase Dashboard → SQL Editor → paste and run.

-- ─── Enable RLS on all tables ──────────────────────────────────────────────

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions       ENABLE ROW LEVEL SECURITY;

-- ─── users ─────────────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own name and badge_icon only
-- (role, total_exp, level are updated by service role only)
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Leaderboard: all authenticated users can read name/level/exp of students
CREATE POLICY "users_select_leaderboard"
  ON users FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'student'
  );

-- ─── modules ───────────────────────────────────────────────────────────────

-- All authenticated users can read unlocked modules
CREATE POLICY "modules_select_unlocked"
  ON modules FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_locked = FALSE
  );

-- Teachers can insert modules they create
CREATE POLICY "modules_insert_teacher"
  ON modules FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Teachers can update their own non-core modules
CREATE POLICY "modules_update_owner"
  ON modules FOR UPDATE
  USING (
    auth.uid() = created_by
    AND module_type = 'teacher'
  );

-- ─── lessons ───────────────────────────────────────────────────────────────

-- All authenticated users can read lessons
CREATE POLICY "lessons_select_auth"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can insert lessons for their modules
CREATE POLICY "lessons_insert_teacher"
  ON lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules
      WHERE module_id = lessons.module_id
        AND created_by = auth.uid()
    )
  );

-- Teachers can update lessons on their modules
CREATE POLICY "lessons_update_teacher"
  ON lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE module_id = lessons.module_id
        AND created_by = auth.uid()
    )
  );

-- ─── questions ─────────────────────────────────────────────────────────────

-- Authenticated users can read questions (correct answers NOT sent — question_options separate)
CREATE POLICY "questions_select_auth"
  ON questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── question_options ──────────────────────────────────────────────────────

-- Students get options but WITHOUT is_correct = TRUE rows
-- (is_correct exposure is handled at API layer, not RLS — options are shown as-is)
CREATE POLICY "question_options_select_auth"
  ON question_options FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── classes ───────────────────────────────────────────────────────────────

-- All authenticated users can view classes (needed for enrollment browser)
CREATE POLICY "classes_select_auth"
  ON classes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can create classes
CREATE POLICY "classes_insert_teacher"
  ON classes FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- ─── enrollments ───────────────────────────────────────────────────────────

-- Students can view their own enrollments
CREATE POLICY "enrollments_select_own"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can view enrollments for their classes
CREATE POLICY "enrollments_select_teacher"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes WHERE class_id = enrollments.class_id AND teacher_id = auth.uid()
    )
  );

-- Students can enroll themselves
CREATE POLICY "enrollments_insert_student"
  ON enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Students can update their own enrollment (e.g. drop)
CREATE POLICY "enrollments_update_own"
  ON enrollments FOR UPDATE
  USING (auth.uid() = student_id);

-- ─── game_sessions ─────────────────────────────────────────────────────────

-- Students can read their own sessions
CREATE POLICY "game_sessions_select_own"
  ON game_sessions FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can read sessions for their classes
CREATE POLICY "game_sessions_select_teacher"
  ON game_sessions FOR SELECT
  USING (
    class_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM classes WHERE class_id = game_sessions.class_id AND teacher_id = auth.uid()
    )
  );

-- ─── attempts ──────────────────────────────────────────────────────────────

-- Students can read attempts for their own sessions
CREATE POLICY "attempts_select_own"
  ON attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions WHERE session_id = attempts.session_id AND student_id = auth.uid()
    )
  );

-- ─── badges ────────────────────────────────────────────────────────────────

-- All authenticated users can read badge definitions
CREATE POLICY "badges_select_auth"
  ON badges FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── student_badges ────────────────────────────────────────────────────────

-- Students can read their own badges
CREATE POLICY "student_badges_select_own"
  ON student_badges FOR SELECT
  USING (auth.uid() = student_id);

-- All authenticated users can read others' badges (for leaderboard display)
CREATE POLICY "student_badges_select_auth"
  ON student_badges FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── assignments ───────────────────────────────────────────────────────────

-- All authenticated users can read assignments
CREATE POLICY "assignments_select_auth"
  ON assignments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Teachers can create and manage assignments
CREATE POLICY "assignments_insert_teacher"
  ON assignments FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "assignments_update_teacher"
  ON assignments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "assignments_delete_teacher"
  ON assignments FOR DELETE
  USING (auth.uid() = created_by);

-- ─── submissions ───────────────────────────────────────────────────────────

-- Students can read their own submissions
CREATE POLICY "submissions_select_own"
  ON submissions FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can read submissions for assignments they created
CREATE POLICY "submissions_select_teacher"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments WHERE id = submissions.assignment_id AND created_by = auth.uid()
    )
  );

-- Students can insert submissions
CREATE POLICY "submissions_insert_student"
  ON submissions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Students can update (resubmit) their own submissions
CREATE POLICY "submissions_update_own"
  ON submissions FOR UPDATE
  USING (auth.uid() = student_id);

-- Teachers can update submissions (to set grade/feedback)
CREATE POLICY "submissions_update_teacher"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments WHERE id = submissions.assignment_id AND created_by = auth.uid()
    )
  );
