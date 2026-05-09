# Destination Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full collect → fetch → report → LLM-fix pipeline for VenturePath city data, driven by desktop `.bat` files and a minimal local Express receiver.

**Architecture:** Three Node.js scripts (`fetch-cities.mjs`, `issue-receiver.mjs`, `fix-issues.mjs`) share a common `pipeline/` folder containing `destinations.txt` and `issues/queue.json`. The in-app report button POSTs to the receiver (port 3099). Two desktop `.bat` files drive fetch and fix runs. Ollama (llama3.1:8b) handles LLM fixes.

**Tech Stack:** Node.js ESM scripts, Express (issue receiver), OpenTripMap API, Wikipedia REST API, Ollama HTTP API, existing `generate-city.mjs` logic extracted to a shared module.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/lib/city-fetcher.js` | Create | Shared OTM + Wikipedia fetch logic (extracted from generate-city.mjs) |
| `scripts/lib/queue.js` | Create | Read/write/append `pipeline/issues/queue.json` atomically |
| `scripts/lib/auto-detect.js` | Create | Run quality checks on a city object, return issue array |
| `scripts/fetch-cities.mjs` | Create | Batch runner: reads destinations.txt, calls city-fetcher, writes inspire_all.json |
| `scripts/issue-receiver.mjs` | Create | Minimal Express server on port 3099, appends user reports to queue.json |
| `scripts/fix-issues.mjs` | Create | Reads queue.json, calls Ollama, patches inspire_all.json, archives resolved |
| `scripts/generate-city.mjs` | Modify | Import from lib/city-fetcher.js instead of inline logic |
| `pipeline/destinations.txt` | Create | Seed list of cities to fetch |
| `pipeline/issues/queue.json` | Create | Empty array `[]` — issue tracking file |
| `pipeline/issues/archive.json` | Create | Empty array `[]` — resolved issues |
| `src/components/inspire/ReportButton.jsx` | Create | ⚠️ button + modal for city/POI reporting |
| `src/components/inspire/InspirePanel.jsx` | Modify | Mount ReportButton on city header and POI rows |
| `VENTUREPATH - Fetch Cities.bat` | Create | Desktop bat: runs fetch-cities.mjs |
| `VENTUREPATH - Fix Issues.bat` | Create | Desktop bat: starts receiver + runs fix-issues.mjs |
| `START - VenturePath (3001).bat` | Modify | Also starts issue-receiver.mjs in background |

---

## Task 1: Extract shared city-fetcher module

**Files:**
- Create: `scripts/lib/city-fetcher.js`
- Modify: `scripts/generate-city.mjs`

- [ ] **Step 1: Create `scripts/lib/` directory and `city-fetcher.js`**

```js
// scripts/lib/city-fetcher.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env two levels up (project root)
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  });
}

export const OTM_KEY = process.env.VITE_OTM_API_KEY ?? '';
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const OTM_KIND_MAP = [
  { otmKinds: ['foods', 'restaurants', 'cafe', 'bar'],               cat: 'food',       icon: '🍽',  duration: 75  },
  { otmKinds: ['cultural', 'museums', 'theatres_and_entertainments'], cat: 'activity',   icon: '🎭',  duration: 120 },
  { otmKinds: ['historic', 'architecture', 'religion'],               cat: 'landmark',   icon: '🏛',  duration: 90  },
  { otmKinds: ['natural', 'parks', 'sport'],                          cat: 'hidden_gem', icon: '💎',  duration: 60  },
];

export const OTM_FETCH_KINDS = [
  { kinds: 'cultural',                    label: 'cultural' },
  { kinds: 'historic',                    label: 'historic' },
  { kinds: 'museums',                     label: 'museums'  },
  { kinds: 'restaurants',                 label: 'food'     },
  { kinds: 'theatres_and_entertainments', label: 'activity' },
  { kinds: 'natural',                     label: 'nature'   },
];

export const COUNTRY_CONTINENT = {
  germany: 'Europe', france: 'Europe', spain: 'Europe', italy: 'Europe',
  portugal: 'Europe', netherlands: 'Europe', belgium: 'Europe', switzerland: 'Europe',
  austria: 'Europe', denmark: 'Europe', sweden: 'Europe', norway: 'Europe',
  finland: 'Europe', poland: 'Europe', czechia: 'Europe', 'czech republic': 'Europe',
  hungary: 'Europe', romania: 'Europe', greece: 'Europe', turkey: 'Europe',
  croatia: 'Europe', serbia: 'Europe', slovenia: 'Europe', slovakia: 'Europe',
  'united kingdom': 'Europe', uk: 'Europe', ireland: 'Europe', iceland: 'Europe',
  ukraine: 'Europe', 'bosnia and herzegovina': 'Europe', montenegro: 'Europe',
  japan: 'Asia', china: 'Asia', 'south korea': 'Asia', korea: 'Asia',
  thailand: 'Asia', vietnam: 'Asia', indonesia: 'Asia', malaysia: 'Asia',
  india: 'Asia', nepal: 'Asia', cambodia: 'Asia', laos: 'Asia',
  myanmar: 'Asia', singapore: 'Asia', philippines: 'Asia', taiwan: 'Asia',
  'hong kong': 'Asia', mongolia: 'Asia', 'sri lanka': 'Asia',
  'saudi arabia': 'Asia', 'united arab emirates': 'Asia', uae: 'Asia',
  jordan: 'Asia', israel: 'Asia', lebanon: 'Asia', iraq: 'Asia', iran: 'Asia',
  'united states': 'North America', usa: 'North America', canada: 'North America',
  mexico: 'North America', cuba: 'North America', 'costa rica': 'North America',
  guatemala: 'North America', panama: 'North America',
  brazil: 'South America', argentina: 'South America', colombia: 'South America',
  peru: 'South America', chile: 'South America', ecuador: 'South America',
  venezuela: 'South America', bolivia: 'South America', uruguay: 'South America',
  nigeria: 'Africa', kenya: 'Africa', ethiopia: 'Africa', ghana: 'Africa',
  tanzania: 'Africa', 'south africa': 'Africa', egypt: 'Africa',
  morocco: 'Africa', senegal: 'Africa', rwanda: 'Africa',
  australia: 'Oceania', 'new zealand': 'Oceania', fiji: 'Oceania',
};

