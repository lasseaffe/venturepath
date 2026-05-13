# Curated Expeditions Foundation (Spec 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land schema + storage + naming + routing foundations so Specs 1–8 of the Curated Expeditions roadmap can begin.

**Architecture:** One bundled PR with three independent commits — (a) Supabase migration extending `pro_paths` plus two new tables and RLS, (b) `components/vault/` directory and three components renamed to `Dossier*`, (c) `react-router-dom@7` wraps existing state-view tree at top of `App.jsx`, routing `/explore`, `/explore/:theme`, `/expedition/:slug` to lazy-loaded stub pages while the catch-all renders the legacy app unchanged.

**Tech Stack:** React 19, Vite, react-router-dom 7, Zustand, Supabase Postgres + Storage + RLS, Vitest + Testing Library, Tailwind v3.

**Spec:** [2026-05-13-spec-0-foundation-design.md](../specs/2026-05-13-spec-0-foundation-design.md)

---

## Pre-flight (do once, before Task 1)

- [ ] **Step 1: Confirm working directory and branch**

```bash
cd C:/Users/lasse/Desktop/venturepath
git status
git rev-parse --abbrev-ref HEAD
```

Expected: clean working tree or only untracked files. Note current branch name.

- [ ] **Step 2: Verify the deferred stash worktree won't conflict**

```bash
ls .claude/worktrees/
```

Expected: a `gpx-studio-phase-1` directory exists (per memory `project_vp_deferred_stash`). DO NOT delete or pop it. This plan does not need it; it just must not be touched. If the user has plans to pop it later, they accept that the `vault/` → `dossier/` rename will conflict and need a manual merge.

- [ ] **Step 3: Create a feature branch**

```bash
git checkout -b feat/curated-expeditions-foundation
```

Expected: branch created and checked out.

- [ ] **Step 4: Confirm baseline tests pass**

```bash
npm run test -- --run
```

Expected: all existing tests pass. If anything fails, STOP and report — do not start the plan against a broken baseline.

---

## Task 1: Install react-router-dom

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependency**

```bash
npm i react-router-dom@^7
```

Expected: installs cleanly, `react-router-dom` appears in `package.json` `dependencies` with a `^7.x.x` version.

- [ ] **Step 2: Verify install**

```bash
node -e "console.log(require('react-router-dom/package.json').version)"
```

Expected: prints a `7.x.x` version string.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom@^7 for curated-expeditions routing"
```

---

## Task 2: Migration test (TDD — failing first)

**Files:**
- Create: `pipeline/__tests__/schema.test.js`

- [ ] **Step 1: Create pipeline tests directory**

```bash
mkdir -p pipeline/__tests__
```

- [ ] **Step 2: Write the failing test**

Create `pipeline/__tests__/schema.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../supabase/migrations/20260513_curated_expeditions_foundation.sql'
);

