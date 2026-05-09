# VenturePath — Destination Pipeline Design
**Date:** 2026-05-10  
**Status:** Awaiting approval

---

## Context

The Inspire Me panel in VenturePath shows city intel (POIs, descriptions, images) for any trip destination. Currently only 24 curated cities are in the database. When a user's trip destination isn't in the list, the panel shows a "not in database" state.

This spec designs a full pipeline to:
1. Collect destination names into a queue
2. Auto-fetch + save them via OpenTripMap + Wikipedia
3. Auto-detect quality issues in existing entries
4. Let users report problems via an in-app button
5. Run a local LLM (Ollama/llama.cpp) to fix collected issues
6. Drive everything from `.bat` files on the desktop

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   COLLECTION LAYER                  │
│  destinations.txt  ←  user adds city names          │
│  issues/queue.json ←  report button + auto-detect   │
└────────────────┬────────────────┬───────────────────┘
                 │                │
                 ▼                ▼
┌───────────────────┐  ┌──────────────────────────────┐
│  FETCH PIPELINE   │  │       FIX PIPELINE           │
│  fetch-cities.mjs │  │  fix-issues.mjs + Ollama LLM │
│  (OTM + Wikipedia)│  │  reads queue.json            │
│  → inspire_all    │  │  → patches inspire_all.json  │
└───────────────────┘  └──────────────────────────────┘
         ▲                          ▲
         │                          │
┌────────┴──────┐         ┌─────────┴──────┐
│  FETCH.bat    │         │   FIX.bat      │
│  (desktop)    │         │   (desktop)    │
└───────────────┘         └────────────────┘
```

---

## 1. File Structure

```
venturepath/
├── pipeline/
│   ├── destinations.txt        # one "City, Country" per line — feed for fetch pipeline
│   ├── issues/
│   │   ├── queue.json          # all reported + auto-detected issues
│   │   └── archive.json        # resolved issues (moved here after fix)
│   └── logs/
│       └── YYYY-MM-DD.log      # pipeline run logs
├── scripts/
│   ├── generate-city.mjs       # existing — single city fetch (OTM + Wikipedia)
│   ├── fetch-cities.mjs        # NEW — batch runner: reads destinations.txt, calls generate-city per line
│   └── fix-issues.mjs          # NEW — reads queue.json, calls Ollama, patches inspire_all.json
└── public/data/
    └── inspire_all.json        # the live city database
```

---

## 2. destinations.txt Format

Plain text, one city per line. Lines starting with `#` are comments. Already-fetched cities are NOT removed — the fetch pipeline skips them unless `--force` flag is used.

```
# Europe
Hamburg, Germany
Berlin, Germany
Amsterdam, Netherlands

# Asia
Tokyo, Japan
Bangkok, Thailand
```

---

## 3. Fetch Pipeline (`fetch-cities.mjs`)

Wraps the existing `generate-city.mjs` in a batch loop.

**Flow:**
1. Read `pipeline/destinations.txt`
2. Load `inspire_all.json` — build set of existing city IDs
3. For each destination line:
   - Skip if already in database (unless `--force`)
   - Call `generate-city.mjs` logic inline (no subprocess — shared module)
   - After each city: run **auto-quality-check** (see §5)
   - Append any detected issues to `pipeline/issues/queue.json`
4. Write updated `inspire_all.json`
5. Print summary: N added, N skipped, N issues detected

**Flags:**
- `--force` — re-fetch cities already in database
- `--dry-run` — print what would happen, don't write
- `--limit N` — only process first N destinations (rate limit safety)

---

## 4. Issues Queue (`pipeline/issues/queue.json`)

Every issue — whether auto-detected or user-reported — lands here.

```json
[
  {
    "id": "uuid-v4",
    "cityId": "hamburg",
    "cityName": "Hamburg",
    "country": "Germany",
    "type": "wrong_language" | "missing_image" | "bad_poi" | "wrong_location" | "missing_pois" | "wrong_city" | "other",
    "poiId": "landmark-bischofsturm",   // null if city-level issue
    "detail": "Description is in German, should be English",
    "source": "user_report" | "auto_detect",
    "status": "pending" | "in_progress" | "resolved" | "skipped",
    "reportedAt": "2026-05-10T10:00:00Z",
    "resolvedAt": null,
    "llmFix": null                       // populated after LLM run: { attempt, result, appliedAt }
  }
]
```

---

## 5. Auto-Detection Rules

Run after every city is fetched. Flags issues automatically:

| Rule | Type | Condition |
|------|------|-----------|
| No image | `missing_image` | `image_url` is empty string |
| Non-English POI description | `wrong_language` | description contains >30% non-ASCII chars |
| Too few POIs | `missing_pois` | `pois.length < 4` |
| Generic description | `bad_poi` | description matches `"A notable X in the city."` exactly |
| Empty POI name | `bad_poi` | `poi.name` is empty or whitespace |
| Wrong coordinates (geocode mismatch) | `wrong_location` | OTM geocode country ≠ country arg |

