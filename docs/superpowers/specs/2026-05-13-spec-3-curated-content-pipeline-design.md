# Spec 3 — Curated Content Pipeline

**Status:** Approved 2026-05-13
**Parent roadmap:** `C:\Users\lasse\.claude\plans\think-of-all-the-prancy-orbit.md`
**Depends on:** Spec 0 (schema + storage bucket — landed 2026-05-13 in PR #2)
**Target project:** VenturePath (`C:\Users\lasse\Desktop\venturepath`)
**Output:** one bundled PR — `feat(pipeline): curated expeditions content (48 routes)`
**Effort:** ~8–12 hours (LLM calls + ~11 hand-traced coord lists + draft review). Distribution: ~1h pipeline plumbing, ~2h GPX sourcing, ~2h coord-list research for manual-trace bucket, ~2h LLM-call iteration, ~1–3h draft review.

---

## Context

Spec 0 landed the foundation (`pro_paths` schema delta, `pro_path_waypoints`, `gpx` storage bucket, RLS, hybrid router). The VentureVault marketplace surface is wired but empty. **Spec 3 fills it with real, legally-shippable content** — 48 curated Pro-Paths spanning all five locked theme categories (movie/historical/thematic/city/geographical), each with a real GPX file, real waypoints, and an LLM-drafted description that the Architect reviews before flipping `is_curated=true`.

Per APPLE_COMPLIANCE VP-4, the marketplace must surface ≥3 substantively different Pro-Paths or it reads as "template/stub" and risks 4.2 rejection. 48 substantive listings comfortably clears that bar.

Per roadmap **D7** (Curated GPX licensing — LOCKED): only legally-free GPX sources ship in v1. The 4 sources requiring premium partnerships (Silk Road via Komoot Partner, Alps Haute Route via Outdooractive, Amazon Rainforest, Gobi Desert Loop) are parked under `pipeline/routes/_deferred/` for a future spec.

Per roadmap **D6** (Theme taxonomy — LOCKED): 5-value enum + `tags text[]` layer. This spec consumes both, never adds new theme values.

---

## Architectural Decisions Resolved During Brainstorm

1. **Batch size:** Full v1 — 48 routes ingested (38 legally-free + 10 manual-trace pre-fallback; 4 deferred remain parked). The free-vs-manual split is provisional and shifts at pipeline run time per the fallback rule (#6): tourism-board URLs that turn out not to expose a `.gpx` get promoted to manual-trace for that run. Realistic final split could be closer to 20 free + 28 manual once info-page URLs are filtered out. The total of 48 ingested holds either way.
2. **GPX file location:** Committed to repo at `pipeline/gpx/<slug>.gpx` (~5 MB total). Reproducible, git-diffable, CI-friendly.
3. **Description authoring:** LLM-drafted via the existing `pipeline/generateExpedition.js`, inserted at `is_curated=false`, flipped to `true` by the Architect after dashboard review. Bulk flip via `npm run seed:curated -- --approve`.
4. **Swiss Alps Haute Route** (existing seed, source in deferred bucket): substituted with **GR5 Chamonix–Nice** (free via OSM Hiking relation). Same alpine character, legal source, similar difficulty.
5. **Manual-trace bucket:** GraphHopper public endpoint (per D4) snaps hand-entered `trace_coords` to a real path, synthesizes a GPX, then resumes the normal flow.
6. **Fallback rule:** If a tourism-board URL turns out not to expose a downloadable `.gpx` (info page only), the route auto-falls back to the manual-trace bucket for that pipeline run. Documented per-route in `provenance.fallback_reason`.

---

## 1. Pipeline Reshape

```
pipeline/
├── seedCurated.js              ← rewritten as orchestrator
├── routes/                     ← NEW: per-route metadata, 41 JSON files (+ 4 deferred stubs)
│   ├── geographical/
│   ├── historical/
│   ├── thematic/
│   ├── city/
│   ├── movie/
│   └── _deferred/              ← 4 stubs with deferred_reason
├── gpx/                        ← NEW: source GPX files, committed (~5 MB)
└── lib/                        ← NEW: extracted helpers
    ├── parseGpx.js             ← distance/elevation/<wpt> extraction
    ├── uploadGpx.js            ← Supabase Storage helper, names as <id>.gpx
    ├── upsertRoute.js          ← idempotent insert by slug + waypoints write
    ├── draftFromGpx.js         ← bundle assembly + generateExpedition wrapper
    └── mapCategory.js          ← GPX <sym> → waypointCategories.js
```

**Idempotence:** `upsertRoute.js` uses `.upsert({ ... }, { onConflict: 'slug' })`. Re-runs update existing rows in-place. Lets us iterate on routes one at a time without DB cleanup.

**Code reuse (no duplication):**
- `src/utils/gpxParser.js` — existing GPX parsing (Spec 0 confirmed it works for `<wpt>` and trkpts).
- `src/utils/elevationService.js` — existing elevation computation.
- `pipeline/generateExpedition.js` — existing LLM prompt and JSON parsing.
- `src/utils/legIntelligence/waypointCategories.js` — existing taxonomy that `mapCategory.js` maps onto.

**Pipeline env vars (no new ones):** `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `GRAPHHOPPER_URL` (defaults to `https://graphhopper.com/api/1/route` — free public endpoint, no key required for low volume).

---

## 2. Per-Route Data File Format

One JSON file per route under `pipeline/routes/<theme>/<slug>.json`. Hand-authored minimum:

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

**Manual-trace variant** — `gpx_file` omitted, `trace_coords` populated instead:

```json
{
  "slug": "amelies-montmartre",
  "name": "Amélie's Montmartre",
  "theme_category": "movie",
  "tags": ["city", "film_locations", "walk"],
  "trace_coords": [
    [48.8867, 2.3431],
    [48.8862, 2.3408],
    [48.8841, 2.3380]
  ],
  "provenance": {
    "source": "manual_trace",
    "source_url": "https://homeselect.paris/en/blog/amelie-poulain-lieu-de-tournage/",
    "license": "manual_research",
    "downloaded_at": "2026-05-13"
  }
}
```

**Pipeline-derived fields, NOT hand-authored:**

| Field | Source |
|---|---|
| `description` | LLM (`draftFromGpx.js`) |
| `legs` | LLM |
| `days` | LLM with Naismith-like heuristic in the prompt |
| `distance_km` | `parseGpx.js` (deterministic) |
| `manifest_settings` | `{ climate, days, hasChildren: false }` (deterministic) |
| `gpx_storage_path` | `uploadGpx.js` returns this |
| `cover_image_url` | `null` initially (Spec 1 wires images via `destination_images`) |
| `objectives` | `[]` |
| `narrative_blocks` | `[]` (Spec 4 owns) |
| `safety_meta` | `{}` (Spec 5 owns) |
| `is_curated` | `false` on insert, flipped manually post-review |
| `is_community` | `false` |
| `source` | `'pipeline'` |
| `llm_quality_score` | `scoreQuality.js` output (existing) |

**Deferred route stub** (`pipeline/routes/_deferred/silk-road.json`):

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

Linked from `pipeline/issues/premium_partnerships.md` so the parking lot is discoverable.

---

## 3. The 41-Route Inventory

| Theme | ✅ Free-licensed (committed `.gpx`) | ⚠️ Manual-trace (committed `trace_coords`) | ❌ Deferred (`_deferred/` stub) |
|---|---|---|---|
| **movie** (10) | `lord-of-the-rings-nz`, `game-of-thrones-ni`, `harry-potter-jacobite`, `breaking-bad-abq`, `star-wars-tunisia`, `sound-of-music-salzburg`, `skyfall-glencoe`, `indiana-jones-petra` *(8)* | `amelies-montmartre`, `roman-holiday` *(2)* | — |
| **historical** (10) | `camino-de-santiago`, `lewis-and-clark`, `roman-limes`, `napoleons-route`, `oregon-trail`, `magna-carta-way`, `route-66`, `incan-trail`, `via-francigena` *(9)* | — | `silk-road` *(Komoot)* |
| **thematic** (10) | `romantic-road`, `wild-atlantic-way`, `garden-route-sa`, `whisky-trail`, `german-fairy-tale-route`, `iceland-ring-road` *(backfill)*, `tulip-route`, `grand-tour-switzerland`, `cabot-trail` *(9)* | `bourbon-trail` *(1)* | — |
| **city** (10) | `yamanote-loop`, `high-line-chelsea`, `sf-49-mile-drive` *(3 — all from Overpass relations)* | `bauhaus-berlin`, `jack-the-ripper`, `street-art-melbourne`, `gaudi-trail`, `prague-royal-way`, `venice-canals`, `istanbul-seven-hills` *(7)* | — |
| **geographical** (10) | `sahara-traverse` *(Wikiloc CC)*, `patagonia-w-trek` *(backfill)*, `everest-base-camp`, `great-ocean-road`, `milford-track`, `drakensberg-traverse`, `dolomites-alta-via-1`, `gr5-chamonix-nice` *(backfill, substitutes Swiss Alps Haute)* *(8)* | — | `alps-haute-route` *(Outdooractive)*, `amazon-rainforest`, `gobi-desert-loop` |
| **+ unmapped** | `mt-fuji-sunrise` *(backfill — not in md list)* | — | — |
| **Totals (pre-fallback)** | **38** *(incl. 4 backfills: Iceland Ring, Patagonia W, GR5, Mt. Fuji)* | **10** | **4** |

Grand total ingested in this PR: **48 routes** (38 ✅ + 10 ⚠️ pre-fallback).
Grand total parked: **4 deferred stubs**.

**Fallback caveat:** Many "free-licensed" cells point at tourism-board info pages, not raw `.gpx` downloads. The pre-fallback split assumes a `.gpx` is available; the post-fallback split likely promotes ~10–15 of the "free" routes to manual-trace. The 48 total is firm — only the bucket assignment shifts. Final per-row source is recorded in `provenance.source ∈ {tourism_board_cc, nps, osm_overpass, wikiloc_cc, manual_trace}` and summable post-run via `select provenance->>'source', count(*) from pro_paths where source='pipeline' group by 1`.

---

## 4. LLM Enrichment + Review Gate

### Bundle assembly (`pipeline/lib/draftFromGpx.js`)

```js
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
  waypoint_names: gpxStats.waypoints.slice(0, 8).map(w => w.name).filter(Boolean),
};
const draft = await generateExpedition(bundle);  // existing module, prompt unchanged
```

The bundle now carries real GPX-derived facts so the LLM doesn't hallucinate distances or legs. `generateExpedition.js` returns `{ description, legs, days }`.

### Row assembly

```js
const proPath = {
  slug:             routeJson.slug,
  name:             routeJson.name,
  destination:      routeJson.destination,
  architect_name:   routeJson.architect_name,
  architect_id:     null,                          // pipeline rows are system-owned
  theme_category:   routeJson.theme_category,
  tags:             routeJson.tags,
  climate:          routeJson.climate,
  difficulty:       routeJson.difficulty,
  squad_min:        routeJson.squad_min,
  squad_max:        routeJson.squad_max,
  distance_km:      gpxStats.distanceKm,
  days:             draft.days,
  description:      draft.description,
  legs:             draft.legs,
  manifest_settings:{ climate: routeJson.climate, days: draft.days, hasChildren: false },
  objectives:       [],
  narrative_blocks: [],
  safety_meta:      {},
  provenance:       routeJson.provenance,
  cover_image_url:  null,
  is_curated:       false,
  is_community:     false,
  source:           'pipeline',
  llm_quality_score:scoreQuality(draft),           // existing module
};
```

### Review gate

- Inserts at `is_curated=false`. Spec 1's public-read RLS only shows `is_curated=true`, so drafts are invisible to the public surface until approved.
- Architect reviews in the Supabase Table editor (`pro_paths` table, filter `is_curated=false`).
- Per-row approval: edit description if needed, set `is_curated=true`.
- Bulk-approve subcommand: `npm run seed:curated -- --approve` flips ALL rows where `source='pipeline' AND is_curated=false` to true. Reserved for the happy-path final pass.

### Manual-trace flow

For the 11 manual-trace routes, before the LLM step:

```js
if (routeJson.trace_coords && !routeJson.gpx_file) {
  const snapped = await graphhopperSnap(routeJson.trace_coords);
  const synthesizedGpx = buildGpx(snapped, routeJson.slug);
  const gpxPath = path.join('pipeline/gpx', `${routeJson.slug}.gpx`);
  fs.writeFileSync(gpxPath, synthesizedGpx);
  // synthesized GPX is committed in the same PR
}
```

GraphHopper free public endpoint, no API key required for one-time batch (~11 routes × ~5s each = under 1 minute total).

---

## 5. Waypoint Hydration

`parseGpx.js` extracts **only `<wpt>` tags** (named waypoints) into `pro_path_waypoints` rows. `<trkpt>` (the dense track points) stay in the GPX file and become the displayed line at runtime — they do not populate the waypoints table.

```js
// one pro_path_waypoints row per <wpt>
{
  path_id:           proPathId,
  ord:               index,
  lat:               parseFloat(wpt.lat),
  lon:               parseFloat(wpt.lon),
  elevation_m:       wpt.ele ? parseFloat(wpt.ele) : null,
  name:              wpt.name || null,
  category:          mapCategory(wpt.sym || wpt.type),
  trigger_radius_m:  20,
  // narrative_text/audio_url/media_url/ar_payload all empty — Spec 4 fills
}
```

`mapCategory(symValue)` (in `pipeline/lib/mapCategory.js`) maps GPX `<sym>` strings to the existing `src/utils/legIntelligence/waypointCategories.js` taxonomy. Unknown `<sym>` values map to `null` (no category). This keeps the table consistent with what Spec 5 (Route Intelligence Overlay) expects when it later joins waypoints to safety/POI overlays.

---

## 6. Tests

Four new unit tests, all TDD-able with deterministic inputs:

1. `pipeline/__tests__/parseGpx.test.js` — fixture `pipeline/__tests__/fixtures/sample.gpx` (small, committed). Assert distance/elevation/waypoint count match expected values.
2. `pipeline/__tests__/draftFromGpx.test.js` — mock LLM call with a known response. Assert bundle shape and merged-row shape.
3. `pipeline/__tests__/upsertRoute.test.js` — mock the Supabase client. Assert: (a) upsert with `onConflict: 'slug'` on first run inserts and writes waypoints atomically; (b) re-run with same slug updates the row and replaces waypoints; (c) errors propagate.
4. `pipeline/__tests__/mapCategory.test.js` — table-driven. Maps `Trailhead`, `Summit`, `Water`, `Shelter`, `Viewpoint`, `Town`, `City`, `Camp`, etc. to the corresponding `waypointCategories` value or `null` for unknowns.

One **end-to-end smoke**, opt-in (skipped in CI by default):
`npm run seed:curated -- --route=patagonia-w-trek --smoke`
Runs the full pipeline against the real Supabase project for one route, asserts the row lands, GPX uploads, and waypoints insert. Tagged `smoke` in vitest config and excluded from `npm run test` by default.

---

## 7. Verification (before merge)

- [ ] `npm run test -- --run` — all 4 new unit tests pass; baseline failures unchanged.
- [ ] `npm run seed:curated -- --route=camino-de-santiago` — single-route run inserts a `is_curated=false` row, uploads GPX, hydrates waypoints. Inspect the row in dashboard.
- [ ] `npm run seed:curated` (no args) — runs all 48 routes. Estimated runtime: ~12 min (LLM calls dominate, ~10s each × 48; plus ~5s GraphHopper per manual-trace route). Each route logs ✓ or ✗ with reason.
- [ ] Dashboard sanity sweep: `select count(*) from pro_paths where source='pipeline'` returns **48**. `select count(*) from pro_path_waypoints` returns >0 (depends on how many `<wpt>` each GPX carries — expect ~100–500 total across the batch).
- [ ] Storage bucket sanity: `select count(*) from storage.objects where bucket_id='gpx'` returns **48**.
- [ ] Source-bucket sanity: `select provenance->>'source', count(*) from pro_paths where source='pipeline' group by 1` — record the post-fallback distribution.
- [ ] Spot-review 5 drafted descriptions in dashboard. Edit if any are wrong.
- [ ] `npm run seed:curated -- --approve` flips all 48 to `is_curated=true`.
- [ ] Re-run `npm run seed:curated` — upsert idempotence holds, no duplicates created, no waypoints duplicated.
- [ ] `npm run moodboard:check` — clean (Spec 3 touches no design tokens).
- [ ] CHANGELOG entry appended.
- [ ] `docs/moodboard.log.md` — append entry under `### Ideas / next steps` noting the 41 routes are live and Spec 1 (Discovery) can ship.
- [ ] HolyFlex `logs/2026-05-13.md` (or current date) — task entry per CLAUDE.md.

---

## 8. Critical Files

**New:**
- `pipeline/seedCurated.js` — rewritten orchestrator (replaces existing hardcoded version)
- `pipeline/lib/parseGpx.js`
- `pipeline/lib/uploadGpx.js`
- `pipeline/lib/upsertRoute.js`
- `pipeline/lib/draftFromGpx.js`
- `pipeline/lib/mapCategory.js`
- `pipeline/routes/<theme>/*.json` (48 files)
- `pipeline/routes/_deferred/*.json` (4 stubs)
- `pipeline/gpx/<slug>.gpx` (48 files, ~5–7 MB total — manual-trace synthesized GPX is small, sourced GPX vary 50KB–500KB)
- `pipeline/__tests__/parseGpx.test.js`
- `pipeline/__tests__/draftFromGpx.test.js`
- `pipeline/__tests__/upsertRoute.test.js`
- `pipeline/__tests__/mapCategory.test.js`
- `pipeline/__tests__/fixtures/sample.gpx`
- `pipeline/issues/premium_partnerships.md` — tracks the 4 deferred routes

**Modified:**
- `package.json` — add `seed:curated` script invocation flags (`--route=<slug>`, `--approve`, `--smoke`)
- `CHANGELOG.md`
- `docs/moodboard.log.md`

**Reused (no changes):**
- `src/utils/gpxParser.js`
- `src/utils/elevationService.js`
- `pipeline/generateExpedition.js`
- `pipeline/scoreQuality.js`
- `pipeline/upsertPath.js` (kept for the `run.js` city-pipeline; not used by new orchestrator)

---

## 9. Cross-app connectivity (per CLAUDE.md mandate)

- Does this write data another tool should react to? **Yes.** Each new Pro-Path with `theme_category` and `destination` is a potential What's Cooking cuisine seed. Spec 3 does NOT emit the event yet — but adds a TODO comment in `upsertRoute.js`: `// TODO Spec 3 follow-up: emit pro_path.created event to WC cuisine-by-destination subscriber`. The cross-app emitter pattern exists at `src/utils/crossAppEmitter.js` (per recent commit `6137d5b`); a future PR wires it.
- Does this read data another tool produces? **No.**
- Does this affect shared state? **No.**
- Cross-app event hook? **Deferred** as above.

---

## 10. Out of Scope (Spec 3 does NOT do)

- Narrative blocks, audio narration, AR payloads (Spec 4 — operates on the waypoint rows Spec 3 inserts)
- Weather-along-route, NASA FIRMS, Naismith ETA (Spec 5)
- Mapbox snap-to-road (deferred per D4 — GraphHopper public is fine for seed)
- Cover image scraping for the 41 routes (`cover_image_url` stays `null`; Spec 1 wires images via `destination_images`)
- Public Discovery UI (Spec 1)
- The 4 deferred routes (parked in `_deferred/` stubs only)
- Architect dashboard for review (use Supabase Table editor for v1)
- The cross-app WC emitter (Spec 3 leaves a TODO, follow-up PR wires it)

---

## 11. Open Questions (none blocking)

- **Cover images:** Spec 3 inserts `cover_image_url=null`. Spec 1 (Discovery) must populate these before the public surface ships, either by reusing `gatherDestination.js` against each route's destination, or by hand-curating Unsplash links per route. Resolved at Spec 1 brainstorm.
- **Whose architect_name?** All 41 use `"VenturePath Curator"` per the existing seed convention. If a future Architect persona is needed (per `social/ArchitectProfile`), backfill in a separate PR.
- **GraphHopper rate limiting:** If the public endpoint rejects ~11 calls in a row, pipeline sleeps 2s between calls. If still 429s, falls back to OSRM public (`https://router.project-osrm.org`). Both endpoints documented in `lib/uploadGpx.js` and `lib/draftFromGpx.js` comments.
