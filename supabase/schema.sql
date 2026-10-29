-- =====================================================================
-- Personalized Travel Itinerary Planner : Supabase schema
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run (idempotent).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. user_preferences : saved defaults used to pre-fill the trip builder
-- ---------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  interests    text[]      not null default '{}',
  pace         text        not null default 'balanced' check (pace in ('relaxed','balanced','packed')),
  vibe         text        not null default 'culture',
  budget_level text        not null default 'mid'      check (budget_level in ('budget','mid','premium')),
  currency     text        not null default 'INR',
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. trips : one row per generated itinerary
-- ---------------------------------------------------------------------
create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  destination      text not null,
  start_date       date not null,
  end_date         date not null,
  travelers        int  not null default 1 check (travelers between 1 and 20),
  budget           numeric(14,2) not null default 0,
  currency         text not null default 'INR',
  budget_level     text not null default 'mid',
  pace             text not null default 'balanced',
  vibe             text not null default 'culture',
  interests        text[] not null default '{}',
  notes            text not null default '',
  summary          text not null default '',
  itinerary        jsonb  not null default '{}'::jsonb,
  estimated_cost   numeric(14,2) not null default 0,
  favorite         boolean not null default false,
  share_token      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint trips_dates_ok check (end_date >= start_date)
);

create index if not exists trips_user_created_idx on public.trips (user_id, created_at desc);
create unique index if not exists trips_share_token_idx on public.trips (share_token) where share_token is not null;

-- ---------------------------------------------------------------------
-- 3. keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

drop trigger if exists prefs_set_updated_at on public.user_preferences;
create trigger prefs_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
--    The FastAPI backend uses the service-role key (bypasses RLS) and always
--    filters by the authenticated user's id. RLS is a second safety net so the
--    public anon key can never read other people's data.
-- ---------------------------------------------------------------------
alter table public.trips            enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own trips" on public.trips;
create policy "Users manage own trips" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
