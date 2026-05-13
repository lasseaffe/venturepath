# Spec 0 — Curated Expeditions Foundation

**Status:** Approved 2026-05-13
**Parent roadmap:** `C:\Users\lasse\.claude\plans\think-of-all-the-prancy-orbit.md`
**Target project:** VenturePath (`C:\Users\lasse\Desktop\venturepath`)
**Output:** one bundled PR — `feat(foundation): curated expeditions schema, dossier rename, public routing`
**Effort:** ~3–4 hours

---

## Context

The Curated Expeditions roadmap (8 sub-specs) is blocked behind three foundation moves: extending the `pro_paths` schema for GPX + narrative + safety metadata, resolving the "Vault" naming collision between `components/vault/` (personal tickets/passport) and `components/discovery/VentureVault.jsx` (marketplace), and introducing URL-based routing so Pro-Path pages can be share-linked, indexed, and AR-QR-anchored. None of the downstream specs (Discovery, Detail, Pipeline, Narrative, Intelligence, Export, Snap-to-Road, Community) can begin until these three foundations land. This spec is intentionally non-feature work — it is plumbing — and explicitly ships with stub pages and no seeded content. Spec 1 (Discovery) and Spec 3 (Pipeline) layer real surface and data on top.

All seven architectural decisions (D1–D7) are locked in the roadmap. This spec consumes them and adds three implementation-level decisions resolved during brainstorming:

- **PR slicing:** one bundled PR (not three sequential).
- **Existing data handling:** defensive migration that works for 0 rows or N rows — no DB pre-check required.
- **RLS timing:** enabled in this spec, not deferred. Public-read for `is_curated=true`; writes restricted to `architect_id = auth.uid()`. The seed pipeline uses the service-role key and bypasses RLS unchanged.

---

## Deliverables

1. SQL migration `supabase/migrations/20260513_curated_expeditions_foundation.sql` — schema delta on `pro_paths`, new `pro_path_waypoints` and `pro_path_attempts` tables, RLS policies on all three.
2. Supabase Storage bucket `gpx` with RLS policies tied to `pro_paths.is_curated` and `architect_id`.
3. Rename `src/components/vault/` → `src/components/dossier/`, propagate to all import sites, update UI labels (`VAULT` tab → `DOSSIER`), moodboard config entry, moodboard.log entry.
4. `react-router-dom@^7` integration: new `src/router/AppRouter.jsx` wraps the existing state-view tree as a catch-all and exposes `/explore`, `/explore/:theme`, `/expedition/:slug` to lazy-loaded stub pages.
5. Tests for migration policy presence, dossier rename render, router smoke.
6. CHANGELOG + moodboard.log + holyflex `logs/` entries per CLAUDE.md.

---

## 1. Migration — `supabase/migrations/20260513_curated_expeditions_foundation.sql`

```sql
-- 1a. Extend pro_paths (defensive: works for 0 rows or N rows)
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

-- 1b. Waypoints (Spec 4 will populate narrative/audio/ar payloads)
create table if not exists pro_path_waypoints (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references pro_paths(id) on delete cascade,
  ord int not null,
  lat double precision not null,
  lon double precision not null,
  elevation_m real,
  name text,
  category text,                   -- reuses waypointCategories.js taxonomy
  narrative_text text,
  audio_url text,
  media_url text[] not null default '{}',
  ar_payload jsonb not null default '{}',
  trigger_radius_m int not null default 20,
  time_gate jsonb,                 -- {after: '20:00', before: '06:00'} for Ghost Path
  created_at timestamptz not null default now(),
  unique (path_id, ord)
);
create index pro_path_waypoints_path_ord_idx on pro_path_waypoints(path_id, ord);

-- 1c. Attempts (Spec 8 community layer; created now so FK targets exist)
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
create index pro_path_attempts_path_idx on pro_path_attempts(path_id, completed_at desc);

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
  using (exists (select 1 from pro_paths p where p.id = path_id
    and (p.is_curated = true or p.architect_id = auth.uid())));
create policy "pro_path_waypoints_architect_write"
  on pro_path_waypoints for all to authenticated
  using (exists (select 1 from pro_paths p where p.id = path_id and p.architect_id = auth.uid()))
  with check (exists (select 1 from pro_paths p where p.id = path_id and p.architect_id = auth.uid()));

create policy "pro_path_attempts_public_read"
  on pro_path_attempts for select to anon, authenticated using (true);
create policy "pro_path_attempts_self_insert"
  on pro_path_attempts for insert to authenticated
  with check (pioneer_id = auth.uid());
```

