-- VenturePath · Phase 1+2 · Gatherings Core
-- Adds: gatherings, gathering_attendees, gathering_arc_blocks,
--       gathering_roles, gathering_gear, gathering_beacons, gathering_reports
-- Depends on: 20260511_profiles_auth.sql

-- ══════════════════════════════════════════════════════════
-- 1. GATHERINGS
-- ══════════════════════════════════════════════════════════

create table if not exists public.gatherings (
  id               uuid        primary key default gen_random_uuid(),
  convener_id      uuid        not null references public.profiles(id) on delete cascade,
  trip_id          uuid,         -- optional link to a VenturePath expedition
  title            text        not null check (length(title) >= 2 and length(title) <= 120),
  template_id      text        not null default 'campfire',
  vibe_tag         text,
  banner_url       text,
  accent_color     text,
  icon             text,
  location_label   text,
  coords           geography(Point,4326),
  coords_radius_m  int         not null default 0,  -- 0 = exact, >0 = fuzzy
  starts_at        timestamptz,
  ends_at          timestamptz,
  timezone         text        not null default 'UTC',
  privacy          text        not null default 'squad'
                               check (privacy in ('squad','invite_only','public_listed','public_open')),
  status           text        not null default 'draft'
                               check (status in ('draft','scheduled','live','completed','cancelled')),
  custom_fields    jsonb       not null default '{}',
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists idx_gatherings_convener  on public.gatherings(convener_id);
create index if not exists idx_gatherings_starts_at on public.gatherings(starts_at);
create index if not exists idx_gatherings_status    on public.gatherings(status);

-- ══════════════════════════════════════════════════════════
-- 2. ATTENDEES
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_attendees (
  gathering_id  uuid  not null references public.gatherings(id) on delete cascade,
  pioneer_id    uuid  not null references public.profiles(id) on delete cascade,
  rsvp_status   text  not null default 'pending'
                      check (rsvp_status in ('pending','yes','no','maybe')),
  invited_by    uuid  references public.profiles(id) on delete set null,
  invited_at    timestamptz,
  responded_at  timestamptz,
  primary key (gathering_id, pioneer_id)
);

create index if not exists idx_attendees_pioneer on public.gathering_attendees(pioneer_id);

-- ══════════════════════════════════════════════════════════
-- 3. ARC BLOCKS  (event programme / timeline)
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_arc_blocks (
  id            uuid        primary key default gen_random_uuid(),
  gathering_id  uuid        not null references public.gatherings(id) on delete cascade,
  ord           int         not null default 0,
  starts_at     timestamptz,
  duration_min  int,
  title         text        not null,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_arc_gathering on public.gathering_arc_blocks(gathering_id, ord);

-- ══════════════════════════════════════════════════════════
-- 4. ROLES
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_roles (
  id            uuid  primary key default gen_random_uuid(),
  gathering_id  uuid  not null references public.gatherings(id) on delete cascade,
  label         text  not null,
  description   text,
  claimable     boolean not null default true,
  max_claims    int     not null default 1,
  assigned_to   uuid  references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_roles_gathering on public.gathering_roles(gathering_id);

-- ══════════════════════════════════════════════════════════
-- 5. GEAR
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_gear (
  id            uuid  primary key default gen_random_uuid(),
  gathering_id  uuid  not null references public.gatherings(id) on delete cascade,
  item          text  not null,
  qty           int   not null default 1,
  category      text,
  weight_kg     numeric(6,3),
  claimed_by    uuid  references public.profiles(id) on delete set null,
  source        text  not null default 'manual'
                      check (source in ('manual','packing_manifest','template')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_gear_gathering on public.gathering_gear(gathering_id);

-- ══════════════════════════════════════════════════════════
-- 6. BEACONS  (live location / ETA pulses)
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_beacons (
  id            uuid        primary key default gen_random_uuid(),
  gathering_id  uuid        not null references public.gatherings(id) on delete cascade,
  pioneer_id    uuid        not null references public.profiles(id) on delete cascade,
  kind          text        not null default 'eta'
                            check (kind in ('eta','location','sos','checkin')),
  coords        geography(Point,4326),
  eta           timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_beacons_gathering on public.gathering_beacons(gathering_id, created_at desc);

-- ══════════════════════════════════════════════════════════
-- 7. REPORTS
-- ══════════════════════════════════════════════════════════

create table if not exists public.gathering_reports (
  id            uuid        primary key default gen_random_uuid(),
  gathering_id  uuid        not null references public.gatherings(id) on delete cascade,
  reporter_id   uuid        not null references public.profiles(id) on delete cascade,
  reason        text        not null check (reason in ('spam','harassment','misinformation','inappropriate','other')),
  note          text,
  status        text        not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at    timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════
-- 8. RLS
-- ══════════════════════════════════════════════════════════

alter table public.gatherings           enable row level security;
alter table public.gathering_attendees  enable row level security;
alter table public.gathering_arc_blocks enable row level security;
alter table public.gathering_roles      enable row level security;
alter table public.gathering_gear       enable row level security;
alter table public.gathering_beacons    enable row level security;
alter table public.gathering_reports    enable row level security;

-- ── Helper: can the current user see this gathering? ──────

create or replace function public.can_view_gathering(g_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.gatherings g
    where g.id = g_id
      and (
        g.convener_id = auth.uid()
        or exists (
          select 1 from public.gathering_attendees a
          where a.gathering_id = g_id and a.pioneer_id = auth.uid()
        )
        or g.privacy in ('public_listed','public_open')
      )
  );
$$;

create or replace function public.is_gathering_convener(g_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.gatherings where id = g_id and convener_id = auth.uid()
  );
$$;

-- ── gatherings ───────────────────────────────────────────

drop policy if exists gatherings_select on public.gatherings;
create policy gatherings_select on public.gatherings
  for select to authenticated
  using (can_view_gathering(id));

drop policy if exists gatherings_insert on public.gatherings;
create policy gatherings_insert on public.gatherings
  for insert to authenticated
  with check (convener_id = auth.uid());

drop policy if exists gatherings_update on public.gatherings;
create policy gatherings_update on public.gatherings
  for update to authenticated
  using (convener_id = auth.uid())
  with check (convener_id = auth.uid());

drop policy if exists gatherings_delete on public.gatherings;
create policy gatherings_delete on public.gatherings
  for delete to authenticated
  using (convener_id = auth.uid());

-- ── attendees ────────────────────────────────────────────

drop policy if exists attendees_select on public.gathering_attendees;
create policy attendees_select on public.gathering_attendees
  for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists attendees_upsert on public.gathering_attendees;
create policy attendees_upsert on public.gathering_attendees
  for insert to authenticated
  with check (
    pioneer_id = auth.uid()
    or is_gathering_convener(gathering_id)
  );

drop policy if exists attendees_update on public.gathering_attendees;
create policy attendees_update on public.gathering_attendees
  for update to authenticated
  using (pioneer_id = auth.uid() or is_gathering_convener(gathering_id));

drop policy if exists attendees_delete on public.gathering_attendees;
create policy attendees_delete on public.gathering_attendees
  for delete to authenticated
  using (pioneer_id = auth.uid() or is_gathering_convener(gathering_id));

-- ── arc / roles / gear / beacons: convener manages, attendees read ──

drop policy if exists arc_select on public.gathering_arc_blocks;
create policy arc_select on public.gathering_arc_blocks
  for select to authenticated using (can_view_gathering(gathering_id));

drop policy if exists arc_write on public.gathering_arc_blocks;
create policy arc_write on public.gathering_arc_blocks
  for all to authenticated using (is_gathering_convener(gathering_id));

drop policy if exists roles_select on public.gathering_roles;
create policy roles_select on public.gathering_roles
  for select to authenticated using (can_view_gathering(gathering_id));

drop policy if exists roles_update_claim on public.gathering_roles;
create policy roles_update_claim on public.gathering_roles
  for update to authenticated
  using (can_view_gathering(gathering_id))
  with check (can_view_gathering(gathering_id));

drop policy if exists roles_write on public.gathering_roles;
create policy roles_write on public.gathering_roles
  for insert to authenticated with check (is_gathering_convener(gathering_id));

drop policy if exists roles_delete on public.gathering_roles;
create policy roles_delete on public.gathering_roles
  for delete to authenticated using (is_gathering_convener(gathering_id));

drop policy if exists gear_select on public.gathering_gear;
create policy gear_select on public.gathering_gear
  for select to authenticated using (can_view_gathering(gathering_id));

drop policy if exists gear_write on public.gathering_gear;
create policy gear_write on public.gathering_gear
  for all to authenticated using (is_gathering_convener(gathering_id));

drop policy if exists gear_update_claim on public.gathering_gear;
create policy gear_update_claim on public.gathering_gear
  for update to authenticated
  using (can_view_gathering(gathering_id))
  with check (can_view_gathering(gathering_id));

drop policy if exists beacons_select on public.gathering_beacons;
create policy beacons_select on public.gathering_beacons
  for select to authenticated using (can_view_gathering(gathering_id));

drop policy if exists beacons_insert on public.gathering_beacons;
create policy beacons_insert on public.gathering_beacons
  for insert to authenticated
  with check (pioneer_id = auth.uid() and can_view_gathering(gathering_id));

drop policy if exists reports_insert on public.gathering_reports;
create policy reports_insert on public.gathering_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- 9. REALTIME
-- ══════════════════════════════════════════════════════════

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.gathering_attendees;
    exception when duplicate_object then null;
    end;
  end if;
end$$;
