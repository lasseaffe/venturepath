# Task 15 — GPX Acquisition (Standalone Instructions for Parallel Session)

You are running in a **separate Claude session** to acquire 38 GPX files for the Curated Expeditions content pipeline (Spec 3, Task 15). Your job is to download or trace 38 `.gpx` files from external sources and commit them to a sibling branch. Another session is concurrently working on `feat/curated-content-pipeline` doing pipeline plumbing (Tasks 1–8); you must NOT touch that branch.

---

## Hard Constraints (Read This First)

- **Branch:** Work on a NEW branch `task-15-gpx-acquisition`. Do NOT commit to `feat/curated-content-pipeline`.
- **Scope:** You may ONLY create files under `pipeline/gpx/` and edit `pipeline/issues/premium_partnerships.md`. Do NOT touch `pipeline/lib/`, `pipeline/seedCurated.js`, `pipeline/routes/`, `pipeline/__tests__/`, `src/`, or `package.json`. Those are owned by the other session.
- **Parallel-session safety:** If you discover the working tree has been changed by another agent mid-task, STOP. Do not push, do not merge, ask the user.
- **Apple compliance:** licensing matters. If a route's GPX is not legally redistributable (paywalled API, scrape-prohibited ToS), apply the fallback rule (below) — do not commit a tainted file.

---

## Setup

```bash
cd C:/Users/lasse/Desktop/venturepath
git fetch origin
git checkout feat/curated-content-pipeline
git pull origin feat/curated-content-pipeline 2>/dev/null || true
git checkout -b task-15-gpx-acquisition
mkdir -p pipeline/gpx
```

Confirm the parent branch tip exists locally: `git log --oneline -3` should show a recent `docs(spec-3): ...` commit.

---

## The 38 Files To Acquire

For each route below, save a parsed `.gpx` to `pipeline/gpx/<slug>.gpx`. The source URL is your starting point. Apply the right strategy per source type (next section).

### Geographical (9)

| Slug | Source URL | Source Type |
|---|---|---|
| `patagonia-w-trek` | https://parquetorresdelpaine.cl/en/circuitos-de-trekking/ | tourism_board_cc |
| `gr5-chamonix-nice` | https://www.openstreetmap.org/relation/12660861 | osm_overpass |
| `mt-fuji-sunrise` | https://www.openstreetmap.org/relation/4017823 | osm_overpass |
| `sahara-traverse` | https://www.wikiloc.com/offroading-trails/merzouga-dunes-traverse-432109 | wikiloc_cc |
| `everest-base-camp` | https://www.ntb.gov.np/everest-base-camp | tourism_board_cc |
| `great-ocean-road` | https://www.openstreetmap.org/relation/2069089 | osm_overpass |
| `milford-track` | https://www.doc.govt.nz/milfordtrack | tourism_board_cc |
| `drakensberg-traverse` | https://hiking-trails.com/trail/drakensberg-grand-traverse/ | tourism_board_cc |
| `dolomites-alta-via-1` | https://www.alpenventuresunguided.com/av1planning/ | tourism_board_cc |

### Movie (8 — manual-trace routes Amelie + Roman Holiday do NOT need GPX, those get synthesized by the pipeline)

| Slug | Source URL | Source Type |
|---|---|---|
| `lord-of-the-rings-nz` | https://www.doc.govt.nz/parks-and-recreation/places-to-go/lord-of-the-rings-locations/ | tourism_board_cc |
| `game-of-thrones-ni` | https://discovernorthernireland.com/things-to-do/itineraries/game-of-thrones-itineraries | tourism_board_cc |
| `harry-potter-jacobite` | https://www.openstreetmap.org/relation/4045906 | osm_overpass |
| `breaking-bad-abq` | https://www.visitalbuquerque.org/abq365/blog/post/breaking-bad-tour-of-albuquerque/ | tourism_board_cc |
| `star-wars-tunisia` | https://www.starwars.com/news/visiting-the-star-wars-sets-in-tunisia | manual_research |
| `sound-of-music-salzburg` | https://www.salzburg.info/en/salzburg/the-sound-of-music/filming-locations | tourism_board_cc |
| `skyfall-glencoe` | https://www.visitscotland.com/things-to-do/landscapes-nature/mountains-hills/glen-coe | tourism_board_cc |
| `indiana-jones-petra` | https://www.visitjordan.com/Wonders-Of-Jordan/Petra | tourism_board_cc |

