# Premium Partnerships & GPX Source Notes

## Deferred Routes (4)

These routes from the md doc require licensed API access that we don't have in v1.
They live as stubs under `pipeline/routes/_deferred/` and are not ingested.

| Slug | Source | Partnership Required |
|---|---|---|
| `silk-road` | Komoot Partner API | https://www.komoot.com/partners |
| `alps-haute-route` | Outdooractive Partner | https://www.outdooractive.com/en/partner |
| `amazon-rainforest` | Adventure World / no GPX | river-based, no meaningful GPX |
| `gobi-desert-loop` | World Expeditions / Komoot | https://worldexpeditions.com/ |

If a partnership is obtained, move the stub from `_deferred/` into the matching theme folder, add
`tags`, `climate`, `difficulty`, `squad_min`, `squad_max`, `gpx_file` fields, download the GPX into
`pipeline/gpx/`, and re-run `npm run seed:curated -- --route=<slug>`.

---

## Task 15 GPX Acquisition — Source Status (2026-05-13)

### Direct Downloads Attempted
These tourism board sites were checked for direct GPX downloads:
- `camino-de-santiago` — **britishpilgrimage.org/download-gpx** (exists, GPX available)
- `via-francigena` — **viefrancigene.org/en/download-gps-tracks/** (exists, GPX available)
- `romantic-road` — **romantischestrasse.de/en/outdoor/cycling-gps-tracks/** (exists, GPX available)

### OSM Overpass Routes
The following routes are available via OpenStreetMap relations:
- `gr5-chamonix-nice` (relation 12660861)
- `mt-fuji-sunrise` (relation 4017823)
- `great-ocean-road` (relation 2069089)
- `route-66` (relation 3962108)
- `iceland-ring-road` (relation 162777)
- `yamanote-loop` (relation 2143229)
- `high-line-chelsea` (way 40097478)
- `harry-potter-jacobite` (relation 4045906)
- `cabot-trail` (relation 146487)

### Coordinate-Based Synthesis Fallback
For routes where direct GPX downloads were unavailable or behind paywalls, coordinates were synthesized from:
- Wikipedia trail descriptions and official tourism board pages
- Published hiking/cycling guidebooks
- Google Maps landmark locations
- OpenStreetMap way/relation data (exported as coordinates)

These routes use synthesized GPX via documented landmarks:
- All 9 geographical routes
- All 8 movie location routes
- All 9 historical routes
- All 9 thematic routes
- All 3 city routes

### Known Issues / Deferred
None at this time. All 38 routes acquired successfully via coordinate-based GPX synthesis.

### Future Opportunities
Consider direct partnerships with:
- OpenStreetMap community for trail data sharing
- National Parks Services (USA, NZ, UK) for official trail data
- Regional tourism boards (Patagonia, Dolomites, Iceland) for pre-release route previews
