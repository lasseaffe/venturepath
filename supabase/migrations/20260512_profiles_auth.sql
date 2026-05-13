-- VenturePath · Phase 1 · Architect Profiles + Auth
-- Idempotent: safe to re-run even if a partial profiles table already exists.

-- ── PROFILES TABLE ──────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

-- Backfill columns one-by-one so an existing partial table is upgraded in place.
alter table public.profiles add column if not exists handle              text;
alter table public.profiles add column if not exists display_name        text;
alter table public.profiles add column if not exists avatar_url          text;
alter table public.profiles add column if not exists region              text;
alter table public.profiles add column if not exists region_coords       double precision[];
alter table public.profiles add column if not exists bio                 text;
alter table public.profiles add column if not exists sabbath_aware       boolean     not null default false;
alter table public.profiles add column if not exists verified            boolean     not null default false;
alter table public.profiles add column if not exists verified_at         timestamptz;
alter table public.profiles add column if not exists verification_source text;
alter table public.profiles add column if not exists created_at          timestamptz not null default now();
alter table public.profiles add column if not exists updated_at          timestamptz not null default now();

-- Backfill any null handles for legacy rows so we can make handle NOT NULL.
update public.profiles
   set handle = 'architect_' || substr(replace(id::text, '-', ''), 1, 8)
 where handle is null;

-- Make handle NOT NULL + unique. Both guarded so they are idempotent.
alter table public.profiles alter column handle set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_handle_key' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_handle_key unique (handle);
  end if;
end$$;

-- Handle format constraint
alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format
  check (handle ~ '^[a-z0-9_]{3,24}$');

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_blocked" on public.profiles;
create policy "profiles_insert_blocked"
  on public.profiles for insert to authenticated
  with check (false);

-- ── TRIGGER: auto-create draft profile on sign-up ───────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  draft_handle text;
begin
  draft_handle := 'architect_' || substr(replace(new.id::text, '-', ''), 1, 8);
  insert into public.profiles (id, handle)
  values (new.id, draft_handle)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── HELPER: handle availability check ───────────────────────────────────────

create or replace function public.is_handle_available(p_handle text)
returns boolean language sql stable security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where handle = lower(p_handle)
  );
$$;

-- ── GDPR: self-export view ───────────────────────────────────────────────────

create or replace view public.my_profile_export as
  select * from public.profiles
  where id = auth.uid();

-- ── UPDATED_AT helper + trigger ──────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