---

## 6. Report Button (In-App)

A `⚠️` button appears on each city card in the Inspire Me panel — both on the city header and on individual POI cards.

**Placement:**
- City-level: top-right of the hero image in InspirePanel
- POI-level: appears on hover on each POI row

**Report modal fields:**
- Issue type (pill selector):
  - 🗺️ Wrong city / wrong location
  - 📍 Bad POI — wrong, doesn't exist, not relevant  
  - 🌐 Description in wrong language
  - 🖼️ Missing or wrong city image
  - ➕ Missing important attractions
  - 💬 Other
- Optional detail textarea
- Submit button → writes to `pipeline/issues/queue.json` via `POST /api/report-issue`

**Local API receiver (`scripts/issue-receiver.mjs`):**  
A minimal Express server (port 3099) that runs alongside Vite. Receives POST requests from the report button and appends to `queue.json`. Started by the desktop `.bat`.

```
POST http://localhost:3099/report
Body: { cityId, cityName, country, type, poiId?, detail? }
Response: { ok: true, id: "uuid" }
```

---

## 7. Fix Pipeline (`fix-issues.mjs`)

Reads all `pending` issues from `queue.json`, fixes them using Ollama (llama3.1:8b), patches `inspire_all.json`.

**Flow per issue:**

### `wrong_language` / `bad_poi` / `missing_pois`
1. Load the city from `inspire_all.json`
2. Re-fetch POI detail from OTM (XID lookup) for context
3. Send to Ollama:
   ```
   You are a travel guide editor. Fix the following POI description.
   Requirements: English only, 1-2 sentences, factual, no generic phrases.
   City: {cityName}, {country}
   POI name: {poiName}
   Current description: {description}
   Wikipedia context: {wikiExtract}
   Return only the fixed description, nothing else.
   ```
4. Validate response (non-empty, English, <250 chars)
5. Patch `inspire_all.json` in place

### `missing_image`
1. Re-run Wikipedia image fetch for the city
2. If still no image, query Wikimedia Commons API for city name
3. Use first result with a valid JPEG/PNG URL

### `wrong_location` / `wrong_city`
1. Re-run geocode with stricter country code enforcement
2. Re-fetch all POIs with corrected coordinates
3. Replace city entry entirely

### `missing_pois`
1. Re-run OTM fetch with wider radius (12km) and lower rate filter (2)
2. Merge new POIs with existing (deduplicate by id)

**After each fix:**
- Update `queue.json` entry: `status: "resolved"`, `resolvedAt`, `llmFix: { attempt, appliedAt }`
- Move resolved entries to `pipeline/issues/archive.json`

**Ollama config:**
- Endpoint: `http://localhost:11434/api/chat` (Ollama native) with fallback to `http://localhost:8080/v1/chat/completions` (llama.cpp)
- Model: `llama3.1:8b`
- Temperature: 0.3 (low — we want factual, consistent output)
- Max tokens: 300

---

## 8. Desktop `.bat` Files

### `VENTUREPATH - Fetch Cities.bat` (desktop)
```bat
@echo off
cd /d C:\Users\lasse\Desktop\venturepath
echo === VenturePath City Fetcher ===
node scripts/fetch-cities.mjs
pause
```

### `VENTUREPATH - Fix Issues.bat` (desktop)
```bat
@echo off
cd /d C:\Users\lasse\Desktop\venturepath
echo === VenturePath Issue Fixer (requires Ollama) ===
echo Starting issue receiver...
start /B node scripts/issue-receiver.mjs
node scripts/fix-issues.mjs
pause
```

### `START - VenturePath (3001).bat` (existing — update to also start receiver)
```bat
@echo off
cd /d C:\Users\lasse\Desktop\venturepath
start /B node scripts/issue-receiver.mjs
npm run dev
```

---

## 9. Data Flow Summary

```
User adds cities to destinations.txt
         ↓
Run "VENTUREPATH - Fetch Cities.bat"
         ↓
fetch-cities.mjs → generate-city.mjs (OTM + Wikipedia)
         ↓                    ↓
inspire_all.json        auto-detect issues
                               ↓
                        queue.json (auto entries)

User sees bad POI in app → clicks ⚠️
         ↓
Report modal → POST localhost:3099/report
         ↓
issue-receiver.mjs → queue.json (user entries)

Run "VENTUREPATH - Fix Issues.bat"
         ↓
fix-issues.mjs → Ollama llama3.1:8b
         ↓
inspire_all.json patched
         ↓
queue.json → archive.json (resolved)
```

---

## 10. Out of Scope (This Spec)

- Cloud sync of `inspire_all.json` (currently local file only)
- Admin dashboard UI (queue.json is the audit trail for now)
- Automated scheduled runs (manual `.bat` trigger only)
- Foursquare integration (preserved in generate-city.mjs comments, re-enable when billing sorted)

---

## Open Questions

- None — ready for implementation plan
