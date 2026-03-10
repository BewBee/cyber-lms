-- ============================================================
-- 004_auth_trigger.sql
-- Auto-creates a public.users row whenever a new Supabase Auth
-- user is registered. Role always defaults to 'student' for
-- security — promote to 'teacher' or 'admin' manually via the
-- Supabase dashboard or a future admin UI.
--
-- Run this in the Supabase SQL Editor ONCE before using auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, total_exp, level)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'student',   -- always student; promote via dashboard
    0,
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop if exists (safe re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_auth_user();
