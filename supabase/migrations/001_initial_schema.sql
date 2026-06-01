-- ============================================================
-- 001_initial_schema.sql
-- Execute manually in Supabase dashboard → SQL Editor.
-- ============================================================

-- ============================================================
-- USERS
-- Mirrors auth.users. Auto-populated by handle_new_user trigger.
-- ============================================================

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  is_paid boolean default false not null,
  stripe_customer_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can only read their own row
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own row
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Note: new user rows are created in app code (src/lib/auth.js)
-- via upsert on sign-in rather than a database trigger.
-- Supabase free tier Auth Hooks are not used.

-- ============================================================
-- RESUME PROFILES
-- One row per user. Stores parsed resume data as JSONB.
-- raw_text is optional — can be null for privacy.
-- ============================================================

create table public.resume_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  raw_text text,
  parsed_skills jsonb,
  parsed_soft_skills jsonb,
  updated_at timestamptz default now() not null,
  unique(user_id)
);

-- Enable RLS
alter table public.resume_profiles enable row level security;

-- Users can only read their own profile
create policy "Users can view own resume profile"
  on public.resume_profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own profile
create policy "Users can insert own resume profile"
  on public.resume_profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own profile
create policy "Users can update own resume profile"
  on public.resume_profiles for update
  using (auth.uid() = user_id);
