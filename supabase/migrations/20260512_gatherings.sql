-- VenturePath · Phase 2 · Gatherings (Event Planner)
-- Depends on: 20260512_profiles_auth.sql (public.profiles table + set_updated_at)
--
-- Ordering: tables first (no policies), then helper functions, then policies
-- and cross-table FKs. This avoids "relation does not exist" errors caused by
-- policies referencing tables that have not yet been created.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLES (no policies yet)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.gatherings (
  id               uuid        primary key default gen_random_uuid(),
  convener_id      uuid        not null references public.profiles(id) on delete cascade,
  trip_id          text,
  title            text        not null,
  template_id      text        not null default 'custom'
                               check (template_id in (
                                 'campfire','summit_push','basecamp_dinner',
                                 'stargaze','trail_crew','ritual_sendoff','custom'
                               )),
  vibe_tag         text,
  banner_url       text,
  accent_color     text,
  icon             text,
  location_label   text,
  coords           double precision[],
  coords_radius_m  integer     not null default 0,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  timezone         text,
  privacy          text        not null default 'squad'
                               check (privacy in ('squad','invite','public_listed','public_open')),
  status           text        not null default 'scheduled'
                               check (status in ('draft','scheduled','live','completed','cancelled')),
  custom_fields    jsonb       not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.gathering_arc_blocks (
  id           uuid        primary key default gen_random_uuid(),
  gathering_id uuid        not null references public.gatherings(id) on delete cascade,
  ord          integer     not null default 0,
  starts_at    timestamptz,
  duration_min integer,
  title        text        not null,
  note         text,
  role_id      uuid
);

create table if not exists public.gathering_roles (
  id           uuid    primary key default gen_random_uuid(),
  gathering_id uuid    not null references public.gatherings(id) on delete cascade,
  label        text    not null,
  description  text,
  claimable    boolean not null default true,
  max_claims   integer not null default 1,
  assigned_to  uuid    references public.profiles(id)
);

create table if not exists public.gathering_attendees (
  id             uuid        primary key default gen_random_uuid(),
  gathering_id   uuid        not null references public.gatherings(id) on delete cascade,
  pioneer_id     uuid        not null references public.profiles(id) on delete cascade,
  rsvp_status    text        not null default 'pending'
                             check (rsvp_status in ('yes','no','maybe','pending')),
  invited_by     uuid        references public.profiles(id),
  invited_at     timestamptz not null default now(),
  responded_at   timestamptz,
  role_ids       uuid[]      not null default '{}',
  unique (gathering_id, pioneer_id)
);

create table if not exists public.gathering_gear (
  id           uuid    primary key default gen_random_uuid(),
  gathering_id uuid    not null references public.gatherings(id) on delete cascade,
  item         text    not null,
  qty          integer not null default 1,
  claimed_by   uuid    references public.profiles(id),
  category     text,
  weight_kg    real,
  source       text    not null default 'manual'
                       check (source in ('manual','packing_manifest','wc_recipe'))
);

-- REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT
create table if not exists public.gathering_beacons (
  id           uuid        primary key default gen_random_uuid(),
  gathering_id uuid        not null references public.gatherings(id) on delete cascade,
  pioneer_id   uuid        not null references public.profiles(id) on delete cascade,
  kind         text        not null default 'enroute'
                           check (kind in ('arrived','late','enroute','sos')),
  coords       double precision[],
  eta          timestamptz,
  created_at   timestamptz not null default now()
);

-- REQUIRES UGC POLICY LINK IN APP STORE METADATA
create table if not exists public.gathering_reports (
  id           uuid        primary key default gen_random_uuid(),
  gathering_id uuid        not null references public.gatherings(id) on delete cascade,
  reporter_id  uuid        not null references public.profiles(id) on delete cascade,
  reason       text        not null,
  note         text,
  status       text        not null default 'open'
                           check (status in ('open','reviewed','dismissed')),
  created_at   timestamptz not null default now(),
  unique (gathering_id, reporter_id)
);

-- Cross-table FK: arc_blocks.role_id → roles.id (added now that both exist)
alter table public.gathering_arc_blocks
  drop constraint if exists fk_arc_role;
alter table public.gathering_arc_blocks
  add constraint fk_arc_role foreign key (role_id)
  references public.gathering_roles(id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

create index if not exists idx_gatherings_convener on public.gatherings(convener_id);
create index if not exists idx_gatherings_trip     on public.gatherings(trip_id);
create index if not exists idx_gatherings_starts   on public.gatherings(starts_at);
create index if not exists idx_arc_gathering       on public.gathering_arc_blocks(gathering_id, ord);
create index if not exists idx_roles_gathering     on public.gathering_roles(gathering_id);
create index if not exists idx_attendees_gathering on public.gathering_attendees(gathering_id);
create index if not exists idx_attendees_pioneer   on public.gathering_attendees(pioneer_id);
create index if not exists idx_gear_gathering      on public.gathering_gear(gathering_id);
create index if not exists idx_beacons_gathering   on public.gathering_beacons(gathering_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

drop trigger if exists gatherings_updated_at on public.gatherings;
create trigger gatherings_updated_at
  before update on public.gatherings
  for each row execute procedure public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. HELPER FUNCTIONS (all referenced tables now exist)
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.can_view_gathering(g_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gatherings g
    where g.id = g_id
      and (
        g.convener_id = auth.uid()
        or g.privacy in ('public_listed', 'public_open')
        or exists (
          select 1 from public.gathering_attendees a
          where a.gathering_id = g.id and a.pioneer_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.is_gathering_convener(g_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gatherings g
    where g.id = g_id and g.convener_id = auth.uid()
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENABLE RLS + POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.gatherings           enable row level security;
alter table public.gathering_arc_blocks enable row level security;
alter table public.gathering_roles      enable row level security;
alter table public.gathering_attendees  enable row level security;
alter table public.gathering_gear       enable row level security;
alter table public.gathering_beacons    enable row level security;
alter table public.gathering_reports    enable row level security;

-- ─── gatherings ────────────────────────────────────────────────────────────

drop policy if exists "gatherings_select"  on public.gatherings;
create policy "gatherings_select"
  on public.gatherings for select to authenticated
  using (
    convener_id = auth.uid()
    or privacy in ('public_listed','public_open')
    or exists (
      select 1 from public.gathering_attendees a
      where a.gathering_id = id and a.pioneer_id = auth.uid()
    )
  );

drop policy if exists "gatherings_insert" on public.gatherings;
create policy "gatherings_insert"
  on public.gatherings for insert to authenticated
  with check (convener_id = auth.uid());

drop policy if exists "gatherings_update" on public.gatherings;
create policy "gatherings_update"
  on public.gatherings for update to authenticated
  using (convener_id = auth.uid())
  with check (convener_id = auth.uid());

drop policy if exists "gatherings_delete" on public.gatherings;
create policy "gatherings_delete"
  on public.gatherings for delete to authenticated
  using (convener_id = auth.uid());

-- ─── arc_blocks ────────────────────────────────────────────────────────────

drop policy if exists "arc_blocks_select" on public.gathering_arc_blocks;
create policy "arc_blocks_select"
  on public.gathering_arc_blocks for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "arc_blocks_write" on public.gathering_arc_blocks;
create policy "arc_blocks_write"
  on public.gathering_arc_blocks for all to authenticated
  using (is_gathering_convener(gathering_id))
  with check (is_gathering_convener(gathering_id));

-- ─── roles ─────────────────────────────────────────────────────────────────

drop policy if exists "roles_select" on public.gathering_roles;
create policy "roles_select"
  on public.gathering_roles for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "roles_write" on public.gathering_roles;
create policy "roles_write"
  on public.gathering_roles for all to authenticated
  using (is_gathering_convener(gathering_id))
  with check (is_gathering_convener(gathering_id));

drop policy if exists "roles_claim" on public.gathering_roles;
create policy "roles_claim"
  on public.gathering_roles for update to authenticated
  using (
    can_view_gathering(gathering_id)
    and claimable
    and (assigned_to is null or assigned_to = auth.uid())
  )
  with check (can_view_gathering(gathering_id));

-- ─── attendees ─────────────────────────────────────────────────────────────

drop policy if exists "attendees_select" on public.gathering_attendees;
create policy "attendees_select"
  on public.gathering_attendees for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "attendees_convener_write" on public.gathering_attendees;
create policy "attendees_convener_write"
  on public.gathering_attendees for all to authenticated
  using (is_gathering_convener(gathering_id))
  with check (is_gathering_convener(gathering_id));

drop policy if exists "attendees_self_rsvp" on public.gathering_attendees;
create policy "attendees_self_rsvp"
  on public.gathering_attendees for update to authenticated
  using (pioneer_id = auth.uid())
  with check (pioneer_id = auth.uid());

-- Allow a Pioneer to insert their own attendee row (e.g. when accepting an invite link)
drop policy if exists "attendees_self_insert" on public.gathering_attendees;
create policy "attendees_self_insert"
  on public.gathering_attendees for insert to authenticated
  with check (pioneer_id = auth.uid());

-- ─── gear ──────────────────────────────────────────────────────────────────

drop policy if exists "gear_select" on public.gathering_gear;
create policy "gear_select"
  on public.gathering_gear for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "gear_write" on public.gathering_gear;
create policy "gear_write"
  on public.gathering_gear for all to authenticated
  using (is_gathering_convener(gathering_id))
  with check (is_gathering_convener(gathering_id));

drop policy if exists "gear_claim" on public.gathering_gear;
create policy "gear_claim"
  on public.gathering_gear for update to authenticated
  using (
    can_view_gathering(gathering_id)
    and (claimed_by is null or claimed_by = auth.uid())
  )
  with check (can_view_gathering(gathering_id));

-- ─── beacons ───────────────────────────────────────────────────────────────

drop policy if exists "beacons_select" on public.gathering_beacons;
create policy "beacons_select"
  on public.gathering_beacons for select to authenticated
  using (can_view_gathering(gathering_id));

drop policy if exists "beacons_insert" on public.gathering_beacons;
create policy "beacons_insert"
  on public.gathering_beacons for insert to authenticated
  with check (
    pioneer_id = auth.uid()
    and can_view_gathering(gathering_id)
  );

-- ─── reports ───────────────────────────────────────────────────────────────

drop policy if exists "reports_insert" on public.gathering_reports;
create policy "reports_insert"
  on public.gathering_reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reports_select_convener" on public.gathering_reports;
create policy "reports_select_convener"
  on public.gathering_reports for select to authenticated
  using (reporter_id = auth.uid() or is_gathering_convener(gathering_id));