The pipeline uses `SUPABASE_SERVICE_KEY` (verified in [pipeline/upsertPath.js:5](C:/Users/lasse/Desktop/venturepath/pipeline/upsertPath.js#L5) — note the non-standard name without `_ROLE_`). Service role bypasses RLS, so `npm run pipeline` keeps working with zero changes.

## 2. Storage bucket — `gpx`

Run as service role (Supabase SQL editor or dashboard):

```sql
insert into storage.buckets (id, name, public)
  values ('gpx', 'gpx', false)
  on conflict (id) do nothing;

create policy "gpx_public_read_curated"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'gpx'
    and exists (
      select 1 from pro_paths p
      where p.id::text = split_part(name, '.', 1)
        and p.is_curated = true
    )
  );

create policy "gpx_architect_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gpx'
    and exists (
      select 1 from pro_paths p
      where p.id::text = split_part(name, '.', 1)
        and p.architect_id = auth.uid()
    )
  );
```

Object naming convention: `<pro_path_id>.gpx` at bucket root. Downstream specs (3, 6, 7) rely on this convention; the RLS policies depend on it.

## 3. Dossier rename

File operations:

```bash
git mv src/components/vault src/components/dossier
git mv src/components/dossier/VaultHub.jsx src/components/dossier/DossierHub.jsx
git mv src/components/dossier/VaultIngest.jsx src/components/dossier/DossierIngest.jsx
git mv src/components/dossier/PassportVault.jsx src/components/dossier/PassportDossier.jsx
```

Inside each renamed file: rename the component export and any internal references. Apply the same replacements anywhere the symbols are imported. Hard-break — no re-export aliases.

Symbol rename map:

| Old | New |
|---|---|
| `VaultHub` | `DossierHub` |
| `VaultIngest` | `DossierIngest` |
| `PassportVault` | `PassportDossier` |
| `from '*/vault/*'` | `from '*/dossier/*'` |

Verification command before commit: `Grep` for `Vault(Hub|Ingest)\|PassportVault\|components/vault` should return zero matches.

UI copy:
- `TripPlanner.jsx` — tab label `VAULT` → `DOSSIER`. (CHANGELOG entry under "Added: VAULT tab" confirms this label exists in current code.)
- `App.jsx` HandleSetupNudge — already says "Dossier"; verify no edit needed.

Moodboard:
- Add an entry to `src/pages/moodboard/moodboard.config.js` under `vocabulary` recording the change.
- Prepend a dated entry to `docs/moodboard.log.md` with `### Changed` and `### Ideas / next steps`.
- Run `npm run moodboard:check` and resolve drift.

**Internal store note:** the `useTripStore` "vault slice" (per commit c298c35) stores GPX/permit files. Its slice name is internal state, not user-visible — leave as `vault` to keep the rename minimal. Only UI component names change.

## 4. React-router scaffold

Install: `npm i react-router-dom@^7` (compatible with React 19, which is already a dep).

New file `src/router/AppRouter.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LegacyApp from '../LegacyApp';

const Explore = lazy(() => import('../pages/Explore'));
const ExploreTheme = lazy(() => import('../pages/ExploreTheme'));
const ExpeditionDetail = lazy(() => import('../pages/ExpeditionDetail'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:theme" element={<ExploreTheme />} />
          <Route path="/expedition/:slug" element={<ExpeditionDetail />} />
          <Route path="*" element={<LegacyApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

`src/App.jsx` refactor: extract the current `AppRouter` function (the state-view switch) into a new `src/LegacyApp.jsx` unchanged; replace its top-level usage with the new router-based `AppRouter` from `src/router/`. Existing `setView('vault')` etc. continue to work under the catch-all route. Providers (`AuthProvider`, `TripStoreProvider`, `SquadGearProvider`, `ExpeditionProvider`, `OnboardingEngine`) stay in `App.jsx` wrapping `<AppRouter />`.

Stub pages (Spec 1 / Spec 2 fill them in later). All three must satisfy APPLE_COMPLIANCE Rule 1 — terminal-style LaunchSequence aesthetic, JetBrains Mono, expedition-branded copy. Not "coming soon":

- `src/pages/Explore.jsx` — title "VENTUREVAULT • DISCOVERY", a "FETCHING CURATED EXPEDITIONS…" terminal line, link back to dashboard.
- `src/pages/ExploreTheme.jsx` — echoes `:theme` param as `THEME: {theme}` in JetBrains Mono, same terminal aesthetic.
- `src/pages/ExpeditionDetail.jsx` — echoes `:slug` param as `EXPEDITION: {slug}`, same aesthetic.

## 5. Tests

- `pipeline/__tests__/schema.test.js` (new) — read the migration file as text, assert presence of `enable row level security on pro_paths`, the four `pro_paths_*` policy names, the three new table names, and the slug backfill statement.
- `src/components/dossier/__tests__/DossierHub.test.jsx` — render test (rename existing if present, otherwise add minimal).
- `src/router/__tests__/AppRouter.test.jsx` — render with `MemoryRouter` at `/explore`, `/explore/movie`, `/expedition/anything`; assert respective stub renders.

## 6. Out of scope (do not touch in this PR)

- Filling in Explore / ExpeditionDetail page content (Specs 1 + 2)
- Seeding any rows (Spec 3)
- GraphHopper adapter (Spec 7)
- Waypoint UI / narrative rendering (Spec 4)
- Auth integration if not already wired — `auth.uid()` policies assume the existing `AuthContext` is functional. Spec 0 does not modify auth.
- Renaming the internal `useTripStore` vault slice (intentionally left as-is).
- Mapbox snap-to-road (deferred per D4).

## 7. Verification (before merge)

- `npm run dev` boots, dashboard loads, `setView('select')` still works (legacy regression check).
- Navigate to `/explore` → stub renders with terminal aesthetic.
- Navigate to `/explore/movie` → stub shows `THEME: movie`.
- Navigate to `/expedition/anything` → stub shows `EXPEDITION: anything`.
- `npm run test` passes (existing + 3 new test files).
- Apply migration on a local Supabase instance: `select column_name from information_schema.columns where table_name = 'pro_paths'` includes `slug, gpx_storage_path, theme_category, tags, provenance, safety_meta, narrative_blocks`; `select policyname from pg_policies where tablename = 'pro_paths'` returns the four policies; `select table_name from information_schema.tables where table_name in ('pro_path_waypoints','pro_path_attempts')` returns both.
- `npm run pipeline` against one fixture route still inserts a row (service role bypasses RLS).
- `npm run moodboard:check` returns no unresolved drift.
- CHANGELOG entry appended.
- `docs/moodboard.log.md` entry prepended.
- `C:\Users\lasse\Desktop\holyflex\logs\2026-05-13.md` entry appended per CLAUDE.md mandate.

## 8. Cross-app connectivity check (per CLAUDE.md mandate)

- Does this write data another tool should react to? No — pure plumbing, no events emitted.
- Does this read data another tool produces? No.
- Does this affect shared state? No.
- Cross-app event hook? No.
- Could another app's data help? No, but the foundation enables future hooks (Spec 4 → HolyFlex verse injection on religious waypoints; Spec 8 → HolyFlex `streak_events.expedition_logged`).

## 9. Critical files touched

New:
- `supabase/migrations/20260513_curated_expeditions_foundation.sql`
- `src/router/AppRouter.jsx`
- `src/LegacyApp.jsx` (extracted from App.jsx)
- `src/pages/Explore.jsx`
- `src/pages/ExploreTheme.jsx`
- `src/pages/ExpeditionDetail.jsx`
- `pipeline/__tests__/schema.test.js`
- `src/router/__tests__/AppRouter.test.jsx`

Renamed (git mv):
- `src/components/vault/` → `src/components/dossier/`
- `VaultHub.jsx` → `DossierHub.jsx`
- `VaultIngest.jsx` → `DossierIngest.jsx`
- `PassportVault.jsx` → `PassportDossier.jsx`

Modified:
- `src/App.jsx` — wrap with new router, providers unchanged
- `src/pages/TripPlanner.jsx` — `VAULT` tab label → `DOSSIER`, import path updates
- Any other file importing the renamed symbols (verify with grep before edit)
- `src/pages/moodboard/moodboard.config.js` — vocabulary entry
- `docs/moodboard.log.md` — dated entry prepended
- `package.json` + lockfile — `react-router-dom@^7` added
- `CHANGELOG.md` — entry appended
