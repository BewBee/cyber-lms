-- sql/migrations/001_schema.sql
-- CyberShield LMS — Initial database schema (Postgres / Supabase).
-- Implements 3NF-normalized schema with explicit FK constraints and indexes.
-- To apply: run in Supabase SQL Editor or via `psql $DATABASE_URL -f sql/migrations/001_schema.sql`

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

-- ─── ENUM-like check helpers used inline ──────────────────────────────────────

-- ─── 1. users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        UNIQUE NOT NULL,
  name            TEXT        NOT NULL,
  password_hash   TEXT        NULL,        -- nullable: use Supabase Auth in production
  role            TEXT        NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  total_exp       INTEGER     NOT NULL DEFAULT 0 CHECK (total_exp >= 0),
  level           INTEGER     NOT NULL DEFAULT 1 CHECK (level >= 1),
  badge_icon      TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast leaderboard sort and level filtering
CREATE INDEX IF NOT EXISTS idx_users_total_exp ON users (total_exp DESC);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users (role);

-- ─── 2. courses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  course_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name   TEXT        NOT NULL,
  description   TEXT        NULL,
  created_by    UUID        NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. modules ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  module_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID        NULL REFERENCES courses (course_id) ON DELETE SET NULL,
  module_name       TEXT        NOT NULL,
  description       TEXT        NULL,
  created_by        UUID        NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  module_type       TEXT        NOT NULL CHECK (module_type IN ('core', 'teacher')),
  is_locked         BOOLEAN     NOT NULL DEFAULT FALSE,
  exp_bonus_percent INTEGER     NOT NULL DEFAULT 0 CHECK (exp_bonus_percent >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules (course_id);
CREATE INDEX IF NOT EXISTS idx_modules_type      ON modules (module_type);

-- ─── 4. lessons ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  lesson_id     UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     UUID  NOT NULL REFERENCES modules (module_id) ON DELETE CASCADE,
  lesson_title  TEXT  NULL,
  content       TEXT  NULL
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons (module_id);

-- ─── 5. questions ─────────────────────────────────────────────────────────────
-- question_text is stored ONLY here — never duplicated in session tables.
CREATE TABLE IF NOT EXISTS questions (
  question_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     UUID        NOT NULL REFERENCES modules (module_id) ON DELETE CASCADE,
  question_text TEXT        NOT NULL,
  difficulty    SMALLINT    NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  explanation   TEXT        NULL,
  created_by    UUID        NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_module_id ON questions (module_id);

-- ─── 6. question_options ──────────────────────────────────────────────────────
-- Answer options (A–D) for each question. Enforces exactly one correct per question
-- via application logic (DB allows any count for flexibility).
CREATE TABLE IF NOT EXISTS question_options (
  option_id   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID    NOT NULL REFERENCES questions (question_id) ON DELETE CASCADE,
  option_key  CHAR(1) NOT NULL CHECK (option_key IN ('A','B','C','D')),
  option_text TEXT    NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (question_id, option_key)  -- prevent duplicate A/B/C/D per question
);

CREATE INDEX IF NOT EXISTS idx_qoptions_question_id ON question_options (question_id);

-- ─── 7. classes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  class_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name  TEXT        NOT NULL,
  teacher_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);

-- ─── 8. enrollments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID        NOT NULL REFERENCES classes (class_id) ON DELETE CASCADE,
  student_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status        TEXT        NOT NULL CHECK (status IN ('pending', 'approved', 'dropped')) DEFAULT 'pending',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)  -- prevent duplicate enrollment
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id   ON enrollments (class_id);

-- ─── 9. game_sessions ─────────────────────────────────────────────────────────
-- One row per quiz attempt. question_text NOT stored here — referenced via questions table.
CREATE TABLE IF NOT EXISTS game_sessions (
  session_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id             UUID          NOT NULL REFERENCES modules (module_id),
  class_id              UUID          NULL     REFERENCES classes (class_id),
  student_id            UUID          NOT NULL REFERENCES users (id),
  started_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  finished_at           TIMESTAMPTZ   NULL,
  total_score           INTEGER       NULL,
  accuracy              NUMERIC(5,2)  NULL CHECK (accuracy BETWEEN 0 AND 100),
  medal_awarded         TEXT          NULL CHECK (medal_awarded IN ('gold', 'silver', 'bronze', 'none')),
  exp_awarded           INTEGER       NULL DEFAULT 0,
  average_response_time NUMERIC(8,3)  NULL  -- milliseconds, 3 decimal places
);

-- Composite index for per-student/per-module history
CREATE INDEX IF NOT EXISTS idx_sessions_student_module ON game_sessions (student_id, module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student        ON game_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class          ON game_sessions (class_id);

-- ─── 10. attempts ─────────────────────────────────────────────────────────────
-- Per-question answer record within a session. References question_id (not question_text).
CREATE TABLE IF NOT EXISTS attempts (
  attempt_id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID    NOT NULL REFERENCES game_sessions (session_id) ON DELETE CASCADE,
  question_id       UUID    NOT NULL REFERENCES questions (question_id),
  selected_option   CHAR(1) NULL CHECK (selected_option IN ('A','B','C','D')),
  is_correct        BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms  INTEGER NOT NULL DEFAULT 0 CHECK (response_time_ms >= 0),
  streak_at_attempt INTEGER NOT NULL DEFAULT 0 CHECK (streak_at_attempt >= 0)
);

CREATE INDEX IF NOT EXISTS idx_attempts_session_id    ON attempts (session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question_id   ON attempts (question_id);

-- ─── 11. badges ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  badge_id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key          TEXT  UNIQUE NOT NULL,   -- e.g. 'first_mission', 'perfect_strike'
  badge_display_name TEXT  NOT NULL,
  badge_icon         TEXT  NOT NULL           -- path or emoji string
);

-- ─── 12. student_badges (many-to-many) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge_id    UUID        NOT NULL REFERENCES badges (badge_id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, badge_id)  -- each badge awarded once per student
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges (student_id);

-- ─── 13. Leaderboard View ─────────────────────────────────────────────────────
-- A dynamic VIEW (not a table) — no data duplication.
-- For high-traffic production, consider a MATERIALIZED VIEW with periodic REFRESH.
-- Usage: SELECT * FROM leaderboard_view LIMIT 50;
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  u.id,
  u.name,
  u.total_exp,
  u.level,
  u.badge_icon,
  COUNT(DISTINCT gs.session_id)                         AS total_sessions,
  ROUND(COALESCE(AVG(gs.accuracy), 0)::NUMERIC, 2)     AS avg_accuracy,
  ROW_NUMBER() OVER (ORDER BY u.total_exp DESC)         AS rank_position
FROM users u
LEFT JOIN game_sessions gs
  ON u.id = gs.student_id
  AND gs.finished_at IS NOT NULL
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.total_exp, u.level, u.badge_icon;

-- ─── Supabase RLS notes ───────────────────────────────────────────────────────
-- Row Level Security should be enabled on all tables in production.
-- Example policies (add in Supabase dashboard or via additional migration):
--
--   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "Users can read own profile"
--     ON users FOR SELECT USING (auth.uid() = id);
--
-- For the demo/dev environment, RLS is intentionally disabled so API routes
-- using the anon key can read seed data without auth.
