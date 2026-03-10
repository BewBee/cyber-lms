/**
 * Migration 003 — grades table
 * Adds an auditable grade-history table linked to submissions.
 *
 * The submissions.grade / submissions.feedback columns remain as a
 * denormalized cache for quick reads. Every grading event is also
 * written here so teachers have a full, timestamped history of who
 * graded what and when — useful for future GPA / weighted scoring.
 *
 * Run this entire block in the Supabase SQL Editor.
 */

CREATE TABLE IF NOT EXISTS grades (
  grade_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID         NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  graded_by     UUID         NOT NULL REFERENCES users (id)       ON DELETE RESTRICT,
  grade         VARCHAR(20)  NOT NULL CHECK (char_length(trim(grade)) > 0),
  feedback      TEXT,
  graded_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grades_submission ON grades (submission_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by  ON grades (graded_by);
