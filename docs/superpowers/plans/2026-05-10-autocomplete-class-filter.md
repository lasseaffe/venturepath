# Autocomplete Class Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter Nominatim autocomplete results in `searchLocations` to only return travel-relevant OSM classes, eliminating Stolpersteine and other noise from the "Add a stop" dialog.

**Architecture:** Extract a pure `filterByAllowedClass` function from `searchLocations`, test it in isolation, then wire it into the mapping pipeline inside `searchLocations`. No other files change.

**Tech Stack:** Vitest (test runner — already installed, no test script in package.json so use `npx vitest run`)

---

### Task 1: Extract and test the class filter

**Files:**
- Modify: `src/utils/geocodeEngine.js`
- Create: `src/utils/geocodeEngine.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/geocodeEngine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { filterByAllowedClass } from './geocodeEngine';

describe('filterByAllowedClass', () => {
  it('keeps results whose class is in the allowlist', () => {
    const input = [
      { id: 1, name: 'Landungsbrücken', class: 'railway' },
      { id: 2, name: 'Café Central',    class: 'amenity' },
      { id: 3, name: 'Altona',          class: 'place' },
    ];
    expect(filterByAllowedClass(input)).toHaveLength(3);
  });

  it('removes results whose class is not in the allowlist', () => {
    const input = [
      { id: 1, name: 'Stolperstein dedicated to Max', class: 'historic' },
      { id: 2, name: 'Boundary marker',               class: 'man_made' },
      { id: 3, name: 'Landungsbrücken',                class: 'railway' },
    ];
    const out = filterByAllowedClass(input);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Landungsbrücken');
  });

  it('keeps results with no class field (unknown = pass through)', () => {
    const input = [{ id: 1, name: 'Mystery Place' }];
    expect(filterByAllowedClass(input)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(filterByAllowedClass([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/utils/geocodeEngine.test.js
```

Expected: FAIL — `filterByAllowedClass is not exported`

- [ ] **Step 3: Add `filterByAllowedClass` export and wire it into `searchLocations`**

Replace the contents of `src/utils/geocodeEngine.js` with:

```js
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'VenturePath/1.0' };

const ALLOWED_CLASSES = new Set([
  'place', 'highway', 'railway', 'amenity',
  'tourism', 'natural', 'shop', 'leisure', 'aeroway',
]);

export function filterByAllowedClass(results) {
  return results.filter(r => !r.class || ALLOWED_CLASSES.has(r.class));
}

export async function geocodeLocation(text) {
  if (!text?.trim()) return null;
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function searchLocations(text, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const mapped = data.map(r => ({
      id: r.place_id,
      name: r.display_name.split(',')[0],
      address: r.display_name,
      coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      type: r.type,
      class: r.class,
    }));
    return filterByAllowedClass(mapped);
  } catch {
    return [];
  }
}
```

Key changes from original:
- `class: r.class` added to the mapped object (was silently dropped before)
- `filterByAllowedClass(mapped)` applied before returning
- `filterByAllowedClass` exported as a pure function

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/utils/geocodeEngine.test.js
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```
git add src/utils/geocodeEngine.js src/utils/geocodeEngine.test.js
git commit -m "fix(autocomplete): filter Nominatim results to travel-relevant OSM classes"
```

---

### Task 2: Smoke-test in the running app

- [ ] **Step 1: Start the dev server**

```
npm run dev
```

- [ ] **Step 2: Open a trip, open "Add a stop", type "landungs" in the FROM field**

Expected: suggestions show Landungsbrücken (railway/place class) — no Stolpersteine

- [ ] **Step 3: Type "eiffel" in the TO field**

Expected: Eiffel Tower appears (tagged `tourism=attraction` in OSM — class `tourism`)

- [ ] **Step 4: Type "stolperstein" directly**

Expected: empty suggestions (all results are `class=historic`)