export function inferContinent(country) {
  const cl = country.toLowerCase();
  return COUNTRY_CONTINENT[cl]
    ?? Object.entries(COUNTRY_CONTINENT).find(([k]) => cl.includes(k))?.[1]
    ?? 'Europe';
}

export function inferTags(wikiDesc = '', wikiExtract = '') {
  const text = (wikiDesc + ' ' + wikiExtract).toLowerCase();
  const checks = [
    ['port city',    ['port', 'harbour', 'harbor']],
    ['museums',      ['museum']],
    ['historic',     ['historic', 'medieval', 'ancient', 'old town']],
    ['beaches',      ['beach', 'coast', 'seaside']],
    ['mountains',    ['mountain', 'alpine', 'volcano']],
    ['food scene',   ['cuisine', 'gastronomy', 'food']],
    ['music',        ['music', 'festival', 'jazz', 'opera']],
    ['arts',         ['art', 'gallery', 'theatre']],
    ['nightlife',    ['nightlife', 'club', 'bar scene']],
    ['architecture', ['architecture', 'cathedral', 'baroque', 'gothic']],
    ['culture',      ['culture', 'cultural']],
  ];
  const tags = checks.filter(([, kws]) => kws.some(kw => text.includes(kw))).map(([tag]) => tag);
  if (tags.length < 3) tags.push('travel');
  return [...new Set(tags)].slice(0, 6);
}

export function mapOtmKinds(kindsStr) {
  const parts = (kindsStr ?? '').toLowerCase().split(',');
  for (const { otmKinds, cat, icon, duration } of OTM_KIND_MAP) {
    if (otmKinds.some(k => parts.some(p => p.includes(k)))) return { cat, icon, duration };
  }
  return { cat: 'hidden_gem', icon: '💎', duration: 60 };
}

export function poiFromOtm(place, detail, cityName) {
  const { cat, icon, duration } = mapOtmKinds(place.kinds);
  const name = detail?.name || place.name;
  if (!name || name.trim() === '') return null;
  const description = detail?.wikipedia_extracts?.text
    ?? detail?.info?.descr
    ?? `A notable ${cat} in ${cityName}.`;
  return {
    id:              `${cat}-${slugify(name)}`,
    name,
    category:        cat,
    icon,
    description:     description.slice(0, 200),
    duration_min:    duration,
    time_suggestion: null,
    notes:           detail?.url ?? null,
  };
}

