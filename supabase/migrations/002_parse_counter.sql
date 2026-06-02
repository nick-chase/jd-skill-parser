-- ============================================================
-- 002_parse_counter.sql
-- Execute manually in Supabase dashboard → SQL Editor.
-- Adds daily parse counter columns to public.users.
-- ============================================================

alter table public.users
  add column if not exists daily_parse_count integer default 0 not null,
  add column if not exists parse_count_reset_at timestamptz default now() not null;
