-- ============================================================
-- Phase 4: Public Discovery + Charter Publishing
-- Requires: profiles_auth.sql, gatherings.sql, gatherings_social.sql
-- ============================================================

-- ── 1. Verification columns on profiles ──────────────────────
alter table public.profiles
  add column if not exists verified           boolean   not null default false,
  add column if not exists verified_at        timestamptz,
  add column if not exists verification_source text
    check (verification_source in ('email','paid_clone','expedition_count','admin')),
  add column if not exists expedition_count   int       not null default 0,
  add column if not exists region_coords      geography(Point,4326);  -- for geo-feed centre

-- ── 2. Charter columns on gatherings ─────────────────────────
alter table public.gatherings
  add column if not exists charter_id         uuid      references public.gatherings(id) on delete set null,
  add column if not exists is_charter         boolean   not null default false,
  add column if not exists charter_clones     int       not null default 0,
  add column if not exists charter_attribution jsonb    default '{}';
-- charter_attribution: { original_gathering_id, original_title, convener_handle, published_at }

-- ── 3. Admin queue columns on gathering_reports ──────────────
alter table public.gathering_reports
  add column if not exists reviewed_by  uuid  references auth.users(id),
  add column if not exists reviewed_at  timestamptz,
  add column if not exists admin_note   text;

-- ── 4. Sabbath-aware tag on gatherings ───────────────────────
alter table public.gatherings
  add column if not exists sabbath_flagged boolean not null default false;

-- ── 5. Indexes ────────────────────────────────────────────────
-- Geo index for discovery feed
create index if not exists idx_gatherings_coords
  on public.gatherings using gist (coords);

create index if not exists idx_profiles_region_coords
  on public.profiles using gist (region_coords);

create index if not exists idx_gatherings_public_status
  on public.gatherings (privacy, status, starts_at)
  where privacy in ('public_listed','public_open');

create index if not exists idx_gatherings_charter
  on public.gatherings (is_charter) where is_charter = true;

-- ── 6. Verification helper ────────────────────────────────────
create or replace function public.is_architect_verified(a_id uuid)
returns boolean
language sql stable security definer
as $$
  select coalesce(
    (select verified from public.profiles where id = a_id),
    false
  );
$$;

-- Auto-verify by expedition_count threshold
create or replace function public.maybe_auto_verify()
returns trigger language plpgsql security definer as $$
begin
  if new.expedition_count >= 5 and not new.verified then
    new.verified := true;
    new.verified_at := now();
    new.verification_source := 'expedition_count';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_maybe_auto_verify on public.profiles;
create trigger trg_maybe_auto_verify
  before update of expedition_count on public.profiles
  for each row execute function public.maybe_auto_verify();

