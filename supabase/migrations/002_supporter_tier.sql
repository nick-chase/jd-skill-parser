-- ============================================================
-- 002_supporter_tier.sql
-- Execute manually in Supabase dashboard → SQL Editor.
-- Purely additive: new columns on public.users + new table
-- public.processed_stripe_events. Safely re-runnable.
-- ============================================================

-- ============================================================
-- USERS — Supporter tier columns
-- supporter_stripe_customer_id is intentionally separate from
-- stripe_customer_id (Pro) — structural isolation between
-- Pro and Supporter state. No constraint links is_paid and
-- is_supporter; they are orthogonal by design.
-- ============================================================

alter table public.users
  add column if not exists is_supporter boolean not null default false;

alter table public.users
  add column if not exists supporter_stripe_customer_id text;

alter table public.users
  add column if not exists supporter_term_started_at timestamptz;

alter table public.users
  add column if not exists supporter_term_ends_at timestamptz;

alter table public.users
  add column if not exists supporter_term_end_email_sent_at timestamptz;

-- ============================================================
-- PROCESSED STRIPE EVENTS
-- Idempotency ledger for Stripe webhook processing.
-- RLS enabled with no policies — service-role only access.
-- ============================================================

create table if not exists public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz default now() not null
);

alter table public.processed_stripe_events enable row level security;
