-- Migration 006: Add codename/handle to users
-- Run in Supabase SQL Editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS codename TEXT;

-- Optional: unique index so two students can't pick the same handle
-- CREATE UNIQUE INDEX IF NOT EXISTS users_codename_unique ON public.users (codename)
-- WHERE codename IS NOT NULL;

-- Recreate leaderboard_view to include codename
-- Must DROP first because CREATE OR REPLACE cannot change column order
DROP VIEW IF EXISTS leaderboard_view;

CREATE VIEW leaderboard_view AS
SELECT
  u.id,
  u.name,
  u.total_exp,
  u.level,
  u.badge_icon,
  COUNT(DISTINCT gs.session_id)                         AS total_sessions,
  ROUND(COALESCE(AVG(gs.accuracy), 0)::NUMERIC, 2)     AS avg_accuracy,
  ROW_NUMBER() OVER (ORDER BY u.total_exp DESC)         AS rank_position,
  u.codename
FROM users u
LEFT JOIN game_sessions gs
  ON u.id = gs.student_id
  AND gs.finished_at IS NOT NULL
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.codename, u.total_exp, u.level, u.badge_icon;
