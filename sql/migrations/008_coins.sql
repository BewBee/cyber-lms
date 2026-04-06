-- Migration 008: Credits (coins) currency system
-- Adds a `coins` column to users for the in-game store.
-- Credits are earned alongside EXP on quiz completion and spent in /student/store.
-- Run in Supabase SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- Ensure existing students start with 0 (already handled by DEFAULT)
-- No data migration needed.
