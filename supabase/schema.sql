-- ============================================================================
-- Sadhana Bhakti — Supabase schema
-- Run this once, top to bottom, in the Supabase SQL Editor (Project →
-- SQL Editor → New query) on a fresh project. Safe to re-run: every
-- statement is guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- One row per devotee/admin, keyed to Supabase Auth's own user id. This is
-- the single source of truth for identity — it replaces both
-- `data/mockDevotees.js` and the separate `localStorage["devoteeProfile"]`
-- the frontend prototype used.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  spiritual_name text,
  gurudev_name text,
  diksha_stage text check (diksha_stage in ('Initial', 'Harinaam', 'Gopal Mantra', 'Diksha')),
  initiation_date date,
  initiation_year text,
  sex text check (sex in ('Male', 'Female')),
  city text,
  mentor_name text,
  mobile_number text,
  centre text,
  role text not null default 'devotee' check (role in ('devotee', 'admin')),
  avatar_color text not null default 'maroon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per devotee/admin. id matches auth.users.id.';

-- ----------------------------------------------------------------------------
-- 2. SADHANA RECORDS
-- One row per devotee per date. total_mala is a generated column — it is
-- physically impossible to store one that doesn't equal on_asan +
-- without_asan, enforcing the "auto-calculated, never manually entered"
-- rule at the database level, not just in the UI.
-- ----------------------------------------------------------------------------
create table if not exists public.sadhana_records (
  id uuid primary key default gen_random_uuid(),
  devotee_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  name text, -- snapshot of the devotee's name at submission time

  wake_up_time time,
  gurudev_remembrance boolean,
  mangala_arati_done boolean,
  bhog_offered boolean,

  granth_read text[] not null default '{}',
  granth_other text,

  harikatha_sources text[] not null default '{}',
  harikatha_other text,

  gaudiya_kirtan boolean,

  mala_on_asan int not null default 0 check (mala_on_asan between 0 and 100),
  mala_without_asan int not null default 0 check (mala_without_asan between 0 and 100),
  total_mala int generated always as (mala_on_asan + mala_without_asan) stored,

  tulsi_seva boolean,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (devotee_id, date)
);

comment on table public.sadhana_records is 'One dated Sadhana report per devotee. total_mala is always mala_on_asan + mala_without_asan.';

create index if not exists sadhana_records_devotee_date_idx on public.sadhana_records (devotee_id, date desc);
create index if not exists sadhana_records_date_idx on public.sadhana_records (date);

-- ----------------------------------------------------------------------------
-- 3. AUTOFILL TEMPLATES
-- One reusable "usual day" template per devotee, entirely separate from
-- dated records — saving/updating this never touches sadhana_records.
-- ----------------------------------------------------------------------------
create table if not exists public.autofill_templates (
  devotee_id uuid primary key references public.profiles (id) on delete cascade,

  wake_up_time time,
  gurudev_remembrance boolean,
  mangala_arati_done boolean,
  bhog_offered boolean,

  granth_read text[] not null default '{}',
  granth_other text,

  harikatha_sources text[] not null default '{}',
  harikatha_other text,

  gaudiya_kirtan boolean,

  mala_on_asan int not null default 0 check (mala_on_asan between 0 and 100),
  mala_without_asan int not null default 0 check (mala_without_asan between 0 and 100),

  tulsi_seva boolean,

  updated_at timestamptz not null default now()
);

comment on table public.autofill_templates is 'Per-devotee reusable template. Never written to by Sadhana submission — only by the autofill setup page.';

-- ----------------------------------------------------------------------------
-- 4. updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists sadhana_records_set_updated_at on public.sadhana_records;
create trigger sadhana_records_set_updated_at
  before update on public.sadhana_records
  for each row execute function public.set_updated_at();

drop trigger if exists autofill_templates_set_updated_at on public.autofill_templates;
create trigger autofill_templates_set_updated_at
  before update on public.autofill_templates
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Auto-create a profile row whenever someone signs up via Supabase Auth.
-- The frontend's signUp call passes first_name/last_name (and everything
-- else Register.jsx collects) in options.data — this trigger reads it back
-- out of auth.users.raw_user_meta_data.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, last_name, spiritual_name, gurudev_name,
    diksha_stage, initiation_date, initiation_year, sex, city,
    mentor_name, mobile_number
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'spiritual_name',
    new.raw_user_meta_data ->> 'gurudev_name',
    new.raw_user_meta_data ->> 'diksha_stage',
    nullif(new.raw_user_meta_data ->> 'initiation_date', '')::date,
    new.raw_user_meta_data ->> 'initiation_year',
    new.raw_user_meta_data ->> 'sex',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'mentor_name',
    new.raw_user_meta_data ->> 'mobile_number'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. Admin check helper (security definer so it can read profiles under RLS)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security
-- Devotees: full access to their own rows only.
-- Admins: read access to every devotee's rows (mentor/admin dashboard),
-- but still cannot edit another devotee's Sadhana data or autofill template
-- — matches "Admin should see actual submitted data" without granting
-- write access nobody asked for.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sadhana_records enable row level security;
alter table public.autofill_templates enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "sadhana_select_own_or_admin" on public.sadhana_records;
create policy "sadhana_select_own_or_admin"
  on public.sadhana_records for select
  using (devotee_id = auth.uid() or public.is_admin());

drop policy if exists "sadhana_insert_own" on public.sadhana_records;
create policy "sadhana_insert_own"
  on public.sadhana_records for insert
  with check (devotee_id = auth.uid());

drop policy if exists "sadhana_update_own" on public.sadhana_records;
create policy "sadhana_update_own"
  on public.sadhana_records for update
  using (devotee_id = auth.uid())
  with check (devotee_id = auth.uid());

drop policy if exists "autofill_select_own" on public.autofill_templates;
create policy "autofill_select_own"
  on public.autofill_templates for select
  using (devotee_id = auth.uid());

drop policy if exists "autofill_insert_own" on public.autofill_templates;
create policy "autofill_insert_own"
  on public.autofill_templates for insert
  with check (devotee_id = auth.uid());

drop policy if exists "autofill_update_own" on public.autofill_templates;
create policy "autofill_update_own"
  on public.autofill_templates for update
  using (devotee_id = auth.uid())
  with check (devotee_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. One-time: promote your own account to admin after you've signed up.
-- Run this manually (with your real email) once you've registered through
-- the app — nothing above does this automatically, on purpose.
-- ----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