describe('20260513_curated_expeditions_foundation migration', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8').toLowerCase();

  it('adds the slug column with backfill and uniqueness', () => {
    expect(sql).toMatch(/add column if not exists slug text/);
    expect(sql).toMatch(/update pro_paths[\s\S]+slug = lower/);
    expect(sql).toMatch(/alter column slug set not null/);
    expect(sql).toMatch(/pro_paths_slug_unique/);
  });

  it('adds the new pro_paths columns', () => {
    for (const col of [
      'gpx_storage_path text',
      'theme_category text',
      'tags text[]',
      'provenance jsonb',
      'safety_meta jsonb',
      'narrative_blocks jsonb',
    ]) {
      expect(sql).toContain(col);
    }
  });

  it('constrains theme_category to the five locked values', () => {
    expect(sql).toMatch(
      /theme_category in \(\s*'movie'\s*,\s*'historical'\s*,\s*'thematic'\s*,\s*'city'\s*,\s*'geographical'\s*\)/
    );
  });

  it('creates pro_path_waypoints and pro_path_attempts tables', () => {
    expect(sql).toMatch(/create table if not exists pro_path_waypoints/);
    expect(sql).toMatch(/create table if not exists pro_path_attempts/);
  });

  it('enables RLS on all three tables', () => {
    expect(sql).toMatch(/alter table pro_paths enable row level security/);
    expect(sql).toMatch(
      /alter table pro_path_waypoints enable row level security/
    );
    expect(sql).toMatch(
      /alter table pro_path_attempts enable row level security/
    );
  });

  it('creates the four expected pro_paths policies', () => {
    for (const policy of [
      'pro_paths_public_read_curated',
      'pro_paths_architect_read_own',
      'pro_paths_architect_write',
      'pro_paths_architect_update',
    ]) {
      expect(sql).toContain(policy);
    }
  });

  it('creates supporting indexes for theme browse and tag filter', () => {
    expect(sql).toMatch(/pro_paths_theme_curated_idx/);
    expect(sql).toMatch(/pro_paths_tags_gin_idx/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test -- --run pipeline/__tests__/schema.test.js
```

Expected: FAIL — `ENOENT` on the migration file path (it does not exist yet).

---

## Task 3: Write the migration

**Files:**
- Create: `supabase/migrations/20260513_curated_expeditions_foundation.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260513_curated_expeditions_foundation.sql`:

```sql
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
```

- [ ] **Step 2: Run the schema test**

```bash
npm run test -- --run pipeline/__tests__/schema.test.js
```

Expected: all 7 tests PASS.

- [ ] **Step 3: Apply migration to local Supabase**

Run this in the Supabase SQL editor for project `rhuttwfozwawcijjwpeo` (or a local Supabase instance). Copy the contents of `supabase/migrations/20260513_curated_expeditions_foundation.sql` and execute.

Expected: no errors. If `add constraint pro_paths_slug_unique` errors because rows have duplicate slugs (very unlikely with the id-suffix fallback), append `-2`, `-3` manually to dupes and retry only the constraint statement.

- [ ] **Step 4: Verify schema in Supabase**

In the Supabase SQL editor:

```sql
select column_name from information_schema.columns
  where table_name = 'pro_paths'
  and column_name in ('slug','gpx_storage_path','theme_category','tags','provenance','safety_meta','narrative_blocks');
```

Expected: 7 rows.

```sql
select policyname from pg_policies where tablename = 'pro_paths';
```

Expected: 4 policy names from the migration.

```sql
select table_name from information_schema.tables
  where table_name in ('pro_path_waypoints','pro_path_attempts');
```

Expected: 2 rows.

- [ ] **Step 5: Commit migration + test**

```bash
git add supabase/migrations/20260513_curated_expeditions_foundation.sql pipeline/__tests__/schema.test.js
git commit -m "feat(db): curated expeditions foundation schema + RLS"
```

---

## Task 4: Storage bucket SQL (one-time apply, documented)

**Files:**
- Create: `supabase/migrations/20260513_gpx_storage_bucket.sql`

This is its own migration file so it can be applied independently with service-role auth (storage policies can fail when applied via the same migration runner that does table DDL).

- [ ] **Step 1: Create the storage bucket SQL**

Create `supabase/migrations/20260513_gpx_storage_bucket.sql`:

```sql
-- VenturePath · GPX Storage Bucket (Spec 0)
-- Apply with service role. Public read gated by pro_paths.is_curated.
-- Object naming convention: <pro_path_id>.gpx at bucket root.

insert into storage.buckets (id, name, public)
  values ('gpx', 'gpx', false)
  on conflict (id) do nothing;

drop policy if exists "gpx_public_read_curated" on storage.objects;
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

drop policy if exists "gpx_architect_write" on storage.objects;
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

- [ ] **Step 2: Apply to Supabase**

Run the file's contents in the Supabase SQL editor as service role.

Expected: no errors. Bucket `gpx` appears under Storage → Buckets in the dashboard.

- [ ] **Step 3: Verify bucket exists**

```sql
select id, public from storage.buckets where id = 'gpx';
select policyname from pg_policies where tablename = 'objects' and policyname like 'gpx_%';
```

Expected: bucket row with `public = false`; 2 policy names.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260513_gpx_storage_bucket.sql
git commit -m "feat(storage): add gpx bucket with curated-read + architect-write policies"
```

---

## Task 5: Rename `vault/` → `dossier/`

**Files:**
- Rename directory: `src/components/vault/` → `src/components/dossier/`
- Rename within: `VaultHub.jsx` → `DossierHub.jsx`, `VaultIngest.jsx` → `DossierIngest.jsx`, `PassportVault.jsx` → `PassportDossier.jsx`
- Modify display copy in renamed files

Pre-confirmed (grep run during planning): `VaultHub`, `VaultIngest`, `PassportVault` are NOT imported from outside `src/components/vault/` — rename is contained internally. Other files inside the directory (`TicketCard.jsx`, `TicketDetailDrawer.jsx`, `TicketImportModal.jsx`, `TicketBarcodeRenderer.jsx`, `MedicAccessBadge.jsx`, `DocumentManifest.jsx`, `DepartingSoonStrip.jsx`) keep their filenames — only the parent dir moves. Utility `src/utils/vaultExtractor.js` keeps its name (internal utility, not user-facing).

- [ ] **Step 1: Move the directory**

```bash
git mv src/components/vault src/components/dossier
```

- [ ] **Step 2: Rename the three component files**

```bash
git mv src/components/dossier/VaultHub.jsx src/components/dossier/DossierHub.jsx
git mv src/components/dossier/VaultIngest.jsx src/components/dossier/DossierIngest.jsx
git mv src/components/dossier/PassportVault.jsx src/components/dossier/PassportDossier.jsx
```

- [ ] **Step 3: Update internal exports + references in `DossierHub.jsx`**

In `src/components/dossier/DossierHub.jsx`:
- Change the file header comment `// src/components/vault/VaultHub.jsx` → `// src/components/dossier/DossierHub.jsx`
- Change `import VaultIngest from './VaultIngest';` → `import DossierIngest from './DossierIngest';`
- Change `export default function VaultHub()` → `export default function DossierHub()`
- Change the `<VaultIngest ... />` JSX usage to `<DossierIngest ... />`

- [ ] **Step 4: Update internal exports + references in `DossierIngest.jsx`**

In `src/components/dossier/DossierIngest.jsx`:
- Change the file header comment to `// src/components/dossier/DossierIngest.jsx`
- Change `export default function VaultIngest(...)` → `export default function DossierIngest(...)`
- Leave the `import { extractVaultDocument } from '../../utils/vaultExtractor';` line unchanged (utility keeps its name).

- [ ] **Step 5: Update internal exports + references in `PassportDossier.jsx`**

In `src/components/dossier/PassportDossier.jsx`:
- Change the file header comment to `// src/components/dossier/PassportDossier.jsx`
- Change `export default function PassportVault(...)` → `export default function PassportDossier(...)`
- Change the `console.warn('[PassportVault]` log prefix → `console.warn('[PassportDossier]`
- Change the displayed heading `<h2 className="font-playfair text-2xl">PassportVault</h2>` → `<h2 className="font-playfair text-2xl">Passport Dossier</h2>`

- [ ] **Step 6: Update display copy in `DocumentManifest.jsx`**

In `src/components/dossier/DocumentManifest.jsx`:
- Change `No documents. Add tickets to your PassportVault.` → `No documents. Add tickets to your Passport Dossier.`
- Change the file header comment `// src/components/vault/DocumentManifest.jsx` → `// src/components/dossier/DocumentManifest.jsx`

- [ ] **Step 7: Update header comments in remaining moved files**

For each of these, update the leading file header comment from `// src/components/vault/<Name>.jsx` to `// src/components/dossier/<Name>.jsx`:
- `src/components/dossier/TicketCard.jsx`
- `src/components/dossier/TicketDetailDrawer.jsx`
- `src/components/dossier/TicketImportModal.jsx`
- `src/components/dossier/TicketBarcodeRenderer.jsx`
- `src/components/dossier/MedicAccessBadge.jsx`
- `src/components/dossier/DepartingSoonStrip.jsx`

(These files have no `VaultHub`/`PassportVault` symbol references — header comments only.)

- [ ] **Step 8: Verify no stale references remain**

```bash
npm run test -- --run
```

Expected: all tests pass (or fail only on tests that don't exist yet — `pipeline/__tests__/schema.test.js` should still pass).

Then verify no stale imports/symbol references:

Use the Grep tool with pattern `VaultHub|VaultIngest|PassportVault|components/vault` across `src/`. Expected: **zero matches** (no remaining references).

If matches appear, edit them to use the new names before continuing.

- [ ] **Step 9: Boot the dev server smoke check**

```bash
npm run dev
```

In a browser: open `http://localhost:5173` (or whatever port Vite picks), verify the dashboard loads without console errors. Stop the dev server.

Expected: dashboard renders. No "Cannot find module './vault/...'" errors in the terminal.

- [ ] **Step 10: Commit the rename**

```bash
git add -A src/components/dossier
git commit -m "refactor: rename vault/ to dossier/ (UI), keep VentureVault marketplace word for discovery/"
```

---

## Task 6: Stub pages for the three new routes

**Files:**
- Create: `src/pages/Explore.jsx`
- Create: `src/pages/ExploreTheme.jsx`
- Create: `src/pages/ExpeditionDetail.jsx`

Each stub satisfies APPLE_COMPLIANCE Rule 1 — JetBrains Mono terminal aesthetic, expedition vocabulary, at least one interactive CTA.

- [ ] **Step 1: Create `src/pages/Explore.jsx`**

```jsx
// src/pages/Explore.jsx
// Spec 0 stub for /explore — Spec 1 (Discovery) replaces with VentureVault browse.
import { Link } from 'react-router-dom';

export default function Explore() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <Link
        to="/"
        className="text-xs hover:underline"
        style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        ← BASECAMP
      </Link>
      <h1
        className="font-playfair text-3xl mt-6"
        style={{ color: 'var(--text-primary)' }}
      >
        VentureVault — Discovery
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        FETCHING CURATED EXPEDITIONS…
      </p>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        Architects, Pro-Paths surface here once Spec 1 lands. The route is wired;
        the inventory is being seeded.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/pages/ExploreTheme.jsx`**

```jsx
// src/pages/ExploreTheme.jsx
// Spec 0 stub for /explore/:theme — Spec 1 fills with themed Pro-Path grid.
import { Link, useParams } from 'react-router-dom';

const THEMES = new Set(['movie', 'historical', 'thematic', 'city', 'geographical']);

export default function ExploreTheme() {
  const { theme } = useParams();
  const known = THEMES.has(theme);

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <Link
        to="/explore"
        className="text-xs hover:underline"
        style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        ← VENTUREVAULT
      </Link>
      <h1
        className="font-playfair text-3xl mt-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Theme — {theme}
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{
          color: known ? 'var(--accent)' : 'var(--status-warn)',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {known ? `THEME: ${theme}` : `UNKNOWN THEME: ${theme}`}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Known registers: movie · historical · thematic · city · geographical.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/pages/ExpeditionDetail.jsx`**

```jsx
// src/pages/ExpeditionDetail.jsx
// Spec 0 stub for /expedition/:slug — Spec 2 replaces with full detail page.
import { Link, useParams } from 'react-router-dom';

export default function ExpeditionDetail() {
  const { slug } = useParams();

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <Link
        to="/explore"
        className="text-xs hover:underline"
        style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        ← VENTUREVAULT
      </Link>
      <h1
        className="font-playfair text-3xl mt-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Expedition
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        EXPEDITION: {slug}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Hero, map, elevation, waypoints, and Clone CTA arrive in Spec 2.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify stubs parse**

```bash
npm run test -- --run
```

Expected: all tests still pass (no new tests yet; stub pages must at least not break the typecheck/lint).

---

## Task 7: Router scaffold (TDD)

**Files:**
- Create: `src/router/AppRouter.jsx`
- Create: `src/router/__tests__/AppRouter.test.jsx`
- Create: `src/LegacyApp.jsx` (extracted from `App.jsx`)
- Modify: `src/App.jsx`

- [ ] **Step 1: Write the failing router test**

```bash
mkdir -p src/router/__tests__
```

Create `src/router/__tests__/AppRouter.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const Explore = lazy(() => import('../../pages/Explore'));
const ExploreTheme = lazy(() => import('../../pages/ExploreTheme'));
const ExpeditionDetail = lazy(() => import('../../pages/ExpeditionDetail'));

function Tree({ path }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="suspense">loading</div>}>
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:theme" element={<ExploreTheme />} />
          <Route path="/expedition/:slug" element={<ExpeditionDetail />} />
        </Routes>
      </Suspense>
    </MemoryRouter>
  );
}

describe('AppRouter route table', () => {
  it('renders the Explore stub at /explore', async () => {
    render(<Tree path="/explore" />);
    expect(
      await screen.findByText(/VentureVault — Discovery/i)
    ).toBeInTheDocument();
  });

  it('echoes the theme param at /explore/:theme', async () => {
    render(<Tree path="/explore/movie" />);
    expect(await screen.findByText(/THEME: movie/i)).toBeInTheDocument();
  });

  it('flags unknown themes', async () => {
    render(<Tree path="/explore/banana" />);
    expect(
      await screen.findByText(/UNKNOWN THEME: banana/i)
    ).toBeInTheDocument();
  });

  it('echoes the slug param at /expedition/:slug', async () => {
    render(<Tree path="/expedition/lord-of-the-rings-nz" />);
    expect(
      await screen.findByText(/EXPEDITION: lord-of-the-rings-nz/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes (stubs already exist)**

```bash
npm run test -- --run src/router/__tests__/AppRouter.test.jsx
```

Expected: all 4 tests PASS (Task 6 already created the stubs). If any fail, fix the stub before continuing.

- [ ] **Step 3: Extract `LegacyApp` from `App.jsx`**

Open [src/App.jsx](C:/Users/lasse/Desktop/venturepath/src/App.jsx). The existing `AppRouter` function (lines ~19–116, the one that uses `useState('view')` and switch-style returns) becomes the new `LegacyApp`.

Create `src/LegacyApp.jsx` by copying the entire body of the current `AppRouter()` function out of `App.jsx`, plus its imports. The exact content to extract:

```jsx
// src/LegacyApp.jsx
// Legacy state-view router. The new react-router-based AppRouter renders this
// under a catch-all "*" route — every legacy view (dashboard / planner / vault
// / profile / events / moodboard / auth / select) still works unchanged.
import { useState, useCallback } from 'react';
import { useTripStore } from './store/useTripStore';
import { useAuth } from './context/AuthContext';
import { useExpeditionList } from './hooks/useExpeditionList';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import VentureVault from './components/discovery/VentureVault';
import ExpeditionSelectScreen from './components/trip/ExpeditionSelectScreen';
import Moodboard from './pages/Moodboard';
import Events from './pages/Events';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

export default function LegacyApp() {
  const [view, setView] = useState('dashboard');
  const [activeExpeditionId, setActiveExpeditionId] = useState(null);
  const { trip, legs, objectives, manifestSettings } = useTripStore();
  const { saveExpedition } = useExpeditionList();

  const handleEnterExpedition = useCallback((expeditionId) => {
    setActiveExpeditionId(expeditionId);
    setView('planner');
  }, []);

  const handleNavigate = useCallback((key) => {
    if (key === 'dashboard') setView('dashboard');
    else if (key === 'select') setView('select');
    else if (key === 'vault') setView('vault');
    else if (key === 'profile') setView('profile');
    else if (key === 'events') setView('events');
    else if (key === 'tactical' || key === 'ar' || key === 'ledger' || key === 'inspire' || key === 'settings') {
      setView('select');
    }
  }, []);

  function handleBackFromPlanner() {
    if (activeExpeditionId) {
      saveExpedition({
        id: activeExpeditionId,
        trip,
        legs,
        objectives,
        manifestSettings,
      });
    }
    setView('select');
  }

  if (view === 'select') {
    return (
      <ExpeditionSelectScreen
        onEnter={handleEnterExpedition}
        onNavigate={handleNavigate}
        onBackToDashboard={() => setView('dashboard')}
        onOpenVault={() => setView('vault')}
        onOpenProfile={() => setView('profile')}
        onOpenExpeditions={() => {}}
      />
    );
  }

  if (view === 'planner') {
    return (
      <TripPlanner
        onBackToDashboard={handleBackFromPlanner}
        onOpenMoodboard={() => setView('moodboard')}
      />
    );
  }

  if (view === 'moodboard') {
    return <Moodboard onBackToDashboard={() => setView('dashboard')} />;
  }

  if (view === 'events') {
    return <Events onClose={() => setView('dashboard')} />;
  }

  if (view === 'auth') {
    return <Auth onAuthenticated={() => setView('dashboard')} onCancel={() => setView('dashboard')} />;
  }

  if (view === 'profile') {
    return <Profile onClose={() => setView('dashboard')} onSignedOut={() => setView('dashboard')} />;
  }

  if (view === 'vault') {
    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
        <button
          onClick={() => setView('dashboard')}
          className="text-xs mb-4 block hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back
        </button>
        <VentureVault onCloneComplete={() => setView('planner')} />
      </div>
    );
  }

  return (
    <LaunchDashboard
      onEnterTrip={() => setView('select')}
      onOpenVault={() => setView('vault')}
      onOpenChat={() => setView('planner')}
      onOpenProfile={() => setView('profile')}
      onNavigate={handleNavigate}
    />
  );
}
```

- [ ] **Step 4: Create `src/router/AppRouter.jsx`**

```jsx
// src/router/AppRouter.jsx
// Hybrid router: react-router for public Curated Expeditions URLs,
// catch-all "*" delegates to LegacyApp's state-view switch.
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
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

- [ ] **Step 5: Refactor `src/App.jsx` to use the new AppRouter**

Open `src/App.jsx`. Delete the inline `AppRouter` function (lines ~19–116, now in `LegacyApp.jsx`). Replace it with an import. Final `src/App.jsx`:

```jsx
import { useState } from 'react';
import { TripStoreProvider } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingEngine } from './components/onboarding/OnboardingEngine';
import vpConfig from './config/venturepath.onboarding.config';
import AppRouter from './router/AppRouter';

function HandleSetupNudge() {
  const { needsHandleSetup, status } = useAuth();
  const [hidden, setHidden] = useState(false);
  if (status !== 'authenticated' || !needsHandleSetup || hidden) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        background: 'rgba(230,126,34,0.15)', border: '1px solid rgba(230,126,34,0.5)',
        padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#E67E22',
        maxWidth: 300,
      }}
    >
      <span>⚠ Draft handle active. Set a permanent handle in your Dossier.</span>
      <button
        onClick={() => setHidden(true)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
      >
        ✕
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TripStoreProvider>
        <SquadGearProvider>
          <ExpeditionProvider>
            <OnboardingEngine config={vpConfig} />
            <AppRouter />
            <HandleSetupNudge />
          </ExpeditionProvider>
        </SquadGearProvider>
      </TripStoreProvider>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 6: Run all tests**

```bash
npm run test -- --run
```

Expected: all tests pass — schema test, router test, and all pre-existing tests.

- [ ] **Step 7: Boot the dev server, walk all routes**

```bash
npm run dev
```

In a browser (use the port Vite prints):
- `/` → LaunchDashboard renders (legacy regression check)
- Click into Vault from dashboard → `VentureVault` still loads (legacy regression check)
- `/explore` → Explore stub renders
- `/explore/movie` → ExploreTheme stub shows "THEME: movie"
- `/explore/banana` → ExploreTheme stub shows "UNKNOWN THEME: banana"
- `/expedition/test-slug-123` → ExpeditionDetail stub shows "EXPEDITION: test-slug-123"

Stop the dev server.

Expected: all six checks pass. No console errors.

- [ ] **Step 8: Commit router scaffold**

```bash
git add src/router src/LegacyApp.jsx src/App.jsx src/pages/Explore.jsx src/pages/ExploreTheme.jsx src/pages/ExpeditionDetail.jsx
git commit -m "feat(router): hybrid react-router scaffold + /explore /expedition stubs"
```

---

## Task 8: Moodboard + DossierHub smoke test

**Files:**
- Modify: `src/pages/moodboard/moodboard.config.js`
- Modify: `docs/moodboard.log.md`
- Create: `src/components/dossier/__tests__/DossierHub.test.jsx`

- [ ] **Step 1: Add Dossier vocabulary entry to moodboard config**

Open `src/pages/moodboard/moodboard.config.js`. Find the `vocabulary` array (starts around line 21). Add this entry after the `Basecamp` line (preserving the array shape exactly — same indentation and trailing comma style as the surrounding entries):

```javascript
    { use: 'Dossier', avoid: 'personal vault / docs folder — distinct from VentureVault (marketplace)' },
```

- [ ] **Step 2: Prepend a dated entry to `docs/moodboard.log.md`**

If `docs/moodboard.log.md` exists, prepend (newest entry on top) the block below at the top of the file. If it does not exist, create it with this content:

```markdown
## 2026-05-13 — Curated Expeditions Foundation (Spec 0)

### Changed
- **Vocabulary**: `components/vault/` (personal tickets/passport docs) renamed to `components/dossier/`. `VentureVault` (marketplace, in `components/discovery/`) keeps the brand word. Display copy "PassportVault" → "Passport Dossier" in `PassportDossier.jsx` and `DocumentManifest.jsx`.
- **Routing**: introduced hybrid react-router. `/explore`, `/explore/:theme`, `/expedition/:slug` route to lazy stub pages; all legacy state-views render under a catch-all and behave identically.
- **Schema**: `pro_paths` gains `slug`, `gpx_storage_path`, `theme_category`, `tags`, `provenance`, `safety_meta`, `narrative_blocks`. New tables `pro_path_waypoints` + `pro_path_attempts`. RLS enabled on all three. Storage bucket `gpx` added with `pro_paths.is_curated`-gated public read.

### Ideas / next steps
- Spec 1 — Discovery surface: replace `VentureVault.jsx` SEO canonical URLs (`https://venturepath.app/vault/...`) to `/explore` and `/expedition/:slug`.
- Spec 3 — seed first 10 routes (Camino, Wild Atlantic Way, Iceland Ring, Romantic Road, Via Francigena, Route 66, Cabot Trail, Garden Route SA, Grand Tour Switzerland, Tulip Route) — all tourism-board / Overpass / NPS sources.
- Audit dev-only logs that still reference "Vault" in places we missed (run grep after Spec 1).
```

- [ ] **Step 3: Run the moodboard drift check**

```bash
npm run moodboard:check
```

Expected: no unresolved drift warnings. If new warnings appear unrelated to Spec 0, document them in the CHANGELOG entry but do not fix them in this PR.

- [ ] **Step 4: Add a minimal DossierHub render test**

Create `src/components/dossier/__tests__/DossierHub.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DossierHub from '../DossierHub';

describe('DossierHub (renamed from VaultHub)', () => {
  it('mounts without throwing', () => {
    expect(() => render(<DossierHub />)).not.toThrow();
  });
});
```

- [ ] **Step 5: Run the new test**

```bash
npm run test -- --run src/components/dossier/__tests__/DossierHub.test.jsx
```

Expected: PASS. If it fails with a missing-context error (e.g., `useTripStore must be used within a TripStoreProvider`), wrap the render in the required providers using the same pattern as existing tests under `src/store/__tests__/`. If the existing `VaultHub` had no test, the minimal "does not throw" assertion above is sufficient — do not over-engineer.

- [ ] **Step 6: Commit**

```bash
git add src/pages/moodboard/moodboard.config.js docs/moodboard.log.md src/components/dossier/__tests__/DossierHub.test.jsx
git commit -m "docs(moodboard): record Dossier vocabulary + Spec 0 changes; add DossierHub smoke test"
```

---

## Task 9: CHANGELOG + holyflex log + final verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `C:/Users/lasse/Desktop/holyflex/logs/2026-05-13.md` (create dir/file if missing)

- [ ] **Step 1: Append a CHANGELOG entry**

Open `CHANGELOG.md`. At the top (or under an existing `[Unreleased]` section if one exists), prepend:

```markdown
## 2026-05-13 — Curated Expeditions Foundation (Spec 0)

### Added
- Migration `supabase/migrations/20260513_curated_expeditions_foundation.sql`: `pro_paths` gains `slug` (unique, backfilled), `gpx_storage_path`, `theme_category` (movie/historical/thematic/city/geographical), `tags text[]`, `provenance jsonb`, `safety_meta jsonb`, `narrative_blocks jsonb`. New tables `pro_path_waypoints` and `pro_path_attempts`. RLS enabled on all three with public-read-where-curated + architect-write policies.
- Migration `supabase/migrations/20260513_gpx_storage_bucket.sql`: Storage bucket `gpx` with `is_curated`-gated public read and architect-only write.
- `react-router-dom@^7` dependency. New `src/router/AppRouter.jsx` exposes `/explore`, `/explore/:theme`, `/expedition/:slug` as lazy-loaded stub pages; catch-all renders existing state-view tree (extracted to `src/LegacyApp.jsx`) unchanged.
- Stub pages `src/pages/Explore.jsx`, `ExploreTheme.jsx`, `ExpeditionDetail.jsx`.
- Tests: `pipeline/__tests__/schema.test.js`, `src/router/__tests__/AppRouter.test.jsx`, `src/components/dossier/__tests__/DossierHub.test.jsx`.

### Changed
- Renamed `src/components/vault/` → `src/components/dossier/`. Components renamed: `VaultHub → DossierHub`, `VaultIngest → DossierIngest`, `PassportVault → PassportDossier`. Display copy "PassportVault" → "Passport Dossier" in `PassportDossier.jsx` and `DocumentManifest.jsx`. Other files in the directory keep their names (only directory moved). Utility `src/utils/vaultExtractor.js` unchanged (internal, not user-facing).
- `src/App.jsx`: legacy state-view router extracted to `src/LegacyApp.jsx`; root component now wraps `<AppRouter />`.
- `src/pages/moodboard/moodboard.config.js`: added `Dossier` vocabulary entry distinguishing it from `VentureVault`.

### Notes
- `seedCurated.js` pipeline uses `SUPABASE_SERVICE_KEY` (service role) and bypasses RLS — no pipeline regression.
- Spec 1 (Discovery surface) must update the canonical SEO URLs in `src/components/discovery/VentureVault.jsx` lines 56 + 74 (`https://venturepath.app/vault/...` → `/explore` and `/expedition/:slug`).
```

- [ ] **Step 2: Append a holyflex log entry (CLAUDE.md mandate)**

The HolyFlex CLAUDE.md mandates a log entry for every completed task. The log lives at `C:/Users/lasse/Desktop/holyflex/logs/YYYY-MM-DD.md`.

If `C:/Users/lasse/Desktop/holyflex/logs/2026-05-13.md` does not exist, create it. Otherwise append to it:

```markdown
## [HH:MM] VenturePath — Spec 0 Curated Expeditions Foundation

- Implemented Spec 0 per `venturepath/docs/superpowers/specs/2026-05-13-spec-0-foundation-design.md`
- Migration: `pro_paths` schema delta + new `pro_path_waypoints` + `pro_path_attempts` tables + RLS + `gpx` storage bucket
- Rename: `components/vault/` → `components/dossier/`; `VaultHub`/`VaultIngest`/`PassportVault` renamed; display copy updated; `VentureVault` (marketplace) preserved
- Router: hybrid react-router for `/explore`, `/explore/:theme`, `/expedition/:slug` with stub pages; legacy state-view tree extracted to `LegacyApp.jsx`
- Files changed: see `venturepath/CHANGELOG.md` 2026-05-13 entry
```

Replace `HH:MM` with the actual current time (24h format).

- [ ] **Step 3: Run the full test suite one final time**

```bash
npm run test -- --run
```

Expected: every test passes.

- [ ] **Step 4: Run the dev server, walk routes one last time**

```bash
npm run dev
```

Verify all six checks from Task 7 Step 7 still pass. Stop the dev server.

- [ ] **Step 5: Run the moodboard drift check once more**

```bash
npm run moodboard:check
```

Expected: no unresolved drift warnings.

- [ ] **Step 6: Commit final docs**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for Spec 0 curated expeditions foundation"
```

Then in HolyFlex repo:

```bash
cd C:/Users/lasse/Desktop/holyflex
git add logs/2026-05-13.md
git commit -m "log: VenturePath Spec 0 curated expeditions foundation"
cd C:/Users/lasse/Desktop/venturepath
```

- [ ] **Step 7: Push and open PR**

```bash
git push -u origin feat/curated-expeditions-foundation
```

Then open a PR titled: `feat(foundation): curated expeditions schema, dossier rename, public routing`

PR body should reference the spec at `docs/superpowers/specs/2026-05-13-spec-0-foundation-design.md` and the roadmap at `C:/Users/lasse/.claude/plans/think-of-all-the-prancy-orbit.md`.

---

## Done. What's next?

Spec 0 lands the plumbing. The next spec to tackle is **Spec 3** (Curated Content Pipeline — seed first 10 legally-free routes) per the roadmap's recommended sequence (`0 → 3 → 1 → 2 → 5 → 4 → 6 → 7 → 8`). Seeding content before exposing the Discovery surface avoids the APPLE_COMPLIANCE VP-4 "empty marketplace" failure mode.