### Historical (9)

| Slug | Source URL | Source Type |
|---|---|---|
| `camino-de-santiago` | https://www.britishpilgrimage.org/download-gpx | tourism_board_cc (real GPX download) |
| `lewis-and-clark` | https://www.nps.gov/lecl/planyourvisit/maps.htm | nps |
| `roman-limes` | https://www.limesstrasse.de/en/german-limes-road/home | tourism_board_cc |
| `napoleons-route` | https://www.gr-infos.com/en/gr406.htm | tourism_board_cc |
| `oregon-trail` | https://www.nps.gov/oreg/index.htm | nps |
| `magna-carta-way` | https://www.ramblers.org.uk/go-walking/group-walks/magna-carta-walk-17-miles | tourism_board_cc |
| `route-66` | https://www.openstreetmap.org/relation/3962108 | osm_overpass |
| `incan-trail` | https://www.peru.travel/en/experiences/machu-picchu | tourism_board_cc |
| `via-francigena` | https://www.viefrancigene.org/en/download-gps-tracks/ | tourism_board_cc (real GPX download) |

### Thematic (9 — bourbon-trail is manual-trace, no GPX needed here)

| Slug | Source URL | Source Type |
|---|---|---|
| `romantic-road` | https://romantischestrasse.de/en/outdoor/cycling-gps-tracks/ | tourism_board_cc (real GPX) |
| `wild-atlantic-way` | https://www.thewildatlanticway.com/route/ | tourism_board_cc |
| `garden-route-sa` | https://www.southafrica.net/gl/en/travel/article/the-garden-route | tourism_board_cc |
| `whisky-trail` | https://maltwhiskytrail.com/map/ | tourism_board_cc |
| `german-fairy-tale-route` | https://www.deutsche-maerchenstrasse.com/en/ | tourism_board_cc |
| `iceland-ring-road` | https://www.openstreetmap.org/relation/162777 | osm_overpass |
| `tulip-route` | https://www.visitflevoland.nl/en/tulip-route | tourism_board_cc |
| `grand-tour-switzerland` | https://www.myswitzerland.com/en/experiences/experience-tour/grand-tour-of-switzerland/ | tourism_board_cc |
| `cabot-trail` | https://www.openstreetmap.org/relation/146487 | osm_overpass |

### City (3 — the other 7 are manual-trace, no GPX needed)

| Slug | Source URL | Source Type |
|---|---|---|
| `yamanote-loop` | https://www.openstreetmap.org/relation/2143229 | osm_overpass |
| `high-line-chelsea` | https://www.openstreetmap.org/way/40097478 | osm_overpass |
| `sf-49-mile-drive` | https://www.sftravel.com/article/san-franciscos-49-mile-scenic-drive | tourism_board_cc (likely fallback to manual-trace) |

**Total: 9 + 8 + 9 + 9 + 3 = 38 routes.**

---

## Strategy Per Source Type

### A. `osm_overpass` (10 routes)

OSM relations export to GPX directly. Easiest path:

1. Visit `https://www.openstreetmap.org/relation/<id>` for the relation ID in the URL.
2. Right column → "GPX file" (under "Export" or as a download icon).
3. Save as `pipeline/gpx/<slug>.gpx`.

If the relation page doesn't expose GPX export (some don't for huge relations), use the Overpass API directly:

```bash
# Replace 3962108 with the relation ID
RELATION_ID=3962108
curl -s -X POST "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:xml][timeout:90];relation('"$RELATION_ID"');out geom;' \
  -o /tmp/relation.osm

# Convert OSM XML to GPX
# Option 1: osmtogpx (if installed): osmtogpx /tmp/relation.osm > pipeline/gpx/<slug>.gpx
# Option 2: web converter — https://www.gpsvisualizer.com/convert_input → upload .osm → output GPX
```

### B. `tourism_board_cc` (24 routes — the most variable)

Visit the source URL. Look for "Download GPX", "GPS tracks", "Itinerary download". Strategies, in order:

