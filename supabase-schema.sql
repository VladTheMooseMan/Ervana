-- ============================================================================
-- Ervana Sedengers Creature Compendium — Supabase Schema
-- ============================================================================
-- Run this ONCE in the Supabase SQL editor:
--   Dashboard → SQL Editor → New query → paste this → Run
-- ============================================================================

-- 4 tables, one per entity kind. Each row is a JSONB blob so we don't have
-- to maintain a rigid Postgres schema mirroring the TypeScript types.
create table if not exists cards (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

create table if not exists skills (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

create table if not exists damage_types (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

create table if not exists creature_types (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

-- ============================================================================
-- Row-Level Security: only signed-in users can read/write anything
-- ============================================================================
alter table cards          enable row level security;
alter table skills         enable row level security;
alter table damage_types   enable row level security;
alter table creature_types enable row level security;

-- Any authenticated user can do anything (shared library, single role)
create policy "authed_all_cards"          on cards          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authed_all_skills"         on skills         for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authed_all_damage_types"   on damage_types   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authed_all_creature_types" on creature_types for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
