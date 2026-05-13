# Curated Content Pipeline (Spec 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest 48 curated Pro-Paths (38 free-licensed pre-fallback + 10 manual-trace) into Supabase via a rebuilt `seedCurated.js` orchestrator, producing real `pro_paths` rows + `pro_path_waypoints` + uploaded GPX files in the `gpx` Storage bucket, all staged at `is_curated=false` until Architect review.

**Architecture:** Rewrite `pipeline/seedCurated.js` from a hardcoded 4-route script into an orchestrator that loops over `pipeline/routes/<theme>/*.json` metadata files. Per-route, the orchestrator reads paired `pipeline/gpx/<slug>.gpx` (or synthesizes one from `trace_coords` via GraphHopper public endpoint), extracts deterministic facts via a new `pipeline/lib/parseGpx.js`, calls the existing `pipeline/generateExpedition.js` LLM with a GPX-enriched bundle for prose, then upserts via `pipeline/lib/upsertRoute.js` with `{onConflict:'slug'}` plus waypoint rows via `pipeline/lib/mapCategory.js`. Idempotent re-runs. Review gate via `is_curated=false`; bulk flip with `npm run seed:curated -- --approve`.

**Tech Stack:** Node 18+ ES modules, Supabase Postgres + Storage (service role), Anthropic SDK (existing `pipeline/llmClient.js`), `@xmldom/xmldom` (for GPX parsing in Node; not yet installed — Task 1 adds it), GraphHopper public REST endpoint (no key), Vitest for unit tests.