1. **Direct GPX link** → save the file. Done.
2. **Bundled KML/KMZ** → download, convert with GPSVisualizer or `gpsbabel -i kml -f x.kml -o gpx -F x.gpx`.
3. **Interactive map with waypoints visible** → use the page's waypoint list, manually copy 5–15 [lat, lon] pairs into the matching route JSON's `trace_coords` field (see fallback rule below). This converts the route to manual-trace.
4. **No usable content** → fallback (below).

**Routes where I'm confident a real GPX exists** (start here, fastest wins):
- `camino-de-santiago` — `britishpilgrimage.org/download-gpx` is literally a download page
- `via-francigena` — `viefrancigene.org/en/download-gps-tracks/` same
- `romantic-road` — `romantischestrasse.de/en/outdoor/cycling-gps-tracks/` same

### C. `nps` (2 routes)

National Park Service publishes some trails as GPX, others as KML, others as ArcGIS feature layers. Visit the maps page, look for downloadable formats. Public domain — no licensing concerns.

### D. `wikiloc_cc` (1 route — `sahara-traverse`)

Wikiloc requires a free account login. After login, the route page has a "Download" button → GPX option. Save the file. License is CC BY-SA on user-uploaded routes (verify before commit by checking the route page's license badge).

### E. `manual_research` (1 route — `star-wars-tunisia`)

starwars.com lists filming locations but no GPX. Two options:
1. Copy this slug from your task — it stays a regular route with a `gpx_file`. You'll need to **manually trace** by extracting filming-location coords from the article (Tozeur, Matmata, Onk Jemel, Chott el Djerid) and use a GPX builder tool (gpx.studio) to draw a driving path between them.
2. Apply the fallback rule and convert it to `trace_coords` in the route JSON.

Easier: **fallback rule** (next section). Mark this one for fallback.

---

## Fallback Rule (When a URL Doesn't Yield GPX)

If a route's source URL is an info page only (no GPX, no usable KML), promote it to manual-trace:

1. Find 5–15 landmark coordinates from the page (or Google Maps if the page just describes them).
2. Open the matching route JSON at `pipeline/routes/<theme>/<slug>.json`.
3. Edit:
   - **Remove** the `"gpx_file": "..."` field
   - **Add** a `"trace_coords": [[lat,lon], [lat,lon], ...]` field
   - **Update** `provenance.source` from whatever it was to `"manual_trace"`
   - **Update** `provenance.license` to `"manual_research"`
4. Do NOT create a `.gpx` file for this slug — the pipeline will synthesize one at run time via GraphHopper.

**Note:** editing `pipeline/routes/<theme>/<slug>.json` is technically out of your scope, but the fallback rule is documented as an authorized exception. If you make this edit, mention it in your commit message.

---

## Verification Per File

After saving each GPX, sanity-check it. Quick eyeball:

```bash
head -20 pipeline/gpx/<slug>.gpx
```

Should look like:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" ...>
  <metadata>...</metadata>
  <trk> or <wpt>...
```

If it's HTML or JSON instead, the download failed.

After acquiring all files, run:

```bash
ls pipeline/gpx | wc -l   # should print 38 (or less if you applied fallback to some)
```

---

## Commit Convention

After each batch (per theme is a reasonable rhythm), commit:

```bash
git add pipeline/gpx
git commit -m "feat(pipeline): GPX files for <theme> routes"
```

If you also edited `pipeline/routes/<theme>/<slug>.json` for a fallback:

```bash
git add pipeline/routes pipeline/gpx
git commit -m "feat(pipeline): <slug> GPX + apply fallback rule (info page only)"
```

At the end:

```bash
git push -u origin task-15-gpx-acquisition
```

---

## Handoff

When all 38 files are committed (or you've documented fallbacks for any URLs that didn't yield), reply to the user with:
- Total `.gpx` files committed
- Total slugs that fell back to manual-trace
- Any slugs you couldn't resolve (will need manual intervention)
- The branch name (`task-15-gpx-acquisition`) so the other session can cherry-pick

If you get blocked, STOP. Don't push partial work without telling the user. The other session will need to know if anything's missing before running the pipeline.

---

## Premium Partnership Updates

If during this work you discover a tourism-board URL has moved or a license has changed, append a note to `pipeline/issues/premium_partnerships.md` so we have a paper trail.
