-- VenturePath · Curated Expeditions Foundation (Spec 0)
-- Extends pro_paths, adds pro_path_waypoints + pro_path_attempts, enables RLS.
-- Defensive: works whether pro_paths has 0 rows or existing rows.

-- 1a. Extend pro_paths
alter table pro_paths add column if not exists slug text;
update pro_paths
  set slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 6)
  where slug is null;
alter table pro_paths alter column slug set not null;
alter table pro_paths add constraint pro_paths_slug_unique unique (slug);

alter table pro_paths
  add column if not exists gpx_storage_path text,
  add column if not exists theme_category text
    check (theme_category in ('movie','historical','thematic','city','geographical')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists provenance jsonb not null default '{}',
  add column if not exists safety_meta jsonb not null default '{}',
  add column if not exists narrative_blocks jsonb not null default '[]';

create index if not exists pro_paths_theme_curated_idx
  on pro_paths(theme_category) where is_curated = true;
create index if not exists pro_paths_tags_gin_idx on pro_paths using gin(tags);

-- 1b. Waypoints (Spec 4 populates narrative/audio/ar payloads)
create table if not exists pro_path_waypoints (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references pro_paths(id) on delete cascade,
  ord int not null,
  lat double precision not null,
  lon double precision not null,
  elevation_m real,
  name text,
  category text,
  narrative_text text,
  audio_url text,
  media_url text[] not null default '{}',
  ar_payload jsonb not null default '{}',
  trigger_radius_m int not null default 20,
  time_gate jsonb,
  created_at timestamptz not null default now(),
  unique (path_id, ord)
);
create index if not exists pro_path_waypoints_path_ord_idx
  on pro_path_waypoints(path_id, ord);

-- 1c. Attempts (Spec 8 community layer)
create table if not exists pro_path_attempts (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references pro_paths(id) on delete cascade,
  pioneer_id uuid references auth.users(id),
  squad_size int not null default 1,
  duration_min int,
  distance_actual_km numeric,
  completed_at timestamptz not null default now(),
  photos jsonb not null default '[]',
  fkt_eligible boolean not null default false
);
create index if not exists pro_path_attempts_path_idx
  on pro_path_attempts(path_id, completed_at desc);

-- 1d. RLS
alter table pro_paths enable row level security;
alter table pro_path_waypoints enable row level security;
alter table pro_path_attempts enable row level security;

create policy "pro_paths_public_read_curated"
  on pro_paths for select to anon, authenticated
  using (is_curated = true);

create policy "pro_paths_architect_read_own"
  on pro_paths for select to authenticated
  using (architect_id = auth.uid());

create policy "pro_paths_architect_write"
  on pro_paths for insert to authenticated
  with check (architect_id = auth.uid());

create policy "pro_paths_architect_update"
  on pro_paths for update to authenticated
  using (architect_id = auth.uid()) with check (architect_id = auth.uid());

create policy "pro_path_waypoints_read_if_path_visible"
  on pro_path_waypoints for select to anon, authenticated
  using (exists (
    select 1 from pro_paths p
    where p.id = path_id and (p.is_curated = true or p.architect_id = auth.uid())
  ));

create policy "pro_path_waypoints_architect_write"
  on pro_path_waypoints for all to authenticated
  using (exists (
    select 1 from pro_paths p
    where p.id = path_id and p.architect_id = auth.uid()
  ))
  with check (exists (
    select 1 from pro_paths p
    where p.id = path_id and p.architect_id = auth.uid()
  ));

create policy "pro_path_attempts_public_read"
  on pro_path_attempts for select to anon, authenticated using (true);

create policy "pro_path_attempts_self_insert"
  on pro_path_attempts for insert to authenticated
  with check (pioneer_id = auth.uid());