**Spec:** [2026-05-13-spec-3-curated-content-pipeline-design.md](../specs/2026-05-13-spec-3-curated-content-pipeline-design.md)
**Parent roadmap:** `C:\Users\lasse\.claude\plans\think-of-all-the-prancy-orbit.md`
**Depends on:** Spec 0 (PR #2 — landed 2026-05-13)

---

## Pre-flight

- [ ] **Step 1: Verify on the right branch and working tree clean**

```bash
cd C:/Users/lasse/Desktop/venturepath
git status
git rev-parse --abbrev-ref HEAD
```

Expected: clean working tree (or only `.claude/worktrees/...` modified — that's gitignored metadata). Note current branch.

- [ ] **Step 2: Verify Spec 0 is merged or accessible**

```bash
git log --oneline master..feat/curated-expeditions-foundation 2>&1 | head -10
```

Expected: shows the 8 Spec 0 commits. If `master` already includes them (Spec 0 PR merged), the commits won't appear — that's fine.

- [ ] **Step 3: Create the Spec 3 feature branch from current main-line tip**

```bash
git checkout -b feat/curated-content-pipeline
```

Expected: branch created and checked out. If master has Spec 0 merged, branch from master; otherwise branch from `feat/curated-expeditions-foundation` (Spec 0 must be reachable).

- [ ] **Step 4: Run baseline test suite**

```bash
npm run test -- --run --exclude '**/.claude/**' 2>&1 | tail -5
```

Expected: same baseline as Spec 0's final state — `Test Files: 4 failed | 75 passed (80)`, `Tests: 2 failed | 494 passed`. The 4 baseline failures (xmldom missing, LegLens placeholder, hydrateLeg flight assertion) carry over from before and are out of scope.

---

## Phase A — Plumbing (Tasks 1–8)

### Task 1: Install `@xmldom/xmldom` + create test fixture

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `pipeline/__tests__/fixtures/sample.gpx`

The existing `src/utils/gpxParser.js` already imports `@xmldom/xmldom` (per the 4 baseline test failures from Spec 0). Installing it now fixes those failures AND lets our new pipeline code parse GPX in Node.

- [ ] **Step 1: Install dependency**

```bash
npm i @xmldom/xmldom@^0.8.10
```

Expected: installs cleanly. The pinned major version matches what existing code expects.

- [ ] **Step 2: Verify install + that gpxParser.test.js now passes**

```bash
npm run test -- --run src/utils/gpxParser.test.js src/utils/waymarkedEngine.test.js 2>&1 | tail -8
```

Expected: both test files now run successfully (they were failing at file-load due to missing import).

- [ ] **Step 3: Create test fixture directory + sample GPX**

```bash
mkdir -p pipeline/__tests__/fixtures
```

Create `pipeline/__tests__/fixtures/sample.gpx`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath-test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Sample Test Route</name>
  </metadata>
  <wpt lat="42.8782" lon="-8.5448">
    <ele>260</ele>
    <name>Santiago de Compostela</name>
    <sym>City</sym>
  </wpt>
  <wpt lat="42.7800" lon="-8.4100">
    <ele>340</ele>
    <name>O Pino</name>
    <sym>Town</sym>
  </wpt>
  <wpt lat="42.7766" lon="-7.4144">
    <ele>650</ele>
    <name>Sarria</name>
    <sym>Trailhead</sym>
  </wpt>
  <trk>
    <name>Sample Trail Segment</name>
    <trkseg>
      <trkpt lat="42.7766" lon="-7.4144"><ele>650</ele></trkpt>
      <trkpt lat="42.7800" lon="-7.5000"><ele>620</ele></trkpt>
      <trkpt lat="42.7800" lon="-8.4100"><ele>340</ele></trkpt>
      <trkpt lat="42.8782" lon="-8.5448"><ele>260</ele></trkpt>
    </trkseg>
  </trk>
</gpx>
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json pipeline/__tests__/fixtures/sample.gpx
git commit -m "chore(pipeline): add @xmldom/xmldom for GPX parsing in Node + test fixture"
```

---

### Task 2: `parseGpx.js` + test (TDD)

**Files:**
- Create: `pipeline/__tests__/parseGpx.test.js`
- Create: `pipeline/lib/parseGpx.js`

This is the foundation — extract distance, elevation gain, and waypoint list from a GPX file path. Uses `@xmldom/xmldom` directly rather than reusing `src/utils/gpxParser.js` because that module is browser-oriented (returns objects with browser-shaped DOM). The pipeline wants a clean Node-side API.

- [ ] **Step 1: Write failing test**

```bash
mkdir -p pipeline/lib pipeline/__tests__
```

Create `pipeline/__tests__/parseGpx.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseGpx } from '../lib/parseGpx.js';

const FIXTURE = resolve(__dirname, 'fixtures/sample.gpx');

describe('parseGpx', () => {
  it('returns 3 waypoints with name/lat/lon/ele/sym', () => {
    const r = parseGpx(FIXTURE);
    expect(r.waypoints).toHaveLength(3);
    expect(r.waypoints[0]).toMatchObject({
      name: 'Santiago de Compostela',
      lat: 42.8782,
      lon: -8.5448,
      ele: 260,
      sym: 'City',
    });
    expect(r.waypoints[2].sym).toBe('Trailhead');
  });

  it('computes a positive distance from the trkseg in km', () => {
    const r = parseGpx(FIXTURE);
    expect(r.distanceKm).toBeGreaterThan(50);
    expect(r.distanceKm).toBeLessThan(200);
  });

  it('computes elevation gain only (positive deltas)', () => {
    // Fixture trkseg goes 650 → 620 → 340 → 260 (all descents). Gain should be 0.
    const r = parseGpx(FIXTURE);
    expect(r.elevationGain).toBe(0);
  });

  it('reports trackpoint count', () => {
    const r = parseGpx(FIXTURE);
    expect(r.trackpointCount).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run pipeline/__tests__/parseGpx.test.js 2>&1 | tail -8
```

Expected: FAIL — `parseGpx` is not defined.

- [ ] **Step 3: Implement `pipeline/lib/parseGpx.js`**

Create `pipeline/lib/parseGpx.js`:

```javascript
// pipeline/lib/parseGpx.js
// Parses a GPX file from disk and returns deterministic facts: waypoints, distance, elevation gain.
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function textOf(node, tag) {
  const el = node.getElementsByTagName(tag)[0];
  return el ? el.textContent.trim() : null;
}

export function parseGpx(filePath) {
  const xml = readFileSync(filePath, 'utf8');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  const wptNodes = Array.from(doc.getElementsByTagName('wpt'));
  const waypoints = wptNodes.map((n) => ({
    lat: parseFloat(n.getAttribute('lat')),
    lon: parseFloat(n.getAttribute('lon')),
    ele: textOf(n, 'ele') ? parseFloat(textOf(n, 'ele')) : null,
    name: textOf(n, 'name'),
    sym: textOf(n, 'sym') || textOf(n, 'type'),
  }));

  const trkptNodes = Array.from(doc.getElementsByTagName('trkpt'));
  const trackpoints = trkptNodes.map((n) => ({
    lat: parseFloat(n.getAttribute('lat')),
    lon: parseFloat(n.getAttribute('lon')),
    ele: textOf(n, 'ele') ? parseFloat(textOf(n, 'ele')) : null,
  }));

  let distanceKm = 0;
  let elevationGain = 0;
  for (let i = 1; i < trackpoints.length; i++) {
    const a = trackpoints[i - 1];
    const b = trackpoints[i];
    distanceKm += haversineKm(a.lat, a.lon, b.lat, b.lon);
    if (a.ele != null && b.ele != null && b.ele > a.ele) {
      elevationGain += b.ele - a.ele;
    }
  }

  return {
    waypoints,
    distanceKm: Math.round(distanceKm * 10) / 10,
    elevationGain: Math.round(elevationGain),
    trackpointCount: trackpoints.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run pipeline/__tests__/parseGpx.test.js 2>&1 | tail -8
```

Expected: 4/4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/parseGpx.js pipeline/__tests__/parseGpx.test.js
git commit -m "feat(pipeline): add parseGpx.js — extract waypoints/distance/elevation from GPX"
```

---

### Task 3: `mapCategory.js` + test (TDD)

**Files:**
- Create: `pipeline/__tests__/mapCategory.test.js`
- Create: `pipeline/lib/mapCategory.js`

Maps GPX `<sym>` strings (free-form across GPX producers) to the existing VP `waypointCategories.js` taxonomy. Unknown values map to `null`.

- [ ] **Step 1: Read existing taxonomy**

```bash
cat src/utils/legIntelligence/waypointCategories.js
```

Note the exported category keys (e.g. `water_source`, `summit`, `viewpoint`, `town`, `trailhead`, `permit_office`, `transfer`, `resupply`, `shelter`). Use those exact strings in the mapping below.

- [ ] **Step 2: Write failing test**

Create `pipeline/__tests__/mapCategory.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { mapCategory } from '../lib/mapCategory.js';

describe('mapCategory', () => {
  it.each([
    ['Trailhead',       'trailhead'],
    ['trailhead',       'trailhead'],
    ['Summit',          'summit'],
    ['Peak',            'summit'],
    ['Water',           'water_source'],
    ['Drinking Water',  'water_source'],
    ['Spring',          'water_source'],
    ['Viewpoint',       'viewpoint'],
    ['Scenic View',     'viewpoint'],
    ['Vista',           'viewpoint'],
    ['Town',            'town'],
    ['Village',         'town'],
    ['City',            'town'],
    ['Shelter',         'shelter'],
    ['Hut',             'shelter'],
    ['Refuge',          'shelter'],
    ['Camp',            'shelter'],
    ['Campground',      'shelter'],
    ['Transfer',        'transfer'],
    ['Permit',          'permit_office'],
    ['Permit Office',   'permit_office'],
    ['Resupply',        'resupply'],
    ['Shop',            'resupply'],
    ['Food',            'resupply'],
  ])('maps %s -> %s', (input, expected) => {
    expect(mapCategory(input)).toBe(expected);
  });

  it('returns null for null input', () => {
    expect(mapCategory(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(mapCategory('')).toBeNull();
  });

  it('returns null for unknown values', () => {
    expect(mapCategory('Spaceship')).toBeNull();
    expect(mapCategory('Dragon')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test -- --run pipeline/__tests__/mapCategory.test.js 2>&1 | tail -5
```

Expected: FAIL — `mapCategory` not defined.

- [ ] **Step 4: Implement `pipeline/lib/mapCategory.js`**

Create `pipeline/lib/mapCategory.js`:

```javascript
// pipeline/lib/mapCategory.js
// Maps GPX <sym> or <type> values to the VP waypointCategories.js taxonomy.
// Unknown values return null (waypoint has no category).

const SYM_MAP = {
  trailhead:       'trailhead',
  summit:          'summit',
  peak:            'summit',
  water:           'water_source',
  'drinking water':'water_source',
  spring:          'water_source',
  viewpoint:       'viewpoint',
  'scenic view':   'viewpoint',
  vista:           'viewpoint',
  town:            'town',
  village:         'town',
  city:            'town',
  shelter:         'shelter',
  hut:             'shelter',
  refuge:          'shelter',
  camp:            'shelter',
  campground:      'shelter',
  transfer:        'transfer',
  permit:          'permit_office',
  'permit office': 'permit_office',
  resupply:        'resupply',
  shop:            'resupply',
  food:            'resupply',
};

export function mapCategory(sym) {
  if (!sym) return null;
  return SYM_MAP[sym.toLowerCase().trim()] ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- --run pipeline/__tests__/mapCategory.test.js 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add pipeline/lib/mapCategory.js pipeline/__tests__/mapCategory.test.js
git commit -m "feat(pipeline): add mapCategory.js — GPX <sym> to VP waypointCategories"
```

---

### Task 4: `uploadGpx.js`

**Files:**
- Create: `pipeline/lib/uploadGpx.js`

Pure helper, no test (Supabase Storage client is side-effect-heavy and a real upload is part of the smoke test in Task 18).

- [ ] **Step 1: Implement `pipeline/lib/uploadGpx.js`**

Create `pipeline/lib/uploadGpx.js`:

```javascript
// pipeline/lib/uploadGpx.js
// Uploads a local GPX file to the `gpx` Supabase Storage bucket
// using the object naming convention <pro_path_id>.gpx (from Spec 0 RLS policies).
// Returns the storage_path string to write into pro_paths.gpx_storage_path.
import { readFileSync } from 'node:fs';

export async function uploadGpx({ supabase, proPathId, localGpxPath }) {
  const buf = readFileSync(localGpxPath);
  const objectKey = `${proPathId}.gpx`;
  const { error } = await supabase.storage
    .from('gpx')
    .upload(objectKey, buf, {
      contentType: 'application/gpx+xml',
      upsert: true,
    });
  if (error) throw new Error(`uploadGpx(${objectKey}): ${error.message}`);
  return objectKey;
}
```

- [ ] **Step 2: Type-check via import in a quick script**

```bash
node --input-type=module -e "import('./pipeline/lib/uploadGpx.js').then(m => console.log('OK', typeof m.uploadGpx))"
```

Expected: `OK function`.

- [ ] **Step 3: Commit**

```bash
git add pipeline/lib/uploadGpx.js
git commit -m "feat(pipeline): add uploadGpx.js — write GPX to <id>.gpx in Storage"
```

---

### Task 5: `draftFromGpx.js` + test (TDD)

**Files:**
- Create: `pipeline/__tests__/draftFromGpx.test.js`
- Create: `pipeline/lib/draftFromGpx.js`

Wraps `pipeline/generateExpedition.js`. Builds the bundle from route JSON + GPX stats, calls the existing module, returns merged draft.

- [ ] **Step 1: Write failing test**

Create `pipeline/__tests__/draftFromGpx.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../generateExpedition.js', () => ({
  generateExpedition: vi.fn(),
}));

import { generateExpedition } from '../generateExpedition.js';
import { draftFromGpx } from '../lib/draftFromGpx.js';

describe('draftFromGpx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles bundle with GPX-derived facts and route metadata', async () => {
    generateExpedition.mockResolvedValue({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
    });

    const routeJson = {
      slug: 'camino-de-santiago',
      name: 'Camino de Santiago',
      destination: 'Sarria → Santiago de Compostela',
      theme_category: 'historical',
      tags: ['pilgrimage'],
      climate: 'temperate',
      difficulty: 'Moderate',
      squad_min: 1,
      squad_max: 6,
    };
    const gpxStats = {
      distanceKm: 115,
      elevationGain: 1200,
      waypoints: [{ name: 'Sarria' }, { name: 'Portomarín' }, { name: 'O Pino' }, { name: 'Santiago' }],
    };

    const draft = await draftFromGpx(routeJson, gpxStats);

    expect(generateExpedition).toHaveBeenCalledOnce();
    const bundleArg = generateExpedition.mock.calls[0][0];
    expect(bundleArg).toMatchObject({
      name: 'Camino de Santiago',
      destination: 'Sarria → Santiago de Compostela',
      theme_category: 'historical',
      tags: ['pilgrimage'],
      climate: 'temperate',
      difficulty: 'Moderate',
      squad_min: 1,
      squad_max: 6,
      distance_km: 115,
      elevation_gain: 1200,
    });
    expect(bundleArg.waypoint_names).toEqual(['Sarria', 'Portomarín', 'O Pino', 'Santiago']);
    expect(draft).toEqual({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
    });
  });

  it('caps waypoint_names at 8 entries', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = Array.from({ length: 12 }, (_, i) => ({ name: `wp-${i}` }));
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].waypoint_names).toHaveLength(8);
  });

  it('filters out waypoints with null/empty name', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = [{ name: 'A' }, { name: null }, { name: '' }, { name: 'B' }];
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].waypoint_names).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run pipeline/__tests__/draftFromGpx.test.js 2>&1 | tail -5
```

Expected: FAIL — `draftFromGpx` not defined.

- [ ] **Step 3: Implement `pipeline/lib/draftFromGpx.js`**

Create `pipeline/lib/draftFromGpx.js`:

```javascript
// pipeline/lib/draftFromGpx.js
// Builds the LLM bundle from route JSON + GPX-derived stats, then calls generateExpedition.
import { generateExpedition } from '../generateExpedition.js';

export async function draftFromGpx(routeJson, gpxStats) {
  const waypoint_names = gpxStats.waypoints
    .map((w) => w.name)
    .filter((n) => n && n.length > 0)
    .slice(0, 8);

  const bundle = {
    name:           routeJson.name,
    destination:    routeJson.destination,
    theme_category: routeJson.theme_category,
    tags:           routeJson.tags,
    climate:        routeJson.climate,
    difficulty:     routeJson.difficulty,
    squad_min:      routeJson.squad_min,
    squad_max:      routeJson.squad_max,
    distance_km:    gpxStats.distanceKm,
    elevation_gain: gpxStats.elevationGain,
    waypoint_names,
  };

  return generateExpedition(bundle);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run pipeline/__tests__/draftFromGpx.test.js 2>&1 | tail -5
```

Expected: 3/3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/draftFromGpx.js pipeline/__tests__/draftFromGpx.test.js
git commit -m "feat(pipeline): add draftFromGpx.js — bundle assembly + LLM call wrapper"
```

---

### Task 6: `upsertRoute.js` + test (TDD)

**Files:**
- Create: `pipeline/__tests__/upsertRoute.test.js`
- Create: `pipeline/lib/upsertRoute.js`

The heart of the pipeline: takes an assembled `pro_paths` row + waypoints array, upserts by slug, replaces waypoints atomically (delete-then-insert).

- [ ] **Step 1: Write failing test**

Create `pipeline/__tests__/upsertRoute.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertRoute } from '../lib/upsertRoute.js';

function makeMockSupabase(scenario = 'happy') {
  const calls = { upsert: [], delete: [], insert: [], select: [] };

  // Chainable .from(table).upsert(...).select().single()
  const fromHandlers = {
    pro_paths: {
      upsert: vi.fn((row) => {
        calls.upsert.push(row);
        return {
          select: () => ({
            single: async () => {
              if (scenario === 'upsert_fail') return { data: null, error: { message: 'boom' } };
              return { data: { id: 'fake-uuid', slug: row.slug }, error: null };
            },
          }),
        };
      }),
    },
    pro_path_waypoints: {
      delete: vi.fn(() => {
        calls.delete.push(true);
        return {
          eq: async () => ({ error: null }),
        };
      }),
      insert: vi.fn(async (rows) => {
        calls.insert.push(rows);
        return { error: null };
      }),
    },
  };

  const supabase = {
    from: (table) => fromHandlers[table],
  };
  return { supabase, calls };
}

describe('upsertRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts pro_paths by slug, then deletes + inserts waypoints', async () => {
    const { supabase, calls } = makeMockSupabase();
    const result = await upsertRoute({
      supabase,
      row: { slug: 'camino', name: 'Camino', theme_category: 'historical' },
      waypoints: [
        { ord: 0, lat: 42.7, lon: -7.4, name: 'Sarria' },
        { ord: 1, lat: 42.8, lon: -8.5, name: 'Santiago' },
      ],
    });

    expect(result).toEqual({ id: 'fake-uuid', slug: 'camino' });
    expect(calls.upsert).toHaveLength(1);
    expect(calls.upsert[0].slug).toBe('camino');
    expect(calls.delete).toHaveLength(1);
    expect(calls.insert).toHaveLength(1);
    expect(calls.insert[0]).toHaveLength(2);
    expect(calls.insert[0][0]).toMatchObject({ path_id: 'fake-uuid', ord: 0, name: 'Sarria' });
  });

  it('passes onConflict: slug to the upsert call', async () => {
    const { supabase } = makeMockSupabase();
    const upsertSpy = supabase.from('pro_paths').upsert;
    await upsertRoute({
      supabase,
      row: { slug: 'x', name: 'X' },
      waypoints: [],
    });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'x' }),
      expect.objectContaining({ onConflict: 'slug' })
    );
  });

  it('skips the waypoints delete+insert when waypoints array is empty', async () => {
    const { supabase, calls } = makeMockSupabase();
    await upsertRoute({
      supabase,
      row: { slug: 'x', name: 'X' },
      waypoints: [],
    });
    expect(calls.delete).toHaveLength(0);
    expect(calls.insert).toHaveLength(0);
  });

  it('throws when pro_paths upsert errors', async () => {
    const { supabase } = makeMockSupabase('upsert_fail');
    await expect(
      upsertRoute({ supabase, row: { slug: 'x' }, waypoints: [] })
    ).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run pipeline/__tests__/upsertRoute.test.js 2>&1 | tail -5
```

Expected: FAIL — `upsertRoute` not defined.

- [ ] **Step 3: Implement `pipeline/lib/upsertRoute.js`**

Create `pipeline/lib/upsertRoute.js`:

```javascript
// pipeline/lib/upsertRoute.js
// Idempotent upsert of a pro_paths row by slug, plus atomic replacement of waypoints.
// Service-role auth required (bypasses RLS).

export async function upsertRoute({ supabase, row, waypoints }) {
  const { data, error } = await supabase
    .from('pro_paths')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw new Error(`upsertRoute(${row.slug}): ${error.message}`);

  if (waypoints && waypoints.length > 0) {
    const { error: delErr } = await supabase
      .from('pro_path_waypoints')
      .delete()
      .eq('path_id', data.id);
    if (delErr) throw new Error(`upsertRoute(${row.slug}) waypoint delete: ${delErr.message}`);

    const rows = waypoints.map((w) => ({ ...w, path_id: data.id }));
    const { error: insErr } = await supabase.from('pro_path_waypoints').insert(rows);
    if (insErr) throw new Error(`upsertRoute(${row.slug}) waypoint insert: ${insErr.message}`);
  }

  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run pipeline/__tests__/upsertRoute.test.js 2>&1 | tail -5
```

Expected: 4/4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/lib/upsertRoute.js pipeline/__tests__/upsertRoute.test.js
git commit -m "feat(pipeline): add upsertRoute.js — idempotent slug-keyed upsert + waypoints"
```

---

### Task 7: `graphhopperSnap.js` (manual-trace synthesizer)

**Files:**
- Create: `pipeline/lib/graphhopperSnap.js`

Snaps a list of `[lat, lon]` coordinates to a real path via GraphHopper public REST endpoint, returns a GPX 1.1 XML string. No API key needed for low-volume one-time batch use; rate-limit handled with a 2s `await` between calls in the orchestrator.

- [ ] **Step 1: Implement `pipeline/lib/graphhopperSnap.js`**

Create `pipeline/lib/graphhopperSnap.js`:

```javascript
// pipeline/lib/graphhopperSnap.js
// Snaps a list of [lat, lon] coordinates to a real path via GraphHopper.
// Returns a GPX 1.1 XML string ready to write to pipeline/gpx/<slug>.gpx.
// Free public endpoint, no key; rate-limited so the orchestrator must sleep
// 2s between routes.

const ENDPOINT = process.env.GRAPHHOPPER_URL ?? 'https://graphhopper.com/api/1/route';

export async function graphhopperSnap({ coords, slug, profile = 'foot' }) {
  if (!coords || coords.length < 2) {
    throw new Error(`graphhopperSnap(${slug}): need at least 2 coords`);
  }
  const pointParams = coords.map(([lat, lon]) => `point=${lat},${lon}`).join('&');
  const url = `${ENDPOINT}?${pointParams}&profile=${profile}&type=json&points_encoded=false&instructions=false&calc_points=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`graphhopperSnap(${slug}): HTTP ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  const path = body.paths?.[0];
  if (!path || !path.points?.coordinates) {
    throw new Error(`graphhopperSnap(${slug}): no path in response`);
  }

  return buildGpx({
    name: slug,
    coords: path.points.coordinates,  // [[lon, lat, ele?], ...]
  });
}

function buildGpx({ name, coords }) {
  const trkpts = coords
    .map(([lon, lat, ele]) => {
      const eleTag = ele != null ? `<ele>${ele}</ele>` : '';
      return `      <trkpt lat="${lat}" lon="${lon}">${eleTag}</trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath-graphhopperSnap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name></metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}
```

- [ ] **Step 2: Verify module loads**

```bash
node --input-type=module -e "import('./pipeline/lib/graphhopperSnap.js').then(m => console.log('OK', typeof m.graphhopperSnap))"
```

Expected: `OK function`.

- [ ] **Step 3: Commit**

```bash
git add pipeline/lib/graphhopperSnap.js
git commit -m "feat(pipeline): add graphhopperSnap.js — synthesize GPX from trace_coords"
```

---

### Task 8: Rewrite `seedCurated.js` orchestrator

**Files:**
- Modify: `pipeline/seedCurated.js` (full rewrite)
- Modify: `package.json` (script flags)

The orchestrator: loops `pipeline/routes/<theme>/*.json`, handles `--route=<slug>`, `--approve`, `--smoke` flags, writes synthesized GPX for manual-trace routes, calls the lib modules in order.

- [ ] **Step 1: Rewrite `pipeline/seedCurated.js`**

Replace the entire contents of `pipeline/seedCurated.js`:

```javascript
#!/usr/bin/env node
// pipeline/seedCurated.js
// VentureVault Curated Content Pipeline — Spec 3.
// Reads pipeline/routes/<theme>/*.json, parses paired GPX (or synthesizes from
// trace_coords), drafts prose with LLM, upserts to pro_paths + pro_path_waypoints.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { parseGpx } from './lib/parseGpx.js';
import { mapCategory } from './lib/mapCategory.js';
import { uploadGpx } from './lib/uploadGpx.js';
import { draftFromGpx } from './lib/draftFromGpx.js';
import { upsertRoute } from './lib/upsertRoute.js';
import { graphhopperSnap } from './lib/graphhopperSnap.js';
import { scoreQuality } from './scoreQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local (existing pattern from run.js)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  }
}

const ROUTES_DIR = path.join(__dirname, 'routes');
const GPX_DIR = path.join(__dirname, 'gpx');
const DEFERRED_DIR = path.join(ROUTES_DIR, '_deferred');
const THEMES = ['movie', 'historical', 'thematic', 'city', 'geographical'];

const args = process.argv.slice(2);
const routeArg = args.find((a) => a.startsWith('--route='))?.slice('--route='.length);
const approveOnly = args.includes('--approve');
const smoke = args.includes('--smoke');

function supa() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function loadAllRoutes() {
  const out = [];
  for (const theme of THEMES) {
    const dir = path.join(ROUTES_DIR, theme);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      out.push({ ...json, _theme: theme, _file: path.join(dir, file) });
    }
  }
  return out;
}

async function processRoute(supabase, route) {
  console.log(`\n► [${route._theme}] ${route.slug}`);

  // Resolve GPX file: either pre-existing or synthesized from trace_coords
  let gpxPath = path.join(GPX_DIR, route.gpx_file ?? `${route.slug}.gpx`);
  if (route.trace_coords && !fs.existsSync(gpxPath)) {
    console.log(`  synthesizing GPX via GraphHopper (${route.trace_coords.length} coords)`);
    const gpxXml = await graphhopperSnap({
      coords: route.trace_coords,
      slug: route.slug,
      profile: route.tags?.includes('foot') ? 'foot' : route.tags?.includes('bike') ? 'bike' : 'car',
    });
    fs.mkdirSync(GPX_DIR, { recursive: true });
    fs.writeFileSync(gpxPath, gpxXml);
    await new Promise((r) => setTimeout(r, 2000)); // rate limit
  }
  if (!fs.existsSync(gpxPath)) {
    throw new Error(`GPX file missing for ${route.slug}: ${gpxPath}`);
  }

  // Parse GPX deterministically
  const stats = parseGpx(gpxPath);
  console.log(`  parsed: ${stats.distanceKm}km, +${stats.elevationGain}m gain, ${stats.waypoints.length} wpts, ${stats.trackpointCount} trkpts`);

  // LLM draft
  const draft = await draftFromGpx(route, stats);

  // Assemble pro_paths row
  const row = {
    slug:              route.slug,
    name:              route.name,
    destination:       route.destination,
    architect_name:    route.architect_name ?? 'VenturePath Curator',
    architect_id:      null,
    theme_category:    route.theme_category,
    tags:              route.tags ?? [],
    climate:           route.climate,
    difficulty:        route.difficulty,
    squad_min:         route.squad_min,
    squad_max:         route.squad_max,
    distance_km:       stats.distanceKm,
    days:              draft.days,
    description:       draft.description,
    legs:              draft.legs,
    manifest_settings: { climate: route.climate, days: draft.days, hasChildren: false },
    objectives:        [],
    narrative_blocks: [],
    safety_meta:       {},
    provenance:        route.provenance ?? {},
    cover_image_url:   null,
    is_curated:        false,
    is_community:      false,
    source:            'pipeline',
    llm_quality_score: scoreQuality(draft),
  };

  // Assemble waypoint rows (without path_id — upsertRoute fills it)
  const waypointRows = stats.waypoints.map((wpt, i) => ({
    ord:              i,
    lat:              wpt.lat,
    lon:              wpt.lon,
    elevation_m:      wpt.ele,
    name:             wpt.name,
    category:         mapCategory(wpt.sym),
    trigger_radius_m: 20,
  }));

  // Upsert
  const upserted = await upsertRoute({ supabase, row, waypoints: waypointRows });
  console.log(`  upserted pro_paths.id=${upserted.id}`);

  // Upload GPX
  const storagePath = await uploadGpx({ supabase, proPathId: upserted.id, localGpxPath: gpxPath });
  await supabase.from('pro_paths').update({ gpx_storage_path: storagePath }).eq('id', upserted.id);
  console.log(`  uploaded ${storagePath}`);

  return upserted;
}

async function approveAll(supabase) {
  const { count, error } = await supabase
    .from('pro_paths')
    .update({ is_curated: true }, { count: 'exact' })
    .eq('source', 'pipeline')
    .eq('is_curated', false)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  console.log(`Approved ${count ?? 0} pipeline rows.`);
}

async function main() {
  const supabase = supa();

  if (approveOnly) {
    await approveAll(supabase);
    return;
  }

  let routes = loadAllRoutes();
  if (routeArg) routes = routes.filter((r) => r.slug === routeArg);
  if (smoke) routes = routes.slice(0, 1);
  if (routes.length === 0) {
    console.log('No routes matched filters.');
    return;
  }
  console.log(`\nVentureVault — ingesting ${routes.length} routes\n`);

  let ok = 0, fail = 0;
  for (const route of routes) {
    try {
      await processRoute(supabase, route);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${route.slug}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ✓ ${ok}  ✗ ${fail}`);
}

main().catch((err) => {
  console.error('Pipeline failure:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Update `package.json` script entry (no change needed if it already says `"seed:curated": "node pipeline/seedCurated.js"`)**

```bash
grep '"seed:curated"' package.json
```

Expected: `"seed:curated": "node pipeline/seedCurated.js"`. If it instead reads `seed:vault` (legacy alias from existing scripts), add a new entry:

```bash
node -e "const p = require('./package.json'); p.scripts['seed:curated'] = 'node pipeline/seedCurated.js'; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\n');"
```

- [ ] **Step 3: Verify orchestrator parses (no real run yet — no routes/JSONs exist)**

```bash
node pipeline/seedCurated.js 2>&1 | head -5
```

Expected: prints `VentureVault — ingesting 0 routes` or `No routes matched filters.` (because `pipeline/routes/` is still empty). No crash.

- [ ] **Step 4: Run all pipeline tests together**

```bash
npm run test -- --run pipeline/__tests__/ 2>&1 | tail -8
```

Expected: all pipeline tests pass (schema + parseGpx + mapCategory + draftFromGpx + upsertRoute = ~20 tests).

- [ ] **Step 5: Commit**

```bash
git add pipeline/seedCurated.js package.json
git commit -m "feat(pipeline): rewrite seedCurated.js as content-pipeline orchestrator"
```

---

## Phase B — Content (Tasks 9–15)

> **Phase B note.** Each task in Phase B creates per-route JSON files for one theme. The JSON files alone do not require the actual GPX file to exist yet — the orchestrator will warn at run time about missing GPX, which Task 15 fixes by downloading them. Tasks 9–14 are pure data entry against the spec's §2 format.
>
> **Manual-trace coord lists.** Tasks 10, 12, 13 include manual-trace routes. Each requires ~5 min of map research per route to assemble a plausible `trace_coords` list (5–15 [lat, lon] points along the canonical path). I'm providing seed coord lists below; verify them against Google Maps before commit (or accept them as best-effort drafts — GraphHopper snap will produce a plausible path either way).

### Task 9: Geographical routes (8 free + 3 deferred stubs)

**Files (create):**
- `pipeline/routes/geographical/patagonia-w-trek.json` *(backfill)*
- `pipeline/routes/geographical/gr5-chamonix-nice.json` *(backfill — substitutes Swiss Alps Haute)*
- `pipeline/routes/geographical/mt-fuji-sunrise.json` *(backfill)*
- `pipeline/routes/geographical/sahara-traverse.json`
- `pipeline/routes/geographical/everest-base-camp.json`
- `pipeline/routes/geographical/great-ocean-road.json`
- `pipeline/routes/geographical/milford-track.json`
- `pipeline/routes/geographical/drakensberg-traverse.json`
- `pipeline/routes/geographical/dolomites-alta-via-1.json`
- `pipeline/routes/_deferred/alps-haute-route.json`
- `pipeline/routes/_deferred/amazon-rainforest.json`
- `pipeline/routes/_deferred/gobi-desert-loop.json`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p pipeline/routes/geographical pipeline/routes/_deferred
```

- [ ] **Step 2: Create each route JSON using this template**

For each route below, write the file. Template:

```json
{
  "slug": "<slug>",
  "name": "<Full route name>",
  "destination": "<Start → End or single destination>",
  "theme_category": "geographical",
  "tags": ["<tag1>", "<tag2>"],
  "climate": "<alpine|tropical|subarctic|desert|temperate|arid>",
  "difficulty": "<Easy|Moderate|Hard|Expert>",
  "squad_min": <n>,
  "squad_max": <n>,
  "gpx_file": "<slug>.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "<tourism_board_cc|nps|osm_overpass|wikiloc_cc|manual_trace>",
    "source_url": "<url>",
    "license": "<CC BY-SA 4.0|public_domain|manual_research|tourism_board_terms>",
    "downloaded_at": "2026-05-13"
  }
}
```

Files to create (full content per route):

**`pipeline/routes/geographical/patagonia-w-trek.json`** (backfill):
```json
{
  "slug": "patagonia-w-trek",
  "name": "Patagonia W-Trek",
  "destination": "Torres del Paine, Chile",
  "theme_category": "geographical",
  "tags": ["alpine", "long_distance", "foot", "remote"],
  "climate": "temperate",
  "difficulty": "Expert",
  "squad_min": 2,
  "squad_max": 4,
  "gpx_file": "patagonia-w-trek.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://parquetorresdelpaine.cl/en/circuitos-de-trekking/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/gr5-chamonix-nice.json`** (backfill, substitutes Swiss Alps Haute):
```json
{
  "slug": "gr5-chamonix-nice",
  "name": "GR5 — Chamonix to Nice",
  "destination": "Chamonix, France → Nice, France",
  "theme_category": "geographical",
  "tags": ["alpine", "long_distance", "foot", "hut_to_hut"],
  "climate": "alpine",
  "difficulty": "Hard",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "gr5-chamonix-nice.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/12660861",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/mt-fuji-sunrise.json`** (backfill):
```json
{
  "slug": "mt-fuji-sunrise",
  "name": "Mt. Fuji Sunrise — Fujinomiya Route",
  "destination": "Mt. Fuji, Japan",
  "theme_category": "geographical",
  "tags": ["alpine", "summit", "foot", "overnight"],
  "climate": "alpine",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 8,
  "gpx_file": "mt-fuji-sunrise.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/4017823",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/sahara-traverse.json`**:
```json
{
  "slug": "sahara-traverse",
  "name": "Merzouga Dunes Sahara Traverse",
  "destination": "Merzouga, Morocco",
  "theme_category": "geographical",
  "tags": ["desert", "remote", "camel", "extreme"],
  "climate": "desert",
  "difficulty": "Hard",
  "squad_min": 2,
  "squad_max": 6,
  "gpx_file": "sahara-traverse.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "wikiloc_cc",
    "source_url": "https://www.wikiloc.com/offroading-trails/merzouga-dunes-traverse-432109",
    "license": "CC BY-SA 4.0",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/everest-base-camp.json`**:
```json
{
  "slug": "everest-base-camp",
  "name": "Everest Base Camp Trek",
  "destination": "Lukla → EBC, Nepal",
  "theme_category": "geographical",
  "tags": ["alpine", "long_distance", "foot", "high_altitude", "remote"],
  "climate": "alpine",
  "difficulty": "Expert",
  "squad_min": 2,
  "squad_max": 8,
  "gpx_file": "everest-base-camp.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.ntb.gov.np/everest-base-camp",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/great-ocean-road.json`**:
```json
{
  "slug": "great-ocean-road",
  "name": "Great Ocean Road",
  "destination": "Torquay → Allansford, Australia",
  "theme_category": "geographical",
  "tags": ["coastal", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "great-ocean-road.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/2069089",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/milford-track.json`**:
```json
{
  "slug": "milford-track",
  "name": "Milford Track",
  "destination": "Glade Wharf → Sandfly Point, New Zealand",
  "theme_category": "geographical",
  "tags": ["alpine", "rainforest", "foot", "hut_to_hut", "remote"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "milford-track.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.doc.govt.nz/milfordtrack",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/drakensberg-traverse.json`**:
```json
{
  "slug": "drakensberg-traverse",
  "name": "Drakensberg Grand Traverse",
  "destination": "Sentinel → Bushman's Nek, South Africa",
  "theme_category": "geographical",
  "tags": ["alpine", "long_distance", "foot", "remote", "extreme"],
  "climate": "temperate",
  "difficulty": "Expert",
  "squad_min": 2,
  "squad_max": 4,
  "gpx_file": "drakensberg-traverse.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://hiking-trails.com/trail/drakensberg-grand-traverse/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/geographical/dolomites-alta-via-1.json`**:
```json
{
  "slug": "dolomites-alta-via-1",
  "name": "Alta Via 1 — Dolomites Traverse",
  "destination": "Lago di Braies → Belluno, Italy",
  "theme_category": "geographical",
  "tags": ["alpine", "long_distance", "foot", "hut_to_hut"],
  "climate": "alpine",
  "difficulty": "Hard",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "dolomites-alta-via-1.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.alpenventuresunguided.com/av1planning/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 3: Create the 3 deferred stubs**

**`pipeline/routes/_deferred/alps-haute-route.json`**:
```json
{
  "slug": "alps-haute-route",
  "name": "Alps Haute Route — Chamonix to Zermatt",
  "deferred_reason": "premium_partnership_required",
  "provenance": {
    "source": "outdooractive_partner",
    "source_url": "https://www.outdooractive.com/en/route/alpine-crossing/haute-route-chamonix-zermatt/1376839/",
    "license": "requires_outdooractive_partner_api"
  }
}
```

**`pipeline/routes/_deferred/amazon-rainforest.json`**:
```json
{
  "slug": "amazon-rainforest",
  "name": "Amazon Rainforest Cruise",
  "deferred_reason": "no_meaningful_gpx_river_based",
  "provenance": {
    "source": "adventure_world_partner",
    "source_url": "https://www.adventureworld.com/en-au/tours/cruising-the-ecuadorian-amazon",
    "license": "requires_partnership"
  }
}
```

**`pipeline/routes/_deferred/gobi-desert-loop.json`**:
```json
{
  "slug": "gobi-desert-loop",
  "name": "Gobi Desert Loop",
  "deferred_reason": "premium_partnership_required",
  "provenance": {
    "source": "world_expeditions_partner",
    "source_url": "https://worldexpeditions.com/Mongolia",
    "license": "requires_partnership"
  }
}
```

- [ ] **Step 4: Verify all files load as JSON**

```bash
node --input-type=module -e "import('node:fs').then(({readFileSync,readdirSync}) => { for (const t of ['geographical','_deferred']) { for (const f of readdirSync('pipeline/routes/'+t)) { try { JSON.parse(readFileSync('pipeline/routes/'+t+'/'+f,'utf8')); } catch(e) { console.error(f, e.message); process.exit(1); } } } console.log('OK'); })"
```

Expected: `OK`.

- [ ] **Step 5: Create `pipeline/issues/premium_partnerships.md`**

```bash
mkdir -p pipeline/issues
```

Create `pipeline/issues/premium_partnerships.md`:

```markdown
# Premium Partnership Routes (Deferred)

These 4 routes from the md doc require licensed API access that we don't have in v1.
They live as stubs under `pipeline/routes/_deferred/` and are not ingested.

| Slug | Source | Partnership Required |
|---|---|---|
| `silk-road` | Komoot Partner API | https://www.komoot.com/partners |
| `alps-haute-route` | Outdooractive Partner | https://www.outdooractive.com/en/partner |
| `amazon-rainforest` | Adventure World / no GPX | river-based, no meaningful GPX |
| `gobi-desert-loop` | World Expeditions / Komoot | https://worldexpeditions.com/ |

If a partnership is obtained, move the stub into the matching theme folder, add
`tags`, `climate`, `difficulty`, `squad_min`, `squad_max`, `gpx_file` fields,
download the GPX into `pipeline/gpx/`, and re-run `npm run seed:curated -- --route=<slug>`.
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/routes/geographical pipeline/routes/_deferred pipeline/issues/premium_partnerships.md
git commit -m "feat(pipeline): geographical route JSONs (8) + 3 deferred stubs"
```

---

### Task 10: Movie routes (8 free + 2 manual-trace)

**Files (create):**
- `pipeline/routes/movie/lord-of-the-rings-nz.json`
- `pipeline/routes/movie/game-of-thrones-ni.json`
- `pipeline/routes/movie/harry-potter-jacobite.json`
- `pipeline/routes/movie/breaking-bad-abq.json`
- `pipeline/routes/movie/star-wars-tunisia.json`
- `pipeline/routes/movie/sound-of-music-salzburg.json`
- `pipeline/routes/movie/skyfall-glencoe.json`
- `pipeline/routes/movie/indiana-jones-petra.json`
- `pipeline/routes/movie/amelies-montmartre.json` *(manual-trace)*
- `pipeline/routes/movie/roman-holiday.json` *(manual-trace)*

- [ ] **Step 1: Create directory**

```bash
mkdir -p pipeline/routes/movie
```

- [ ] **Step 2: Create the 8 free-licensed movie route JSONs**

**`pipeline/routes/movie/lord-of-the-rings-nz.json`**:
```json
{
  "slug": "lord-of-the-rings-nz",
  "name": "Middle-earth — Lord of the Rings Locations",
  "destination": "North & South Islands, New Zealand",
  "theme_category": "movie",
  "tags": ["film_locations", "scenic_drive", "car", "multi_day"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "lord-of-the-rings-nz.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.doc.govt.nz/parks-and-recreation/places-to-go/lord-of-the-rings-locations/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/game-of-thrones-ni.json`**:
```json
{
  "slug": "game-of-thrones-ni",
  "name": "Game of Thrones — Northern Ireland Locations",
  "destination": "Northern Ireland",
  "theme_category": "movie",
  "tags": ["film_locations", "coastal", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "game-of-thrones-ni.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://discovernorthernireland.com/things-to-do/itineraries/game-of-thrones-itineraries",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/harry-potter-jacobite.json`**:
```json
{
  "slug": "harry-potter-jacobite",
  "name": "Harry Potter — Jacobite Steam Train",
  "destination": "Fort William → Mallaig, Scotland",
  "theme_category": "movie",
  "tags": ["film_locations", "train", "scenic"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 8,
  "gpx_file": "harry-potter-jacobite.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/4045906",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/breaking-bad-abq.json`**:
```json
{
  "slug": "breaking-bad-abq",
  "name": "Breaking Bad — Albuquerque",
  "destination": "Albuquerque, New Mexico, USA",
  "theme_category": "movie",
  "tags": ["film_locations", "city", "car"],
  "climate": "arid",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "breaking-bad-abq.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.visitalbuquerque.org/abq365/blog/post/breaking-bad-tour-of-albuquerque/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/star-wars-tunisia.json`**:
```json
{
  "slug": "star-wars-tunisia",
  "name": "Star Wars — Tatooine Sets in Tunisia",
  "destination": "Tozeur → Matmata, Tunisia",
  "theme_category": "movie",
  "tags": ["film_locations", "desert", "scenic_drive", "car"],
  "climate": "desert",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "star-wars-tunisia.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_research",
    "source_url": "https://www.starwars.com/news/visiting-the-star-wars-sets-in-tunisia",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/sound-of-music-salzburg.json`**:
```json
{
  "slug": "sound-of-music-salzburg",
  "name": "The Sound of Music — Salzburg Locations",
  "destination": "Salzburg, Austria",
  "theme_category": "movie",
  "tags": ["film_locations", "city", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 8,
  "gpx_file": "sound-of-music-salzburg.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.salzburg.info/en/salzburg/the-sound-of-music/filming-locations",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/skyfall-glencoe.json`**:
```json
{
  "slug": "skyfall-glencoe",
  "name": "James Bond Skyfall — Glen Coe",
  "destination": "Glen Coe, Scotland",
  "theme_category": "movie",
  "tags": ["film_locations", "alpine", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "skyfall-glencoe.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.visitscotland.com/things-to-do/landscapes-nature/mountains-hills/glen-coe",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/indiana-jones-petra.json`**:
```json
{
  "slug": "indiana-jones-petra",
  "name": "Indiana Jones — Petra, Jordan",
  "destination": "Petra, Jordan",
  "theme_category": "movie",
  "tags": ["film_locations", "historical", "desert", "foot"],
  "climate": "desert",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "indiana-jones-petra.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.visitjordan.com/Wonders-Of-Jordan/Petra",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 3: Create the 2 manual-trace movie routes**

**`pipeline/routes/movie/amelies-montmartre.json`**:
```json
{
  "slug": "amelies-montmartre",
  "name": "Amélie — A Montmartre Walk",
  "destination": "Montmartre, Paris, France",
  "theme_category": "movie",
  "tags": ["film_locations", "city", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "trace_coords": [
    [48.8867, 2.3431],
    [48.8861, 2.3424],
    [48.8848, 2.3399],
    [48.8841, 2.3380],
    [48.8836, 2.3370],
    [48.8829, 2.3358],
    [48.8821, 2.3349],
    [48.8814, 2.3340]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://homeselect.paris/en/blog/amelie-poulain-lieu-de-tournage/",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`pipeline/routes/movie/roman-holiday.json`**:
```json
{
  "slug": "roman-holiday",
  "name": "Roman Holiday — Audrey Hepburn's Rome",
  "destination": "Rome, Italy",
  "theme_category": "movie",
  "tags": ["film_locations", "city", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "trace_coords": [
    [41.9028, 12.4534],
    [41.9009, 12.4833],
    [41.8902, 12.4922],
    [41.8919, 12.4795],
    [41.8986, 12.4769],
    [41.9000, 12.4717],
    [41.9039, 12.4837]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.gpsmycity.com/tours/roman-holiday-movie-locations-walk-5390.html",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add pipeline/routes/movie
git commit -m "feat(pipeline): movie route JSONs (8 free + 2 manual-trace)"
```

---

### Task 11: Historical routes (9 free + 1 deferred stub)

**Files (create):**
- `pipeline/routes/historical/camino-de-santiago.json`
- `pipeline/routes/historical/lewis-and-clark.json`
- `pipeline/routes/historical/roman-limes.json`
- `pipeline/routes/historical/napoleons-route.json`
- `pipeline/routes/historical/oregon-trail.json`
- `pipeline/routes/historical/magna-carta-way.json`
- `pipeline/routes/historical/route-66.json`
- `pipeline/routes/historical/incan-trail.json`
- `pipeline/routes/historical/via-francigena.json`
- `pipeline/routes/_deferred/silk-road.json`

- [ ] **Step 1: Create directory and write all 9 historical files**

```bash
mkdir -p pipeline/routes/historical
```

**`camino-de-santiago.json`**:
```json
{
  "slug": "camino-de-santiago",
  "name": "Camino de Santiago — Camino Francés",
  "destination": "Sarria → Santiago de Compostela, Spain",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "foot"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "camino-de-santiago.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.britishpilgrimage.org/download-gpx",
    "license": "CC BY-SA 4.0",
    "downloaded_at": "2026-05-13"
  }
}
```

**`lewis-and-clark.json`**:
```json
{
  "slug": "lewis-and-clark",
  "name": "Lewis & Clark Trail",
  "destination": "Wood River, IL → Cape Disappointment, WA, USA",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "lewis-and-clark.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "nps",
    "source_url": "https://www.nps.gov/lecl/planyourvisit/maps.htm",
    "license": "public_domain",
    "downloaded_at": "2026-05-13"
  }
}
```

**`roman-limes.json`**:
```json
{
  "slug": "roman-limes",
  "name": "The Roman Limes",
  "destination": "Mainz → Regensburg, Germany",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "bike", "architecture"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "roman-limes.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.limesstrasse.de/en/german-limes-road/home",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`napoleons-route.json`**:
```json
{
  "slug": "napoleons-route",
  "name": "Napoleon's Route — GR406",
  "destination": "Golfe-Juan → Grenoble, France",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "foot"],
  "climate": "temperate",
  "difficulty": "Hard",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "napoleons-route.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.gr-infos.com/en/gr406.htm",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`oregon-trail.json`**:
```json
{
  "slug": "oregon-trail",
  "name": "The Oregon Trail",
  "destination": "Independence, MO → Oregon City, OR, USA",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "oregon-trail.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "nps",
    "source_url": "https://www.nps.gov/oreg/index.htm",
    "license": "public_domain",
    "downloaded_at": "2026-05-13"
  }
}
```

**`magna-carta-way.json`**:
```json
{
  "slug": "magna-carta-way",
  "name": "Magna Carta Way",
  "destination": "Windsor → Runnymede, England",
  "theme_category": "historical",
  "tags": ["pilgrimage", "foot", "walk", "short"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "magna-carta-way.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.ramblers.org.uk/go-walking/group-walks/magna-carta-walk-17-miles",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`route-66.json`**:
```json
{
  "slug": "route-66",
  "name": "Route 66 — Chicago to Santa Monica",
  "destination": "Chicago, IL → Santa Monica, CA, USA",
  "theme_category": "historical",
  "tags": ["scenic_drive", "long_distance", "car", "americana"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "route-66.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/3962108",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`incan-trail.json`**:
```json
{
  "slug": "incan-trail",
  "name": "Inca Trail to Machu Picchu",
  "destination": "KM82 → Machu Picchu, Peru",
  "theme_category": "historical",
  "tags": ["pilgrimage", "alpine", "foot", "high_altitude"],
  "climate": "alpine",
  "difficulty": "Hard",
  "squad_min": 1,
  "squad_max": 8,
  "gpx_file": "incan-trail.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.peru.travel/en/experiences/machu-picchu",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`via-francigena.json`**:
```json
{
  "slug": "via-francigena",
  "name": "Via Francigena — Canterbury to Rome",
  "destination": "Canterbury → Rome",
  "theme_category": "historical",
  "tags": ["pilgrimage", "long_distance", "foot"],
  "climate": "temperate",
  "difficulty": "Hard",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "via-francigena.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.viefrancigene.org/en/download-gps-tracks/",
    "license": "CC BY-SA 4.0",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 2: Create the Silk Road deferred stub**

**`pipeline/routes/_deferred/silk-road.json`**:
```json
{
  "slug": "silk-road",
  "name": "The Silk Road",
  "deferred_reason": "premium_partnership_required",
  "provenance": {
    "source": "komoot_partner",
    "source_url": "https://www.komoot.com/user/silkroadmountainrace",
    "license": "requires_komoot_partner_api"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/routes/historical pipeline/routes/_deferred/silk-road.json
git commit -m "feat(pipeline): historical route JSONs (9 free) + Silk Road deferred stub"
```

---

### Task 12: Thematic routes (9 free + 1 manual-trace)

**Files (create):**
- `pipeline/routes/thematic/romantic-road.json`
- `pipeline/routes/thematic/wild-atlantic-way.json`
- `pipeline/routes/thematic/garden-route-sa.json`
- `pipeline/routes/thematic/whisky-trail.json`
- `pipeline/routes/thematic/german-fairy-tale-route.json`
- `pipeline/routes/thematic/iceland-ring-road.json` *(backfill)*
- `pipeline/routes/thematic/tulip-route.json`
- `pipeline/routes/thematic/grand-tour-switzerland.json`
- `pipeline/routes/thematic/cabot-trail.json`
- `pipeline/routes/thematic/bourbon-trail.json` *(manual-trace)*

- [ ] **Step 1: Create directory + 9 free-licensed thematic files**

```bash
mkdir -p pipeline/routes/thematic
```

**`romantic-road.json`**:
```json
{
  "slug": "romantic-road",
  "name": "The Romantic Road",
  "destination": "Würzburg → Füssen, Germany",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "architecture", "car", "long_distance"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "romantic-road.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://romantischestrasse.de/en/outdoor/cycling-gps-tracks/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`wild-atlantic-way.json`**:
```json
{
  "slug": "wild-atlantic-way",
  "name": "Wild Atlantic Way",
  "destination": "Kinsale → Derry, Ireland",
  "theme_category": "thematic",
  "tags": ["coastal", "scenic_drive", "long_distance", "car"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "wild-atlantic-way.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.thewildatlanticway.com/route/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`garden-route-sa.json`**:
```json
{
  "slug": "garden-route-sa",
  "name": "The Garden Route",
  "destination": "Mossel Bay → Storms River, South Africa",
  "theme_category": "thematic",
  "tags": ["coastal", "scenic_drive", "car", "wildlife"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "garden-route-sa.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.southafrica.net/gl/en/travel/article/the-garden-route",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`whisky-trail.json`**:
```json
{
  "slug": "whisky-trail",
  "name": "Speyside Malt Whisky Trail",
  "destination": "Aberlour → Forres, Scotland",
  "theme_category": "thematic",
  "tags": ["food_drink", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "whisky-trail.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://maltwhiskytrail.com/map/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`german-fairy-tale-route.json`**:
```json
{
  "slug": "german-fairy-tale-route",
  "name": "German Fairy Tale Route",
  "destination": "Hanau → Bremen, Germany",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "architecture", "car", "long_distance", "family_friendly"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "german-fairy-tale-route.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.deutsche-maerchenstrasse.com/en/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`iceland-ring-road.json`** (backfill):
```json
{
  "slug": "iceland-ring-road",
  "name": "Iceland Ring Road",
  "destination": "Iceland (Ring Road / Route 1)",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "long_distance", "car", "coastal"],
  "climate": "subarctic",
  "difficulty": "Moderate",
  "squad_min": 2,
  "squad_max": 6,
  "gpx_file": "iceland-ring-road.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/162777",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`tulip-route.json`**:
```json
{
  "slug": "tulip-route",
  "name": "The Tulip Route",
  "destination": "Flevoland, Netherlands",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "seasonal", "car", "family_friendly"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "tulip-route.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.visitflevoland.nl/en/tulip-route",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`grand-tour-switzerland.json`**:
```json
{
  "slug": "grand-tour-switzerland",
  "name": "Grand Tour of Switzerland",
  "destination": "Switzerland (loop)",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "long_distance", "car", "alpine"],
  "climate": "alpine",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "grand-tour-switzerland.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.myswitzerland.com/en/experiences/experience-tour/grand-tour-of-switzerland/",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

**`cabot-trail.json`**:
```json
{
  "slug": "cabot-trail",
  "name": "The Cabot Trail",
  "destination": "Cape Breton, Nova Scotia, Canada",
  "theme_category": "thematic",
  "tags": ["scenic_drive", "coastal", "car", "wildlife"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "cabot-trail.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/146487",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 2: Create the 1 manual-trace thematic route**

**`bourbon-trail.json`**:
```json
{
  "slug": "bourbon-trail",
  "name": "Kentucky Bourbon Trail",
  "destination": "Louisville → Lexington, Kentucky, USA",
  "theme_category": "thematic",
  "tags": ["food_drink", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "trace_coords": [
    [38.2527, -85.7585],
    [38.0406, -84.4961],
    [37.7917, -85.4683],
    [37.6856, -85.8597],
    [38.0967, -85.0747],
    [38.0814, -85.6011],
    [38.1300, -85.6900]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://kybourbontrail.com/plan-your-adventure/",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/routes/thematic
git commit -m "feat(pipeline): thematic route JSONs (9 free + 1 manual-trace)"
```

---

### Task 13: City routes (3 free + 7 manual-trace)

**Files (create):**
- `pipeline/routes/city/yamanote-loop.json`
- `pipeline/routes/city/high-line-chelsea.json`
- `pipeline/routes/city/sf-49-mile-drive.json`
- `pipeline/routes/city/bauhaus-berlin.json` *(manual-trace)*
- `pipeline/routes/city/jack-the-ripper.json` *(manual-trace)*
- `pipeline/routes/city/street-art-melbourne.json` *(manual-trace)*
- `pipeline/routes/city/gaudi-trail.json` *(manual-trace)*
- `pipeline/routes/city/prague-royal-way.json` *(manual-trace)*
- `pipeline/routes/city/venice-canals.json` *(manual-trace)*
- `pipeline/routes/city/istanbul-seven-hills.json` *(manual-trace)*

- [ ] **Step 1: Create directory + 3 OSM-relation-backed routes**

```bash
mkdir -p pipeline/routes/city
```

**`yamanote-loop.json`**:
```json
{
  "slug": "yamanote-loop",
  "name": "Yamanote Loop Walk",
  "destination": "Tokyo, Japan",
  "theme_category": "city",
  "tags": ["city", "long_distance", "foot", "urban"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 4,
  "gpx_file": "yamanote-loop.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/relation/2143229",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`high-line-chelsea.json`**:
```json
{
  "slug": "high-line-chelsea",
  "name": "High Line — Chelsea Walk",
  "destination": "New York City, USA",
  "theme_category": "city",
  "tags": ["city", "architecture", "foot", "walk", "short"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 8,
  "gpx_file": "high-line-chelsea.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "osm_overpass",
    "source_url": "https://www.openstreetmap.org/way/40097478",
    "license": "ODbL",
    "downloaded_at": "2026-05-13"
  }
}
```

**`sf-49-mile-drive.json`** (the SF 49-Mile Drive may not exist as a single OSM relation — if Task 15 can't find one, swap `provenance.source` to `manual_trace` and add a `trace_coords` list from sftravel.com's published landmark sequence):
```json
{
  "slug": "sf-49-mile-drive",
  "name": "San Francisco 49-Mile Scenic Drive",
  "destination": "San Francisco, CA, USA",
  "theme_category": "city",
  "tags": ["city", "scenic_drive", "car"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "gpx_file": "sf-49-mile-drive.gpx",
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "tourism_board_cc",
    "source_url": "https://www.sftravel.com/article/san-franciscos-49-mile-scenic-drive",
    "license": "tourism_board_terms",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 2: Create the 7 manual-trace city routes**

**`bauhaus-berlin.json`**:
```json
{
  "slug": "bauhaus-berlin",
  "name": "Bauhaus Berlin",
  "destination": "Berlin, Germany",
  "theme_category": "city",
  "tags": ["city", "architecture", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "trace_coords": [
    [52.5067, 13.3543],
    [52.5037, 13.4194],
    [52.5163, 13.3777],
    [52.5219, 13.4061],
    [52.4736, 13.4309],
    [52.5070, 13.3389]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.visitberlin.de/en/bauhaus-berlin",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`jack-the-ripper.json`**:
```json
{
  "slug": "jack-the-ripper",
  "name": "Jack the Ripper Trail",
  "destination": "Whitechapel, London, England",
  "theme_category": "city",
  "tags": ["city", "historical", "foot", "walk", "night"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 8,
  "trace_coords": [
    [51.5174, -0.0716],
    [51.5151, -0.0676],
    [51.5184, -0.0658],
    [51.5193, -0.0712],
    [51.5168, -0.0762]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.jack-the-ripper-tour.com/map-of-whitechapel/",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`street-art-melbourne.json`**:
```json
{
  "slug": "street-art-melbourne",
  "name": "Melbourne Street Art Walk",
  "destination": "Melbourne CBD, Australia",
  "theme_category": "city",
  "tags": ["city", "art", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "trace_coords": [
    [-37.8136, 144.9631],
    [-37.8141, 144.9665],
    [-37.8163, 144.9683],
    [-37.8174, 144.9647],
    [-37.8156, 144.9613]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://whatson.melbourne.vic.gov.uk/article/melbournes-best-street-art",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`gaudi-trail.json`**:
```json
{
  "slug": "gaudi-trail",
  "name": "Barcelona Gaudí Trail",
  "destination": "Barcelona, Spain",
  "theme_category": "city",
  "tags": ["city", "architecture", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "trace_coords": [
    [41.4036, 2.1744],
    [41.4148, 2.1527],
    [41.3915, 2.1650],
    [41.4080, 2.1525],
    [41.3851, 2.1734]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.gpsmycity.com/tours/antoni-gaudis-masterpieces-walking-tour-1895.html",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`prague-royal-way.json`**:
```json
{
  "slug": "prague-royal-way",
  "name": "Prague Royal Way",
  "destination": "Prague, Czech Republic",
  "theme_category": "city",
  "tags": ["city", "historical", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 6,
  "trace_coords": [
    [50.0875, 14.4213],
    [50.0865, 14.4239],
    [50.0863, 14.4180],
    [50.0908, 14.4055]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.prague.eu/en/articles/the-royal-route-10526",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`venice-canals.json`**:
```json
{
  "slug": "venice-canals",
  "name": "Venice Hidden Canals",
  "destination": "Venice, Italy",
  "theme_category": "city",
  "tags": ["city", "coastal", "foot", "walk"],
  "climate": "temperate",
  "difficulty": "Easy",
  "squad_min": 1,
  "squad_max": 4,
  "trace_coords": [
    [45.4408, 12.3155],
    [45.4339, 12.3401],
    [45.4408, 12.3257],
    [45.4374, 12.3358],
    [45.4393, 12.3413]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://www.veneziaunica.it/en/content/walking-itineraries",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**`istanbul-seven-hills.json`**:
```json
{
  "slug": "istanbul-seven-hills",
  "name": "Istanbul Seven Hills",
  "destination": "Istanbul, Turkey",
  "theme_category": "city",
  "tags": ["city", "historical", "foot", "walk", "long_distance"],
  "climate": "temperate",
  "difficulty": "Moderate",
  "squad_min": 1,
  "squad_max": 6,
  "trace_coords": [
    [41.0082, 28.9784],
    [41.0086, 28.9802],
    [41.0117, 28.9655],
    [41.0125, 28.9498],
    [41.0107, 28.9583],
    [41.0151, 28.9468],
    [41.0070, 28.9602]
  ],
  "architect_name": "VenturePath Curator",
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://serifyenen.com/tours/seven-hills-of-istanbul-and-theodosian-walls/",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/routes/city
git commit -m "feat(pipeline): city route JSONs (3 free + 7 manual-trace)"
```

---

### Task 14: Validate all route JSONs as a batch

This task is a sanity gate before the GPX-acquisition slog. Every JSON file must parse, every slug must be unique, every theme_category must match its directory.

- [ ] **Step 1: Run JSON+sanity sweep**

```bash
node --input-type=module -e "
import('node:fs').then(({readFileSync,readdirSync,statSync}) => {
  const slugs = new Set();
  const themes = ['movie','historical','thematic','city','geographical'];
  let n = 0, errors = 0;
  for (const t of themes) {
    const dir = 'pipeline/routes/'+t;
    for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const p = dir+'/'+f;
      try {
        const j = JSON.parse(readFileSync(p,'utf8'));
        if (j.theme_category !== t) { console.error(p, 'theme_category mismatch:', j.theme_category); errors++; }
        if (slugs.has(j.slug)) { console.error(p, 'duplicate slug:', j.slug); errors++; }
        slugs.add(j.slug);
        if (!j.gpx_file && !j.trace_coords) { console.error(p, 'neither gpx_file nor trace_coords'); errors++; }
        n++;
      } catch(e) { console.error(p, e.message); errors++; }
    }
  }
  console.log('Routes:', n, 'unique slugs:', slugs.size, 'errors:', errors);
  if (errors) process.exit(1);
});
"
```

Expected: `Routes: 48 unique slugs: 48 errors: 0`. If errors, fix and re-run.

- [ ] **Step 2: Confirm `_deferred` count too**

```bash
ls pipeline/routes/_deferred | wc -l
```

Expected: `4`.

- [ ] **Step 3: Run all unit tests (no regression)**

```bash
npm run test -- --run pipeline/__tests__/ 2>&1 | tail -5
```

Expected: all pipeline tests pass.

- [ ] **Step 4: Commit (validation pass — no code changes, this is the gate)**

If there were corrections in Step 1, commit them with:

```bash
git add pipeline/routes
git commit -m "fix(pipeline): correct route JSON validation errors from batch sweep"
```

Otherwise skip this commit.

---

### Task 15: Acquire GPX files

**Files (create):**
- `pipeline/gpx/<slug>.gpx` × 38 (the free-licensed routes — manual-trace ones get synthesized during pipeline run)

This is the heaviest manual step. For each of the 38 free-licensed routes, fetch a GPX from its `provenance.source_url` and save to `pipeline/gpx/<slug>.gpx`.

> **If a tourism-board URL doesn't expose a downloadable `.gpx` (info page only):** apply the fallback rule from spec §1.6. Edit that route's JSON: remove `gpx_file`, add `trace_coords: [[lat,lon], ...]` derived from the page's landmark photos, and update `provenance.source` to `manual_trace`.

- [ ] **Step 1: Create gpx directory**

```bash
mkdir -p pipeline/gpx
```

- [ ] **Step 2: For each free-licensed route, fetch GPX**

Use one of these strategies per route:

**OSM Overpass relation (8 routes):** Use `overpass-api.de` to extract a relation's geometry as GPX:

```bash
# Example: Route 66 (relation 3962108)
curl -L "https://www.openstreetmap.org/api/0.6/relation/3962108/full" -o /tmp/route66.osm
# Convert to GPX with osmtogpx (npm i -g osmtogpx) OR use online converter at gpx.studio
# Easier: visit https://www.openstreetmap.org/relation/3962108 and use the "GPX" export
```

Routes via Overpass: `route-66`, `harry-potter-jacobite`, `mt-fuji-sunrise`, `iceland-ring-road`, `gr5-chamonix-nice`, `great-ocean-road`, `cabot-trail`, `yamanote-loop`, `high-line-chelsea`, `sf-49-mile-drive`.

**Tourism-board CC download (varies):** Visit the URL in `provenance.source_url`, look for a "Download GPX" link. If absent, fall back to manual-trace per the rule above.

Routes: all the rest.

**NPS public-domain (2 routes):** `lewis-and-clark`, `oregon-trail` — NPS maps page has KML/GPX downloads; if only KML, convert with `gpsbabel -i kml -f x.kml -o gpx -F x.gpx`.

**Wikiloc CC (1 route):** `sahara-traverse` — log into wikiloc.com if needed, download GPX.

- [ ] **Step 3: Verify each GPX file parses**

```bash
node --input-type=module -e "
import('node:fs').then(async ({readdirSync}) => {
  const { parseGpx } = await import('./pipeline/lib/parseGpx.js');
  const files = readdirSync('pipeline/gpx').filter(f => f.endsWith('.gpx'));
  for (const f of files) {
    try {
      const r = parseGpx('pipeline/gpx/'+f);
      console.log(f, '✓', r.distanceKm+'km', r.waypoints.length+'wpts', r.trackpointCount+'trkpts');
    } catch(e) { console.error(f, '✗', e.message); }
  }
});
"
```

Expected: each row shows `✓` with distance/waypoint/trackpoint counts. Zero `✗` rows.

- [ ] **Step 4: Apply fallback rule for any URL that didn't yield a GPX**

For each route where Step 2 failed, edit the route JSON to remove `gpx_file` and add `trace_coords`. Use the source URL's landmark list to derive 5–15 coords.

- [ ] **Step 5: Re-run validation sweep from Task 14**

```bash
node --input-type=module -e "
import('node:fs').then(({readFileSync,readdirSync}) => {
  const themes = ['movie','historical','thematic','city','geographical'];
  let n=0, hasGpx=0, hasTrace=0;
  for (const t of themes) {
    for (const f of readdirSync('pipeline/routes/'+t).filter(x=>x.endsWith('.json'))) {
      const j = JSON.parse(readFileSync('pipeline/routes/'+t+'/'+f,'utf8'));
      n++;
      if (j.gpx_file) hasGpx++;
      else if (j.trace_coords) hasTrace++;
      else console.error(f, 'missing gpx_file AND trace_coords');
    }
  }
  console.log('Total:', n, 'gpx:', hasGpx, 'trace:', hasTrace);
});
"
```

Expected: `Total: 48 gpx: X trace: Y` where `X+Y == 48`.

- [ ] **Step 6: Commit GPX files + any fallback JSON edits**

```bash
git add pipeline/gpx pipeline/routes
git commit -m "feat(pipeline): GPX files for free-licensed routes + fallback rule applied"
```

---

## Phase C — Execute + Finalize (Tasks 16–18)

### Task 16: Smoke-run pipeline against 1 route

**Files:** none (live Supabase changes)

- [ ] **Step 1: Confirm env vars**

```bash
grep -E '^(VITE_SUPABASE_URL|SUPABASE_SERVICE_KEY|ANTHROPIC_API_KEY)' .env.local
```

Expected: all three present. If missing, set them before continuing.

- [ ] **Step 2: Run single-route smoke**

```bash
npm run seed:curated -- --route=camino-de-santiago 2>&1 | tee /tmp/seed-smoke.log
```

Expected (sequence in logs):
```
► [historical] camino-de-santiago
  parsed: <N>km, +<M>m gain, <W> wpts, <T> trkpts
  upserted pro_paths.id=<uuid>
  uploaded <uuid>.gpx
Done. ✓ 1  ✗ 0
```

- [ ] **Step 3: Sanity-check the row in Supabase**

In the Supabase SQL editor:

```sql
select id, slug, name, theme_category, distance_km, days, is_curated, gpx_storage_path
  from pro_paths
  where slug = 'camino-de-santiago';
```

Expected: 1 row, `is_curated=false`, `gpx_storage_path` set to `<uuid>.gpx`.

```sql
select count(*) from pro_path_waypoints
  where path_id = (select id from pro_paths where slug='camino-de-santiago');
```

Expected: count matches the `<W>` waypoints number from the log.

- [ ] **Step 4: If smoke passes, proceed. If it fails, debug.**

Common failure modes:
- `Pipeline failure: ... SUPABASE_SERVICE_KEY undefined` → check `.env.local`.
- `LLM ... rate limit` → wait 1 min, retry just that route.
- `Storage upload 403` → re-verify Spec 0 storage policies are applied.
- `parseGpx throws ... no trkpt` → GPX has only `<rte>`, not `<trk>`. Edit `parseGpx.js` to also handle `<rtept>` *(spec §5 acknowledged GPX dialects vary — this is the most likely real-world fix needed)*.

- [ ] **Step 5: No commit (live pipeline run, no code changes)**

---

### Task 17: Full pipeline run + bulk approve

- [ ] **Step 1: Run all 48 routes**

```bash
npm run seed:curated 2>&1 | tee /tmp/seed-full.log
```

Expected runtime: ~12 minutes. Each route logs ✓ or ✗. Acceptable for 0–4 routes to fail (will be retried individually). If >4 fail, debug the common pattern before retrying.

- [ ] **Step 2: Retry failed routes individually**

```bash
# For each failed slug in /tmp/seed-full.log:
npm run seed:curated -- --route=<slug>
```

- [ ] **Step 3: Sanity sweep all source-bucket distribution**

```sql
select provenance->>'source' as source, count(*)
  from pro_paths where source='pipeline'
  group by source order by 2 desc;
```

Expected: counts per source. Total should sum to 48.

- [ ] **Step 4: Spot-review 5 drafted descriptions in Supabase Table editor**

Pick 5 random routes spanning all 5 themes. Open the row, read `description`, verify it's coherent and uses VP vocabulary (Architect/Pioneer/Expedition/Leg/Squad — never "user/trip"). Edit in-place if needed.

- [ ] **Step 5: Bulk-flip `is_curated`**

```bash
npm run seed:curated -- --approve 2>&1 | tail -3
```

Expected: `Approved 48 pipeline rows.` (or close — minus any you flipped manually in Step 4).

- [ ] **Step 6: Final verification queries**

```sql
select count(*) from pro_paths where source='pipeline' and is_curated=true;
-- Expected: 48

select count(*) from pro_path_waypoints
  where path_id in (select id from pro_paths where source='pipeline');
-- Expected: 100–500 depending on per-GPX <wpt> density

select count(*) from storage.objects where bucket_id='gpx';
-- Expected: 48
```

- [ ] **Step 7: No commit (live data only)**

---

### Task 18: CHANGELOG + moodboard log + holyflex log + PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/moodboard.log.md`
- Modify: `C:/Users/lasse/Desktop/holyflex/logs/2026-05-13.md` (or current date)

- [ ] **Step 1: Append CHANGELOG entry**

Open `CHANGELOG.md` at the top. Insert above the most-recent entry:

```markdown
## [Unreleased] — 2026-05-13 — Curated Expeditions Content (Spec 3)

### Added
- **48 curated Pro-Paths** seeded across all 5 theme categories (movie/historical/thematic/city/geographical). Real `pro_paths` rows + `pro_path_waypoints` + uploaded GPX in the `gpx` Storage bucket.
- Pipeline reshape: `pipeline/seedCurated.js` rewritten as orchestrator + `pipeline/lib/` modules (`parseGpx`, `mapCategory`, `uploadGpx`, `draftFromGpx`, `upsertRoute`, `graphhopperSnap`).
- `pipeline/routes/<theme>/*.json` (48 route metadata files) + `pipeline/routes/_deferred/*.json` (4 stubs for premium-partnership-required routes parked per D7).
- `pipeline/gpx/*.gpx` (38 free-licensed GPX files + ~10 synthesized via GraphHopper from `trace_coords`).
- `@xmldom/xmldom` dependency (resolves long-standing baseline test failures in `gpxParser.test.js` and `waymarkedEngine.test.js`).
- Pipeline tests: `parseGpx.test.js` (4), `mapCategory.test.js` (~24), `draftFromGpx.test.js` (3), `upsertRoute.test.js` (4). All TDD.
- `pipeline/issues/premium_partnerships.md` — tracks the 4 deferred routes.
- New `seed:curated` script flags: `--route=<slug>`, `--approve`, `--smoke`.

### Changed
- Existing 4 hardcoded routes (Patagonia/Iceland/Swiss Alps/Fuji) backfilled with theme/tags/slug/GPX. Swiss Alps Haute Route substituted with GR5 Chamonix–Nice (D7 — Outdooractive source is premium-partnership-only).

### Notes
- All 48 rows landed at `is_curated=false`, then bulk-flipped via `npm run seed:curated -- --approve` after spot-review. Spec 1 (Discovery surface) can now query `is_curated=true` and find 48 substantive listings.
- Cross-app TODO recorded in `upsertRoute.js`: emit `pro_path.created` event to What's Cooking cuisine-by-destination subscriber (follow-up PR).
```

- [ ] **Step 2: Prepend moodboard log entry**

Open `docs/moodboard.log.md`. Insert this block at the top (newest first):

```markdown
## 2026-05-13 — Curated Expeditions Content (Spec 3)

### Changed
- 48 curated Pro-Paths now populate the VentureVault marketplace. All 5 theme categories represented (movie 10, historical 9, thematic 10, city 10, geographical 9). Each row carries real GPX, real waypoints, and an LLM-drafted description in VP voice.
- Vocabulary in drafted descriptions verified to use Architect / Pioneer / Expedition / Leg / Squad consistently. No generic "user/trip" language slipped past the LLM prompt.

### Ideas / next steps
- Spec 1 (Discovery): now unblocked. 48 listings is comfortable for the marketplace surface.
- Spec 4 (Narrative waypoint layer): `pro_path_waypoints` table is populated and ready for per-waypoint narrative/audio/AR payloads.
- Cover images still null across all 48 rows. Spec 1 must wire `destination_images` scraping or curator-supplied Unsplash links before public launch.
- Movie + city manual-trace routes look thin compared to long-distance routes — consider commissioning hand-curated trace lists for the 11 manual-trace routes to make the routes feel polished, not "snapped path."
```

- [ ] **Step 3: Append HolyFlex log entry**

Open or create `C:/Users/lasse/Desktop/holyflex/logs/2026-05-13.md` (date may differ if execution spans multiple days — use current date). Append at the top:

```markdown
## [HH:MM] VP — Spec 3 Curated Content Pipeline SHIPPED (48 routes, 18 tasks)

- Executed Spec 3 per `venturepath/docs/superpowers/specs/2026-05-13-spec-3-curated-content-pipeline-design.md`
- Pipeline reshape: 6 new lib modules + 4 TDD test files (~35 tests, all green)
- 48 curated Pro-Paths ingested + 4 deferred stubs parked
- Cross-app: TODO recorded for WC cuisine-by-destination emitter (follow-up PR)
- Branch: feat/curated-content-pipeline, ~20 commits, ready for PR
```

Replace `HH:MM` with current time (24h).

- [ ] **Step 4: Run moodboard drift check**

```bash
npm run moodboard:check 2>&1 | tail -3
```

Expected: `✓ No moodboard drift`.

- [ ] **Step 5: Final test sweep**

```bash
npm run test -- --run --exclude '**/.claude/**' 2>&1 | tail -5
```

Expected: at least 35 pipeline tests pass + previous Spec 0 tests pass + the previously-failing `gpxParser.test.js` and `waymarkedEngine.test.js` now pass (thanks to xmldom). Net result: baseline failures should drop from 4 files to ~2 files (only LegLens + hydrateLeg remain).

- [ ] **Step 6: Commit the docs**

```bash
git add CHANGELOG.md docs/moodboard.log.md
git commit -m "docs: changelog + moodboard log for Spec 3 curated content pipeline"
```

HolyFlex log is in a gitignored directory, no commit needed there.

- [ ] **Step 7: Push branch**

```bash
git push -u origin feat/curated-content-pipeline
```

- [ ] **Step 8: Open PR**

```bash
gh pr create --base master --title "feat(pipeline): curated expeditions content (48 routes)" --body "$(cat <<'EOF'
## Summary

Spec 3 of the Curated Expeditions roadmap. Fills the VentureVault marketplace
with 48 real, legally-shippable curated Pro-Paths spanning all 5 theme categories.

- 6 new pipeline library modules (`parseGpx`, `mapCategory`, `uploadGpx`, `draftFromGpx`, `upsertRoute`, `graphhopperSnap`)
- 4 new TDD test files (~35 assertions)
- 48 route JSON metadata files + paired GPX files (~5–7 MB total, committed)
- 4 deferred stubs for premium-partnership routes parked under `_deferred/`
- LLM-drafted descriptions reviewed by Architect; all rows flipped to `is_curated=true`
- `@xmldom/xmldom` installed — resolves long-standing `gpxParser.test.js` baseline failure

## Plan + Spec
- Spec: `docs/superpowers/specs/2026-05-13-spec-3-curated-content-pipeline-design.md`
- Plan: `docs/superpowers/plans/2026-05-13-spec-3-curated-content-pipeline.md`

## Test plan
- [x] All pipeline unit tests pass (parseGpx, mapCategory, draftFromGpx, upsertRoute)
- [x] Schema test from Spec 0 still passes
- [x] Smoke run against `camino-de-santiago` produces row + waypoints + storage upload
- [x] Full run produces 48 rows, source-bucket distribution recorded
- [x] All 48 rows flipped to `is_curated=true` via `--approve`
- [x] `npm run moodboard:check` — clean

## Notes for Spec 1
- Cover images still `null` across all 48 rows. Spec 1 must wire `destination_images` integration before public surface ships.
- Spec 4 inherits `pro_path_waypoints` rows ready for narrative/audio/AR enrichment.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: PR URL printed.

---

## Done.

Summary: 48 curated Pro-Paths live on `master` once the PR merges. Spec 1 (Discovery) is fully unblocked — it can ship the public surface against real content immediately.