export async function countryNameToCode(countryName) {
  if (!countryName) return null;
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=cca2`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.cca2?.toLowerCase() ?? null;
  } catch { return null; }
}

export async function otmGeocode(cityName, country) {
  const cc = await countryNameToCode(country);
  const ccParam = cc ? `&country=${cc}` : '';
  const url = `${OTM_BASE}/places/geoname?name=${encodeURIComponent(cityName)}${ccParam}&apikey=${OTM_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM geocode ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function otmPois(lat, lon, kinds, limit = 8) {
  const url = `${OTM_BASE}/places/radius?radius=8000&lon=${lon}&lat=${lat}&kinds=${kinds}&limit=${limit}&rate=3&format=json&apikey=${OTM_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM POI ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function otmDetail(xid) {
  const res = await fetch(`${OTM_BASE}/places/xid/${xid}?apikey=${OTM_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

export async function wikiSummary(cityName) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName.replace(/ /g, '_'))}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

/**
 * Full city fetch: Wikipedia + OTM geocode + OTM POIs.
 * Returns a city object ready for inspire_all.json.
 */
export async function fetchCity(cityName, country, { verbose = true } = {}) {
  const log = verbose ? console.log : () => {};

  log('📖  Fetching Wikipedia summary…');
  const wiki = await wikiSummary(cityName);
  const description = (wiki?.extract ?? `${cityName} is a fascinating destination.`).slice(0, 600);
  const imageUrl    = wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? '';
  const tags        = inferTags(wiki?.description ?? '', wiki?.extract ?? '');
  const continent   = inferContinent(country);

  log('📍  Geocoding…');
  const geo = await otmGeocode(cityName, country);
  log(`    → ${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}`);

  const pois = [];
  const seen = new Set();

  for (const group of OTM_FETCH_KINDS) {
    log(`🗺   Fetching ${group.label} POIs…`);
    try {
      const places = await otmPois(geo.lat, geo.lon, group.kinds, 8);
      for (const place of places) {
        if (!place.name?.trim() || seen.has(place.xid)) continue;
        if (/^stolperstein|^gedenktafel|^mahnmal/i.test(place.name)) continue;
        seen.add(place.xid);
        await new Promise(r => setTimeout(r, 200));
        const detail = await otmDetail(place.xid);
        const poi = poiFromOtm(place, detail, cityName);
        if (poi && !pois.find(p => p.id === poi.id)) pois.push(poi);
        if (pois.length >= 18) break;
      }
    } catch (e) {
      log(`  ⚠️  ${group.label}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
    if (pois.length >= 18) break;
  }

  return {
    id:        slugify(cityName),
    name:      cityName,
    country:   country || geo.country || 'Unknown',
    continent,
    tags,
    description,
    image_url: imageUrl,
    pois,
  };
}
```

- [ ] **Step 2: Update `scripts/generate-city.mjs` to import from lib**

Replace the entire file content with the slimmed-down version that delegates to `city-fetcher.js`:

```js
#!/usr/bin/env node
/**
 * generate-city.mjs
 * Usage: node scripts/generate-city.mjs "Hamburg, Germany"
 *        node scripts/generate-city.mjs "Tokyo, Japan" --dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchCity, slugify, OTM_KEY } from './lib/city-fetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');

const DRY_RUN = process.argv.includes('--dry-run');
const cityArg = process.argv.slice(2).filter(a => !a.startsWith('--'))[0];

if (!cityArg) { console.error('Usage: node scripts/generate-city.mjs "City, Country"'); process.exit(1); }
if (!OTM_KEY) { console.error('Set VITE_OTM_API_KEY in .env'); process.exit(1); }

const [cityName, countryRaw] = cityArg.split(',').map(s => s.trim());
const country = countryRaw ?? '';

console.log(`\n🌍  Generating: ${cityName}${country ? `, ${country}` : ''}`);
console.log('──────────────────────────────────────────────');

const cityObj = await fetchCity(cityName, country);
console.log(`✅  Collected ${cityObj.pois.length} POIs`);

if (DRY_RUN) { console.log('\n── DRY RUN ──\n', JSON.stringify(cityObj, null, 2)); process.exit(0); }

const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const idx = db.cities.findIndex(c => c.id === cityObj.id);
if (idx >= 0) { db.cities[idx] = cityObj; console.log(`\n♻️   Replaced "${cityName}"`); }
else { db.cities.push(cityObj); console.log(`\n➕  Added "${cityName}" (total: ${db.cities.length})`); }
db.generated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`💾  Saved.\n`);

// =============================================================================
// FOURSQUARE INTEGRATION (disabled — project in sandbox mode, no billing)
// Re-enable: 1) add billing at foursquare.com/developers
//            2) set VITE_FSQ_API_KEY in .env
//            3) swap OTM_FETCH_KINDS loop for FSQ block below
// =============================================================================
// const FSQ_KEY = process.env.VITE_FSQ_API_KEY ?? '';
// const FSQ_BASE = 'https://api.foursquare.com/v3';
// const FSQ_CATEGORY_GROUPS = [
//   { label: 'landmark',   fsqCategory: '16000', icon: '🏛',  duration: 90  },
//   { label: 'food',       fsqCategory: '13065', icon: '🍽',  duration: 75  },
//   { label: 'activity',   fsqCategory: '10000', icon: '🎭',  duration: 120 },
//   { label: 'hidden_gem', fsqCategory: '16020', icon: '💎',  duration: 60  },
// ];
// async function fsqSearch(near, categoryId, limit = 6) {
//   const url = `${FSQ_BASE}/places/search?near=${encodeURIComponent(near)}&categories=${categoryId}&limit=${limit}&sort=RATING`;
//   const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: FSQ_KEY } });
//   if (!res.ok) throw new Error(`Foursquare ${res.status}: ${await res.text()}`);
//   return (await res.json()).results ?? [];
// }
// function poiFromFsq(place, group, city) {
//   return {
//     id: `${group.label}-${slugify(place.name)}`, name: place.name, category: group.label,
//     icon: group.icon, description: place.categories?.[0]?.name
//       ? `${place.categories[0].name} in ${city}.` : `A notable ${group.label} in ${city}.`,
//     duration_min: group.duration, time_suggestion: null, notes: null,
//   };
// }
```

- [ ] **Step 3: Verify generate-city.mjs still works**

```
cd C:\Users\lasse\Desktop\venturepath
node scripts/generate-city.mjs "Lisbon, Portugal" --dry-run
```

Expected: geocodes correctly (38.7, -9.1), returns POIs, prints DRY RUN output.

- [ ] **Step 4: Commit**

```
git add scripts/lib/city-fetcher.js scripts/generate-city.mjs
git commit -m "refactor: extract city-fetcher to shared lib module"
```

---

## Task 2: Queue utility + pipeline folder scaffold

**Files:**
- Create: `scripts/lib/queue.js`
- Create: `pipeline/destinations.txt`
- Create: `pipeline/issues/queue.json`
- Create: `pipeline/issues/archive.json`

- [ ] **Step 1: Create `scripts/lib/queue.js`**

```js
// scripts/lib/queue.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE   = path.join(__dirname, '..', '..', 'pipeline', 'issues', 'queue.json');
const ARCHIVE_FILE = path.join(__dirname, '..', '..', 'pipeline', 'issues', 'archive.json');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function readQueue() { return readJSON(QUEUE_FILE); }
export function readArchive() { return readJSON(ARCHIVE_FILE); }

export function appendIssue(issue) {
  const queue = readQueue();
  const entry = {
    id:          randomUUID(),
    cityId:      issue.cityId,
    cityName:    issue.cityName,
    country:     issue.country ?? '',
    type:        issue.type,
    poiId:       issue.poiId ?? null,
    detail:      issue.detail ?? '',
    source:      issue.source ?? 'auto_detect',
    status:      'pending',
    reportedAt:  new Date().toISOString(),
    resolvedAt:  null,
    llmFix:      null,
  };
  queue.push(entry);
  writeJSON(QUEUE_FILE, queue);
  return entry;
}

export function updateIssue(id, patch) {
  const queue = readQueue();
  const idx = queue.findIndex(e => e.id === id);
  if (idx < 0) throw new Error(`Issue ${id} not found`);
  queue[idx] = { ...queue[idx], ...patch };
  writeJSON(QUEUE_FILE, queue);
  return queue[idx];
}

export function archiveResolved() {
  const queue = readQueue();
  const resolved = queue.filter(e => e.status === 'resolved' || e.status === 'skipped');
  const remaining = queue.filter(e => e.status !== 'resolved' && e.status !== 'skipped');
  const archive = readArchive();
  writeJSON(ARCHIVE_FILE, [...archive, ...resolved]);
  writeJSON(QUEUE_FILE, remaining);
  return resolved.length;
}
```

- [ ] **Step 2: Create pipeline folder and seed files**

```
mkdir pipeline\issues
echo [] > pipeline\issues\queue.json
echo [] > pipeline\issues\archive.json
```

Create `pipeline/destinations.txt`:

```
# VenturePath — Destination Queue
# One "City, Country" per line. Lines starting with # are ignored.
# Already-fetched cities are skipped unless --force flag is used.

# Europe
Amsterdam, Netherlands
Barcelona, Spain
Berlin, Germany
Copenhagen, Denmark
Prague, Czech Republic
Rome, Italy
Vienna, Austria

# Asia
Bangkok, Thailand
Bali, Indonesia
Seoul, South Korea
Singapore, Singapore
Tokyo, Japan

# Americas
Buenos Aires, Argentina
Mexico City, Mexico
New York, United States

# Africa & Middle East
Cape Town, South Africa
Dubai, United Arab Emirates
```

- [ ] **Step 3: Commit**

```
git add scripts/lib/queue.js pipeline/
git commit -m "feat: add queue utility and pipeline folder scaffold"
```

---

## Task 3: Auto-detection module

**Files:**
- Create: `scripts/lib/auto-detect.js`

- [ ] **Step 1: Create `scripts/lib/auto-detect.js`**

```js
// scripts/lib/auto-detect.js
/**
 * Run quality checks on a city object freshly fetched from OTM.
 * Returns array of issue objects (without id/reportedAt — queue.js adds those).
 */

const NON_ASCII_RE = /[^ -]/g;
const GENERIC_DESC_RE = /^A notable (landmark|food|activity|hidden_gem|place) in .+\.$/;

export function detectIssues(cityObj) {
  const issues = [];

  // Missing hero image
  if (!cityObj.image_url || cityObj.image_url.trim() === '') {
    issues.push({
      cityId:   cityObj.id,
      cityName: cityObj.name,
      country:  cityObj.country,
      type:     'missing_image',
      poiId:    null,
      detail:   'No image_url found after Wikipedia fetch',
      source:   'auto_detect',
    });
  }

  // Too few POIs
  if (cityObj.pois.length < 4) {
    issues.push({
      cityId:   cityObj.id,
      cityName: cityObj.name,
      country:  cityObj.country,
      type:     'missing_pois',
      poiId:    null,
      detail:   `Only ${cityObj.pois.length} POIs fetched (minimum 4)`,
      source:   'auto_detect',
    });
  }

  // Per-POI checks
  for (const poi of cityObj.pois) {
    // Non-English description (>25% non-ASCII chars)
    const nonAscii = (poi.description.match(NON_ASCII_RE) ?? []).length;
    const ratio = nonAscii / Math.max(poi.description.length, 1);
    if (ratio > 0.25) {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'wrong_language',
        poiId:    poi.id,
        detail:   `Description appears non-English (${Math.round(ratio * 100)}% non-ASCII): "${poi.description.slice(0, 80)}"`,
        source:   'auto_detect',
      });
    }

    // Generic fallback description
    if (GENERIC_DESC_RE.test(poi.description.trim())) {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'bad_poi',
        poiId:    poi.id,
        detail:   `Generic fallback description: "${poi.description}"`,
        source:   'auto_detect',
      });
    }

    // Empty POI name
    if (!poi.name || poi.name.trim() === '') {
      issues.push({
        cityId:   cityObj.id,
        cityName: cityObj.name,
        country:  cityObj.country,
        type:     'bad_poi',
        poiId:    poi.id,
        detail:   'POI has empty name',
        source:   'auto_detect',
      });
    }
  }

  return issues;
}
```

- [ ] **Step 2: Smoke-test auto-detect manually**

```
node -e "
import('./scripts/lib/auto-detect.js').then(({ detectIssues }) => {
  const city = JSON.parse(require('fs').readFileSync('public/data/inspire_all.json')).cities.find(c => c.id === 'hamburg');
  console.log(detectIssues(city));
});
"
```

Expected: array of issues (some wrong_language from German descriptions, possibly bad_poi).

- [ ] **Step 3: Commit**

```
git add scripts/lib/auto-detect.js
git commit -m "feat: add auto-detect quality checker"
```

---

## Task 4: Batch fetch pipeline (`fetch-cities.mjs`)

**Files:**
- Create: `scripts/fetch-cities.mjs`

- [ ] **Step 1: Create `scripts/fetch-cities.mjs`**

```js
#!/usr/bin/env node
/**
 * fetch-cities.mjs
 * Reads pipeline/destinations.txt, fetches each city via OTM + Wikipedia,
 * runs auto-detect, appends issues to pipeline/issues/queue.json.
 *
 * Usage:
 *   node scripts/fetch-cities.mjs
 *   node scripts/fetch-cities.mjs --force      # re-fetch existing cities
 *   node scripts/fetch-cities.mjs --limit 5    # only process first 5
 *   node scripts/fetch-cities.mjs --dry-run    # print plan, don't write
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchCity, slugify, OTM_KEY } from './lib/city-fetcher.js';
import { detectIssues } from './lib/auto-detect.js';
import { appendIssue } from './lib/queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');
const DEST_FILE  = path.join(__dirname, '..', 'pipeline', 'destinations.txt');

const FORCE   = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT   = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

if (!OTM_KEY) {
  console.error('Set VITE_OTM_API_KEY in .env');
  process.exit(1);
}

// Parse destinations.txt
const lines = fs.readFileSync(DEST_FILE, 'utf8').split('\n');
const destinations = lines
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

// Load existing DB
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const existingIds = new Set(db.cities.map(c => c.id));

const toFetch = destinations
  .filter(d => FORCE || !existingIds.has(slugify(d.split(',')[0].trim())))
  .slice(0, LIMIT);

console.log(`\n🗺   VenturePath City Fetcher`);
console.log(`    ${destinations.length} destinations in file`);
console.log(`    ${toFetch.length} to fetch${FORCE ? ' (--force)' : ''}`);
if (DRY_RUN) console.log('    DRY RUN — no writes\n');
console.log('──────────────────────────────────────────────');

let added = 0, skipped = 0, issuesFound = 0;

for (const dest of toFetch) {
  const [cityName, countryRaw] = dest.split(',').map(s => s.trim());
  const country = countryRaw ?? '';
  console.log(`\n🌍  ${cityName}, ${country}`);

  try {
    const cityObj = await fetchCity(cityName, country, { verbose: false });
    console.log(`    ✅ ${cityObj.pois.length} POIs`);

    // Auto-detect quality issues
    const issues = detectIssues(cityObj);
    if (issues.length) {
      console.log(`    ⚠️  ${issues.length} issue(s) detected`);
      if (!DRY_RUN) issues.forEach(appendIssue);
      issuesFound += issues.length;
    }

    if (!DRY_RUN) {
      const idx = db.cities.findIndex(c => c.id === cityObj.id);
      if (idx >= 0) db.cities[idx] = cityObj;
      else db.cities.push(cityObj);
      added++;
    }
  } catch (e) {
    console.log(`    ✖  Failed: ${e.message}`);
    skipped++;
  }

  // Polite delay between cities
  await new Promise(r => setTimeout(r, 500));
}

if (!DRY_RUN) {
  db.generated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

console.log('\n──────────────────────────────────────────────');
console.log(`✅  Done: ${added} added, ${skipped} failed, ${issuesFound} issues queued`);
console.log(`    Total cities in DB: ${db.cities.length}\n`);
```

- [ ] **Step 2: Dry-run test**

```
cd C:\Users\lasse\Desktop\venturepath
node scripts/fetch-cities.mjs --dry-run --limit 2
```

Expected: prints 2 destinations it would fetch, no files written.

- [ ] **Step 3: Live run with limit 2**

```
node scripts/fetch-cities.mjs --limit 2
```

Expected: 2 cities added to `inspire_all.json`, any issues appended to `pipeline/issues/queue.json`.

- [ ] **Step 4: Commit**

```
git add scripts/fetch-cities.mjs
git commit -m "feat: add batch fetch-cities pipeline"
```

---

## Task 5: Issue receiver (local Express server)

**Files:**
- Create: `scripts/issue-receiver.mjs`

- [ ] **Step 1: Install Express**

```
cd C:\Users\lasse\Desktop\venturepath
npm install express
```

- [ ] **Step 2: Create `scripts/issue-receiver.mjs`**

```js
#!/usr/bin/env node
/**
 * issue-receiver.mjs
 * Minimal Express server on port 3099.
 * Receives user-submitted issue reports from the in-app report button
 * and appends them to pipeline/issues/queue.json.
 *
 * Started automatically by START - VenturePath (3001).bat
 */
import express from 'express';
import { appendIssue } from './lib/queue.js';

const PORT = 3099;
const app = express();
app.use(express.json());

// Allow requests from the Vite dev server (localhost:3001)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.post('/report', (req, res) => {
  const { cityId, cityName, country, type, poiId, detail } = req.body;

  if (!cityId || !type) {
    return res.status(400).json({ ok: false, error: 'cityId and type are required' });
  }

  const VALID_TYPES = ['wrong_location', 'bad_poi', 'wrong_language', 'missing_image', 'missing_pois', 'other'];
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  try {
    const entry = appendIssue({ cityId, cityName, country, type, poiId, detail, source: 'user_report' });
    console.log(`[${new Date().toISOString()}] Report received: ${type} for ${cityName} (${cityId})`);
    res.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error('Failed to append issue:', e.message);
    res.status(500).json({ ok: false, error: 'Failed to save report' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, port: PORT }));

app.listen(PORT, () => {
  console.log(`[issue-receiver] Listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Test receiver manually**

In one terminal:
```
node scripts/issue-receiver.mjs
```

In another:
```
curl -X POST http://localhost:3099/report \
  -H "Content-Type: application/json" \
  -d "{\"cityId\":\"hamburg\",\"cityName\":\"Hamburg\",\"country\":\"Germany\",\"type\":\"bad_poi\",\"detail\":\"Test report\"}"
```

Expected: `{"ok":true,"id":"<uuid>"}` — and a new entry in `pipeline/issues/queue.json`.

- [ ] **Step 4: Commit**

```
git add scripts/issue-receiver.mjs package.json package-lock.json
git commit -m "feat: add issue receiver Express server"
```

---

## Task 6: LLM fix pipeline (`fix-issues.mjs`)

**Files:**
- Create: `scripts/fix-issues.mjs`

- [ ] **Step 1: Create `scripts/fix-issues.mjs`**

```js
#!/usr/bin/env node
/**
 * fix-issues.mjs
 * Reads pending issues from pipeline/issues/queue.json.
 * Fixes them using Ollama (llama3.1:8b) or llama.cpp fallback.
 * Patches public/data/inspire_all.json in place.
 * Archives resolved issues to pipeline/issues/archive.json.
 *
 * Requires Ollama running: ollama serve (then: ollama pull llama3.1:8b)
 * Or llama.cpp server on port 8080.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readQueue, updateIssue, archiveResolved } from './lib/queue.js';
import { fetchCity, otmGeocode, otmPois, otmDetail, poiFromOtm, slugify, OTM_KEY } from './lib/city-fetcher.js';
import { wikiSummary } from './lib/city-fetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');

// LLM endpoints — try Ollama first, fall back to llama.cpp
const LLM_ENDPOINTS = [
  { url: 'http://localhost:11434/api/chat', type: 'ollama' },
  { url: 'http://localhost:8080/v1/chat/completions', type: 'openai' },
];
const MODEL = 'llama3.1:8b';

async function llmChat(prompt) {
  for (const endpoint of LLM_ENDPOINTS) {
    try {
      const body = endpoint.type === 'ollama'
        ? { model: MODEL, messages: [{ role: 'user', content: prompt }], stream: false, options: { temperature: 0.3, num_predict: 300 } }
        : { model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.3 };

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = endpoint.type === 'ollama'
        ? data.message?.content
        : data.choices?.[0]?.message?.content;
      if (text?.trim()) return text.trim();
    } catch { continue; }
  }
  throw new Error('No LLM endpoint available. Start Ollama with: ollama serve');
}

function loadDB() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function saveDB(db) {
  db.generated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

async function fixWrongLanguage(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  const poi = city.pois.find(p => p.id === issue.poiId);
  if (!poi) throw new Error(`POI ${issue.poiId} not found`);

  const wiki = await wikiSummary(poi.name);
  const context = wiki?.extract?.slice(0, 300) ?? '';

  const prompt = `You are a travel guide editor. Rewrite this POI description in clear, engaging English.
Requirements: English only, 1-2 sentences, factual, no generic phrases like "a notable landmark".
City: ${city.name}, ${city.country}
POI name: ${poi.name}
Current description: ${poi.description}
${context ? `Wikipedia context: ${context}` : ''}
Return ONLY the rewritten description, nothing else.`;

  const fixed = await llmChat(prompt);
  poi.description = fixed.slice(0, 200);
  return `Fixed description: "${fixed.slice(0, 80)}…"`;
}

async function fixBadPoi(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  const poi = city.pois.find(p => p.id === issue.poiId);
  if (!poi) throw new Error(`POI ${issue.poiId} not found`);

  const wiki = await wikiSummary(poi.name);
  const context = wiki?.extract?.slice(0, 400) ?? '';

  if (!context) {
    // Remove the POI if we can't find any info about it
    city.pois = city.pois.filter(p => p.id !== issue.poiId);
    return `Removed unfixable POI "${poi.name}" (no Wikipedia data found)`;
  }

  const prompt = `You are a travel guide editor. Write a short description for this place.
Requirements: English only, 1-2 sentences, factual, engaging, specific to this place.
City: ${city.name}, ${city.country}
Place name: ${poi.name}
Wikipedia: ${context}
Return ONLY the description, nothing else.`;

  const fixed = await llmChat(prompt);
  poi.description = fixed.slice(0, 200);
  return `Fixed description for "${poi.name}"`;
}

async function fixMissingImage(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);

  const wiki = await wikiSummary(city.name);
  const img = wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? '';
  if (img) {
    city.image_url = img;
    return `Set image from Wikipedia: ${img.slice(0, 60)}…`;
  }

  // Try Wikimedia Commons search
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(city.name + ' city')}&srnamespace=6&srlimit=3&format=json`
  );
  const data = await res.json();
  const title = data?.query?.search?.[0]?.title;
  if (title) {
    const infoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`
    );
    const infoData = await infoRes.json();
    const pages = Object.values(infoData?.query?.pages ?? {});
    const url = pages[0]?.imageinfo?.[0]?.url;
    if (url) { city.image_url = url; return `Set image from Wikimedia Commons`; }
  }
  throw new Error('No image found from Wikipedia or Wikimedia Commons');
}

async function fixMissingPois(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);

  // Re-geocode and fetch with wider radius + lower rate filter
  const geo = await otmGeocode(city.name, city.country);
  const seen = new Set(city.pois.map(p => p.id));
  const newPois = [];

  for (const kinds of ['cultural', 'historic', 'museums', 'restaurants']) {
    try {
      const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=12000&lon=${geo.lon}&lat=${geo.lat}&kinds=${kinds}&limit=8&rate=2&format=json&apikey=${OTM_KEY}`;
      const res = await fetch(url);
      const places = await res.json();
      for (const place of places) {
        if (!place.name?.trim() || seen.has(place.xid)) continue;
        if (/^stolperstein|^gedenktafel|^mahnmal/i.test(place.name)) continue;
        seen.add(place.xid);
        await new Promise(r => setTimeout(r, 200));
        const detail = await otmDetail(place.xid);
        const poi = poiFromOtm(place, detail, city.name);
        if (poi && !city.pois.find(p => p.id === poi.id)) {
          city.pois.push(poi);
          newPois.push(poi.name);
        }
        if (city.pois.length >= 12) break;
      }
    } catch { continue; }
    await new Promise(r => setTimeout(r, 300));
    if (city.pois.length >= 12) break;
  }
  return `Added ${newPois.length} POIs: ${newPois.join(', ')}`;
}

async function fixWrongLocation(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  // Re-fetch entire city with strict country enforcement
  const fresh = await fetchCity(city.name, city.country, { verbose: false });
  const idx = db.cities.findIndex(c => c.id === issue.cityId);
  db.cities[idx] = fresh;
  return `Re-fetched entire city entry with corrected location`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const queue = readQueue().filter(e => e.status === 'pending');
console.log(`\n🔧  VenturePath Issue Fixer`);
console.log(`    ${queue.length} pending issues\n`);

if (queue.length === 0) {
  console.log('    Nothing to fix. Queue is empty.\n');
  process.exit(0);
}

const db = loadDB();
let fixed = 0, failed = 0;

for (const issue of queue) {
  console.log(`\n▶  [${issue.type}] ${issue.cityName} — ${issue.poiId ?? 'city-level'}`);
  console.log(`   ${issue.detail}`);

  updateIssue(issue.id, { status: 'in_progress' });

  try {
    let result;
    switch (issue.type) {
      case 'wrong_language': result = await fixWrongLanguage(issue, db); break;
      case 'bad_poi':        result = await fixBadPoi(issue, db);        break;
      case 'missing_image':  result = await fixMissingImage(issue, db);  break;
      case 'missing_pois':   result = await fixMissingPois(issue, db);   break;
      case 'wrong_location':
      case 'wrong_city':     result = await fixWrongLocation(issue, db); break;
      default:
        updateIssue(issue.id, { status: 'skipped' });
        console.log(`   ⏭  Skipped (type "${issue.type}" requires manual fix)`);
        continue;
    }

    updateIssue(issue.id, {
      status:    'resolved',
      resolvedAt: new Date().toISOString(),
      llmFix:    { result, appliedAt: new Date().toISOString() },
    });
    console.log(`   ✅  ${result}`);
    fixed++;
  } catch (e) {
    updateIssue(issue.id, {
      status: 'pending', // reset so it can be retried
      llmFix: { error: e.message, attemptedAt: new Date().toISOString() },
    });
    console.log(`   ✖  ${e.message}`);
    failed++;
  }
}

saveDB(db);
const archived = archiveResolved();
console.log(`\n──────────────────────────────────────────────`);
console.log(`✅  Fixed: ${fixed}, Failed: ${failed}, Archived: ${archived}\n`);
```

- [ ] **Step 2: Test with a seeded issue (no LLM needed — test wrong_location path)**

First seed a test issue:
```
node -e "
import('./scripts/lib/queue.js').then(({ appendIssue }) => appendIssue({
  cityId: 'hamburg', cityName: 'Hamburg', country: 'Germany',
  type: 'other', detail: 'Test issue — will be skipped by fixer'
}));
"
```

Run fixer — should skip the `other` type gracefully:
```
node scripts/fix-issues.mjs
```

Expected output: `⏭  Skipped (type "other" requires manual fix)` — and the issue moves to archive.

- [ ] **Step 3: Commit**

```
git add scripts/fix-issues.mjs
git commit -m "feat: add LLM issue fixer pipeline"
```

---

## Task 7: Report button UI (`ReportButton.jsx`)

**Files:**
- Create: `src/components/inspire/ReportButton.jsx`
- Modify: `src/components/inspire/InspirePanel.jsx`

- [ ] **Step 1: Create `src/components/inspire/ReportButton.jsx`**

```jsx
import { useState } from 'react';

const ISSUE_TYPES = [
  { id: 'wrong_location', label: '🗺️ Wrong city / location' },
  { id: 'bad_poi',        label: '📍 Bad POI — wrong or irrelevant' },
  { id: 'wrong_language', label: '🌐 Description in wrong language' },
  { id: 'missing_image',  label: '🖼️ Missing or wrong image' },
  { id: 'missing_pois',   label: '➕ Missing important attractions' },
  { id: 'other',          label: '💬 Other problem' },
];

const RECEIVER_URL = 'http://localhost:3099/report';

export default function ReportButton({ cityId, cityName, country, poiId = null, small = false }) {
  const [open, setOpen]       = useState(false);
  const [type, setType]       = useState('bad_poi');
  const [detail, setDetail]   = useState('');
  const [state, setState]     = useState('idle'); // idle | sending | done | error

  async function handleSubmit() {
    setState('sending');
    try {
      const res = await fetch(RECEIVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId, cityName, country, type, poiId, detail }),
      });
      if (!res.ok) throw new Error('Server error');
      setState('done');
      setTimeout(() => { setOpen(false); setState('idle'); setDetail(''); }, 1800);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Report a problem"
        style={{
          width: small ? 20 : 24, height: small ? 20 : 24,
          borderRadius: '50%',
          border: '1px solid rgba(230,126,34,0.3)',
          background: 'rgba(0,0,0,0.5)',
          color: '#E67E22',
          fontSize: small ? 9 : 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(230,126,34,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
      >
        ⚠
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0E1012', border: '1px solid #1e2328',
              borderRadius: 8, padding: 24, width: 340, maxWidth: '90vw',
            }}
          >
            {/* Header */}
            <div className="text-[10px] font-mono tracking-widest text-[#E67E22] uppercase mb-1">
              Report a problem
            </div>
            <div className="text-[12px] font-mono font-bold text-white mb-4">
              {cityName}{poiId ? ` — ${poiId.replace(/^[^-]+-/, '')}` : ''}
            </div>

            {/* Issue type pills */}
            <div className="flex flex-col gap-1.5 mb-4">
              {ISSUE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="text-left text-[10px] font-mono px-3 py-2 rounded border transition-colors"
                  style={{
                    borderColor: type === t.id ? 'rgba(230,126,34,0.6)' : '#1e2328',
                    background:  type === t.id ? 'rgba(230,126,34,0.1)' : 'transparent',
                    color:       type === t.id ? '#E67E22' : '#6b7280',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Detail textarea */}
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Extra details (optional)…"
              rows={2}
              style={{
                width: '100%', background: '#111316', border: '1px solid #1e2328',
                borderRadius: 4, color: '#9ca3af', fontSize: 10, fontFamily: 'monospace',
                padding: '8px 10px', resize: 'none', outline: 'none',
                boxSizing: 'border-box', marginBottom: 12,
              }}
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={state === 'sending' || state === 'done'}
              style={{
                width: '100%', padding: '8px 0',
                background: state === 'done' ? 'rgba(34,197,94,0.15)' : 'rgba(230,126,34,0.15)',
                border: `1px solid ${state === 'done' ? 'rgba(34,197,94,0.4)' : 'rgba(230,126,34,0.4)'}`,
                borderRadius: 4, color: state === 'done' ? '#22c55e' : '#E67E22',
                fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.15em',
                cursor: state === 'sending' || state === 'done' ? 'default' : 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {state === 'idle'    && 'Submit report'}
              {state === 'sending' && 'Sending…'}
              {state === 'done'    && '✓ Report saved — thanks!'}
              {state === 'error'   && '✖ Failed — is the receiver running?'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Mount ReportButton on the city hero in InspirePanel**

In `src/components/inspire/InspirePanel.jsx`, add the import at the top:

```jsx
import ReportButton from './ReportButton.jsx';
```

Find the city header block (the `<div>` with `"Inspire Me"` label) and add the button next to the SHUFFLE button:

```jsx
{/* Inside the header div, after the SHUFFLE button: */}
{city && (
  <ReportButton
    cityId={city.id}
    cityName={city.name}
    country={city.country}
  />
)}
```

- [ ] **Step 3: Mount ReportButton on each POI row**

Find the POI `<div key={poi.id}>` block. Add the button inside the POI header row next to the category badge:

```jsx
{/* Inside POI row, in the flex row with name + badge: */}
<div className="flex items-center justify-between gap-2">
  <span className="text-[11px] font-mono font-bold text-white truncate">
    {poi.name}
  </span>
  <div className="flex items-center gap-1.5 shrink-0">
    <span
      className="text-[7px] font-mono tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: `${meta.dot}22`, color: meta.dot, border: `1px solid ${meta.dot}44` }}
    >
      {meta.label}
    </span>
    <ReportButton
      cityId={city.id}
      cityName={city.name}
      country={city.country}
      poiId={poi.id}
      small
    />
  </div>
</div>
```

- [ ] **Step 4: Test in browser**

Start the dev server and receiver:
```
node scripts/issue-receiver.mjs
npm run dev
```

Open Inspire Me panel on any city. Verify:
- ⚠ button appears on city header and on each POI row
- Clicking opens modal with 6 issue type options
- Submitting creates entry in `pipeline/issues/queue.json`

- [ ] **Step 5: Commit**

```
git add src/components/inspire/ReportButton.jsx src/components/inspire/InspirePanel.jsx
git commit -m "feat: add in-app report button to InspirePanel"
```

---

## Task 8: Desktop `.bat` files

**Files:**
- Create: `VENTUREPATH - Fetch Cities.bat` (desktop)
- Create: `VENTUREPATH - Fix Issues.bat` (desktop)
- Modify: existing `START - VenturePath (3001).bat` (desktop)

- [ ] **Step 1: Create `VENTUREPATH - Fetch Cities.bat` on the desktop**

File path: `C:\Users\lasse\Desktop\VENTUREPATH - Fetch Cities.bat`

```bat
@echo off
title VenturePath — City Fetcher
cd /d C:\Users\lasse\Desktop\venturepath
echo.
echo  ============================================
echo   VenturePath City Fetcher
echo   Reads: pipeline\destinations.txt
echo   Writes: public\data\inspire_all.json
echo  ============================================
echo.
set /p LIMIT="How many cities to fetch? (Enter for all): "
if "%LIMIT%"=="" (
    node scripts/fetch-cities.mjs
) else (
    node scripts/fetch-cities.mjs --limit %LIMIT%
)
echo.
pause
```

- [ ] **Step 2: Create `VENTUREPATH - Fix Issues.bat` on the desktop**

File path: `C:\Users\lasse\Desktop\VENTUREPATH - Fix Issues.bat`

```bat
@echo off
title VenturePath — Issue Fixer
cd /d C:\Users\lasse\Desktop\venturepath
echo.
echo  ============================================
echo   VenturePath Issue Fixer
echo   Requires: Ollama running (ollama serve)
echo   Model: llama3.1:8b
echo  ============================================
echo.
echo  Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo  [!] Ollama not detected on port 11434.
    echo  [!] Start it with: ollama serve
    echo  [!] Will also try llama.cpp on port 8080.
    echo.
)
node scripts/fix-issues.mjs
echo.
pause
```

- [ ] **Step 3: Update `START - VenturePath (3001).bat` to start the receiver**

Read the existing file first, then update it. The existing content is likely:
```bat
@echo off
cd /d C:\Users\lasse\Desktop\venturepath
npm run dev
```

Replace with:
```bat
@echo off
title VenturePath Dev (3001)
cd /d C:\Users\lasse\Desktop\venturepath
echo Starting issue receiver on port 3099...
start /B node scripts/issue-receiver.mjs
echo Starting Vite dev server on port 3001...
npm run dev
```

- [ ] **Step 4: End-to-end test**

1. Double-click `VENTUREPATH - Fetch Cities.bat`, enter `1` when prompted → confirm 1 city added
2. Open the app → open Inspire Me on any city → click ⚠ → submit a report
3. Check `pipeline/issues/queue.json` — entry should appear
4. Double-click `VENTUREPATH - Fix Issues.bat` → confirm issues processed

- [ ] **Step 5: Commit**

```
git add .
git commit -m "feat: complete destination pipeline with bat launchers and report button"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| destinations.txt collection | Task 2 |
| Batch fetch via OTM + Wikipedia | Task 4 |
| Auto-detect quality issues | Task 3 |
| queue.json issue tracking | Task 2 |
| In-app report button (6 issue types) | Task 7 |
| Local Express receiver (port 3099) | Task 5 |
| LLM fix pipeline (Ollama / llama.cpp) | Task 6 |
| Fix: wrong_language, bad_poi, missing_image, missing_pois, wrong_location | Task 6 |
| Archive resolved issues | Task 6 (archiveResolved) |
| Desktop Fetch bat | Task 8 |
| Desktop Fix bat | Task 8 |
| START bat updated to launch receiver | Task 8 |
| Foursquare code preserved | Task 1 (generate-city.mjs comments) |

All spec requirements covered. No placeholders. Type signatures consistent across tasks (`appendIssue`, `updateIssue`, `archiveResolved`, `fetchCity`, `detectIssues` used consistently).