-- ── 7. Geo-discovery function ─────────────────────────────────
-- Returns public gatherings within radius_km of a lat/lon point.
-- Non-attendees receive an approximate centroid (snapped to radius_m grid),
-- not the exact coords — exact coords returned only if viewer is an attendee.
create or replace function public.discover_gatherings(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_km  int     default 50,
  p_cursor     timestamptz default null,   -- for keyset pagination
  p_limit      int     default 20,
  p_sabbath_filter boolean default false   -- if true, exclude Sunday-start gatherings
)
returns table (
  id                uuid,
  title             text,
  template_id       text,
  vibe_tag          text,
  banner_url        text,
  accent_color      text,
  icon              text,
  location_label    text,
  -- approximate coords (snapped to 500m grid for non-attendees):
  approx_lat        double precision,
  approx_lng        double precision,
  coords_radius_m   int,
  starts_at         timestamptz,
  ends_at           timestamptz,
  privacy           text,
  status            text,
  convener_handle   text,
  convener_id       uuid,
  is_attendee       boolean,
  attendee_count    bigint,
  distance_m        double precision
)
language sql stable security definer
as $$
  with viewer as (
    select auth.uid() as uid
  ),
  base as (
    select
      g.id,
      g.title,
      g.template_id,
      g.vibe_tag,
      g.banner_url,
      g.accent_color,
      g.icon,
      g.location_label,
      g.coords,
      g.coords_radius_m,
      g.starts_at,
      g.ends_at,
      g.privacy,
      g.status,
      g.sabbath_flagged,
      p.handle as convener_handle,
      g.convener_id,
      ST_Distance(
        g.coords,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) as distance_m,
      exists(
        select 1 from public.gathering_attendees a
        where a.gathering_id = g.id
          and a.pioneer_id = (select uid from viewer)
          and a.rsvp_status = 'yes'
      ) as is_attendee,
      (
        select count(*) from public.gathering_attendees a2
        where a2.gathering_id = g.id and a2.rsvp_status = 'yes'
      ) as attendee_count
    from public.gatherings g
    join public.profiles p on p.id = g.convener_id
    where
      g.privacy in ('public_listed','public_open')
      and g.status in ('scheduled','live')
      and p.verified = true
      and ST_DWithin(
        g.coords,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      and (p_cursor is null or g.starts_at > p_cursor)
      and (not p_sabbath_filter or extract(dow from g.starts_at at time zone 'UTC') != 0)
  )
  select
    b.id,
    b.title,
    b.template_id,
    b.vibe_tag,
    b.banner_url,
    b.accent_color,
    b.icon,
    b.location_label,
    -- snap coords to 500m grid for non-attendees
    case
      when b.is_attendee or b.coords_radius_m = 0
      then ST_Y(b.coords::geometry)
      else round(ST_Y(b.coords::geometry)::numeric / 0.005, 0)::double precision * 0.005
    end as approx_lat,
    case
      when b.is_attendee or b.coords_radius_m = 0
      then ST_X(b.coords::geometry)
      else round(ST_X(b.coords::geometry)::numeric / 0.005, 0)::double precision * 0.005
    end as approx_lng,
    b.coords_radius_m,
    b.starts_at,
    b.ends_at,
    b.privacy,
    b.status,
    b.convener_handle,
    b.convener_id,
    b.is_attendee,
    b.attendee_count,
    b.distance_m
  from base b
  order by b.starts_at asc
  limit p_limit;
$$;

-- ── 8. Charter publishing function ───────────────────────────
-- Copies a completed Gathering into a new Charter row:
--   - strips identity (location nulled, banner reset to template default)
--   - copies arc_blocks, roles, gear (no attendees, no messages)
--   - increments original's charter_clones counter
create or replace function public.publish_as_charter(p_gathering_id uuid)
returns uuid  -- the new charter's id
language plpgsql security definer as $$
declare
  v_uid      uuid := auth.uid();
  v_src      public.gatherings%rowtype;
  v_handle   text;
  v_new_id   uuid := gen_random_uuid();
begin
  -- Caller must be the convener
  select * into v_src from public.gatherings where id = p_gathering_id;
  if not found or v_src.convener_id != v_uid then
    raise exception 'not authorized';
  end if;
  if v_src.status not in ('completed','live') then
    raise exception 'only completed or live gatherings can be chartered';
  end if;

  select handle into v_handle from public.profiles where id = v_uid;

  -- Insert the charter (identity stripped)
  insert into public.gatherings (
    id, convener_id, trip_id,
    title, template_id, vibe_tag,
    banner_url, accent_color, icon,
    location_label, coords, coords_radius_m,
    starts_at, ends_at, timezone,
    privacy, status,
    custom_fields,
    is_charter,
    charter_attribution
  ) values (
    v_new_id, v_uid, null,
    v_src.title || ' (Charter)',
    v_src.template_id, v_src.vibe_tag,
    null,                          -- banner stripped
    v_src.accent_color, v_src.icon,
    null, null, 0,                 -- location stripped
    v_src.starts_at, v_src.ends_at, v_src.timezone,
    'public_listed', 'draft',
    v_src.custom_fields,
    true,
    jsonb_build_object(
      'original_gathering_id', p_gathering_id,
      'original_title', v_src.title,
      'convener_handle', v_handle,
      'published_at', now()
    )
  );

  -- Copy arc blocks
  insert into public.gathering_arc_blocks (gathering_id, ord, starts_at, duration_min, title, note)
  select v_new_id, ord, starts_at, duration_min, title, note
  from public.gathering_arc_blocks where gathering_id = p_gathering_id;

  -- Copy roles (unassigned)
  insert into public.gathering_roles (gathering_id, label, description, claimable, max_claims)
  select v_new_id, label, description, claimable, max_claims
  from public.gathering_roles where gathering_id = p_gathering_id;

  -- Copy gear (unclaimed)
  insert into public.gathering_gear (gathering_id, item, qty, category, weight_kg, source)
  select v_new_id, item, qty, category, weight_kg, source
  from public.gathering_gear where gathering_id = p_gathering_id;

  -- Bump original clone counter
  update public.gatherings
  set charter_clones = charter_clones + 1
  where id = p_gathering_id;

  return v_new_id;
end;
$$;

-- ── 9. Clone a charter into the architect's own gathering ─────
create or replace function public.clone_charter(
  p_charter_id uuid,
  p_trip_id    uuid default null
)
returns uuid
language plpgsql security definer as $$
declare
  v_uid    uuid := auth.uid();
  v_src    public.gatherings%rowtype;
  v_new_id uuid := gen_random_uuid();
begin
  select * into v_src from public.gatherings where id = p_charter_id and is_charter = true;
  if not found then raise exception 'charter not found'; end if;

  insert into public.gatherings (
    id, convener_id, trip_id,
    title, template_id, vibe_tag,
    banner_url, accent_color, icon,
    privacy, status, timezone,
    custom_fields, starts_at, ends_at,
    charter_id
  ) values (
    v_new_id, v_uid, p_trip_id,
    regexp_replace(v_src.title, ' \(Charter\)$', ''),
    v_src.template_id, v_src.vibe_tag,
    null, v_src.accent_color, v_src.icon,
    'squad', 'draft', v_src.timezone,
    v_src.custom_fields,
    v_src.starts_at, v_src.ends_at,
    p_charter_id
  );

  -- Clone arc/roles/gear
  insert into public.gathering_arc_blocks (gathering_id, ord, starts_at, duration_min, title, note)
  select v_new_id, ord, starts_at, duration_min, title, note
  from public.gathering_arc_blocks where gathering_id = p_charter_id;

  insert into public.gathering_roles (gathering_id, label, description, claimable, max_claims)
  select v_new_id, label, description, claimable, max_claims
  from public.gathering_roles where gathering_id = p_charter_id;

  insert into public.gathering_gear (gathering_id, item, qty, category, weight_kg, source)
  select v_new_id, item, qty, category, weight_kg, 'manual'
  from public.gathering_gear where gathering_id = p_charter_id;

  -- Add convener to attendees
  insert into public.gathering_attendees (gathering_id, pioneer_id, rsvp_status)
  values (v_new_id, v_uid, 'yes')
  on conflict (gathering_id, pioneer_id) do nothing;

  -- Bump charter clone count
  update public.gatherings set charter_clones = charter_clones + 1 where id = p_charter_id;

  return v_new_id;
end;
$$;

-- ── 10. RLS policies for new public privacy levels ────────────
-- Allow anyone (even anon) to view public_listed/public_open gatherings from verified conveners
drop policy if exists gatherings_public_select on public.gatherings;
create policy gatherings_public_select on public.gatherings
  for select using (
    privacy in ('public_listed','public_open')
    and status in ('scheduled','live','completed')
    and exists (
      select 1 from public.profiles p
      where p.id = convener_id and p.verified = true
    )
  );

-- Charters viewable by all authenticated
drop policy if exists gatherings_charter_select on public.gatherings;
create policy gatherings_charter_select on public.gatherings
  for select using (
    is_charter = true
    and auth.uid() is not null
  );

-- ── 11. Realtime for gathering_reports (admin feed) ──────────
do $$
begin
  alter publication supabase_realtime add table public.gathering_reports;
exception when duplicate_object then null;
end $$;
