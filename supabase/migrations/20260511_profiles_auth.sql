-- VenturePath · Auth + Profiles
-- Creates: profiles (auto-created on signup), helper RPCs
-- Must run before any other VP migration.

-- ══════════════════════════════════════════════════════════
-- 1. PROFILES
-- ══════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  handle          text        unique not null,
  display_name    text,
  avatar_url      text,
  region          text,
  sabbath_aware   boolean     not null default false,
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (true);  -- handles are public

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- 2. AUTO-CREATE PROFILE ON SIGN-UP
-- ══════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, handle)
  values (
    new.id,
    'architect_' || substr(replace(new.id::text, '-', ''), 1, 8)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════
-- 3. HELPER RPCS
-- ══════════════════════════════════════════════════════════

-- Check if a handle is available (used by Profile edit UI)
create or replace function public.is_handle_available(p_handle text)
returns boolean language sql stable security definer as $$
  select not exists (
    select 1 from public.profiles
    where handle = p_handle
      and id != coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
  );
$$;

-- Export view (GDPR / data portability)
create or replace view public.my_profile_export as
  select * from public.profiles where id = auth.uid();
