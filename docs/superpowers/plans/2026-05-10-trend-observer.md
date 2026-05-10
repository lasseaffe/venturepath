# TrendObserver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time Google Trends signals to the Inspire Me panel so Architects see trending destinations ranked first with a visual badge.

**Architecture:** Pure scoring function + React hook with sessionStorage cache + badge component + InspirePanel integration. Vite proxy handles CORS for the Trends RSS feed.

**Tech Stack:** Vite proxy, DOMParser (browser-native), sessionStorage, React hook, inline badge styled with VenturePath design tokens.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/trendObserver.js` | Pure scoring: maps trend terms → city scores |
| Create | `src/utils/trendObserver.test.js` | Unit tests for `scoreCities` |
| Create | `src/hooks/useTrendSignal.js` | React hook: fetch RSS, cache in sessionStorage, return `trendMap` |
| Create | `src/components/inspire/TrendBadge.jsx` | Inline Ember badge: `🔥 TRENDING` |
| Modify | `src/components/inspire/InspirePanel.jsx` | Call hook, sort cities, render badges |
| Modify | `vite.config.js` | Add `/api/trends` proxy to Google Trends RSS |

---

## Task 1: Pure scoring function + tests

**Files:**
- Create: `src/utils/trendObserver.js`
- Create: `src/utils/trendObserver.test.js`

### Step 1.1: Write the failing tests

- [ ] Create `src/utils/trendObserver.test.js` with the following content:

```js
import { describe, it, expect } from 'vitest';
import { scoreCities } from './trendObserver.js';

const CITIES = [
  { id: 'tokyo',  name: 'Tokyo',  tags: ['asia', 'urban', 'food'] },
  { id: 'paris',  name: 'Paris',  tags: ['europe', 'art', 'romance'] },
  { id: 'bali',   name: 'Bali',   tags: ['asia', 'beach', 'spiritual'] },
];

describe('scoreCities', () => {
  it('returns empty Map when trendTerms is empty', () => {
    const result = scoreCities(CITIES, []);
    expect(result.size).toBe(0);
  });

  it('scores a city when its name is a substring of a trend term', () => {
    // "Tokyo" substring of "Tokyo weekend travel"
    const result = scoreCities(CITIES, ['Tokyo weekend travel']);
    expect(result.has('tokyo')).toBe(true);
    expect(result.get('tokyo').score).toBe(20); // position 0 → weight 20
    expect(result.get('tokyo').label).toBe('Tokyo weekend travel');
  });

  it('scores a city when a trend term is a substring of the city name', () => {
    // "paris" substring of "Paris"
    const result = scoreCities(CITIES, ['paris art galleries']);
    expect(result.has('paris')).toBe(true);
    expect(result.get('paris').score).toBe(20);
  });

  it('matches on tags — tag is substring of trend term', () => {
    // "beach" is a tag of Bali; "beach holiday" contains "beach"
    const result = scoreCities(CITIES, ['beach holiday destinations']);
    expect(result.has('bali')).toBe(true);
    expect(result.get('bali').score).toBe(20);
  });

  it('applies correct weight for position — position 1 gets weight 19', () => {
    const result = scoreCities(CITIES, ['no match here', 'Tokyo deals']);
    expect(result.get('tokyo').score).toBe(19); // position 1 → weight 19
  });

  it('accumulates scores when multiple terms match the same city', () => {
    // position 0 → 20, position 2 → 18; total 38
    const result = scoreCities(CITIES, ['Tokyo travel', 'nothing', 'Tokyo cherry blossom']);
    expect(result.get('tokyo').score).toBe(38);
  });

  it('label is the term that produced the highest single-term score (first matched)', () => {
    // position 0 scores 20 (highest), position 2 scores 18
    const result = scoreCities(CITIES, ['Tokyo travel', 'nothing', 'Tokyo cherry blossom']);
    expect(result.get('tokyo').label).toBe('Tokyo travel');
  });

  it('does not score cities with no matching terms', () => {
    const result = scoreCities(CITIES, ['volcano eruption', 'stock market news']);
    expect(result.size).toBe(0);
  });

  it('minimum weight is 1 for positions 20 and beyond', () => {
    // Build 25 terms, Tokyo only at position 24
    const terms = Array.from({ length: 24 }, (_, i) => `unrelated term ${i}`);
    terms.push('Tokyo adventure');
    const result = scoreCities(CITIES, terms);
    expect(result.get('tokyo').score).toBe(1); // Math.max(1, 20 - 24) = 1
  });

  it('returns empty Map when cities array is empty', () => {
    const result = scoreCities([], ['Tokyo travel']);
    expect(result.size).toBe(0);
  });
});
```

### Step 1.2: Run the tests — expect failure

- [ ] Run: `npx vitest run src/utils/trendObserver.test.js`
- Expected output: FAIL — `Cannot find module './trendObserver.js'`

### Step 1.3: Implement `trendObserver.js`

- [ ] Create `src/utils/trendObserver.js`:

```js
/**
 * scoreCities — pure function, no side effects.
 *
 * @param {Array<{ id: string, name: string, tags: string[] }>} cities
 * @param {string[]} trendTerms — trending search strings in rank order (index 0 = most trending)
 * @returns {Map<string, { score: number, label: string }>} cityId → { score, label }
 *
 * Scoring:
 *   For each (termIndex, term) pair, a city matches when:
 *     city.name.toLowerCase() is a substring of term.toLowerCase(), OR
 *     term.toLowerCase() is a substring of city.name.toLowerCase(), OR
 *     any city.tags entry satisfies either substring direction with term.
 *   On match: weight = Math.max(1, 20 - termIndex) is added to the city's accumulated score.
 *   label = the term text from the match that produced the highest single weight (ties: first wins).
 */
export function scoreCities(cities, trendTerms) {
  /** @type {Map<string, { score: number, label: string, bestWeight: number }>} */
  const result = new Map();

  for (let termIndex = 0; termIndex < trendTerms.length; termIndex++) {
    const term = trendTerms[termIndex];
    const termLower = term.toLowerCase();
    const weight = Math.max(1, 20 - termIndex);

    for (const city of cities) {
      const nameLower = city.name.toLowerCase();
      const nameMatches =
        nameLower.includes(termLower) || termLower.includes(nameLower);

      const tagMatches = !nameMatches && city.tags.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(termLower) || termLower.includes(tagLower);
      });

      if (!nameMatches && !tagMatches) continue;

      const existing = result.get(city.id);
      if (!existing) {
        result.set(city.id, { score: weight, label: term, bestWeight: weight });
      } else {
        existing.score += weight;
        if (weight > existing.bestWeight) {
          existing.bestWeight = weight;
          existing.label = term;
        }
      }
    }
  }

  // Strip internal bestWeight before returning
  const clean = new Map();
  for (const [id, { score, label }] of result) {
    clean.set(id, { score, label });
  }
  return clean;
}
```

### Step 1.4: Run tests — expect all pass

- [ ] Run: `npx vitest run src/utils/trendObserver.test.js`
- Expected: all 10 tests PASS

### Step 1.5: Commit

- [ ] Run:
```bash
git add src/utils/trendObserver.js src/utils/trendObserver.test.js
git commit -m "feat(trend-observer): pure scoreCities function with full test coverage"
```

---

## Task 2: Vite proxy + `useTrendSignal` hook

**Files:**
- Modify: `vite.config.js`
- Create: `src/hooks/useTrendSignal.js`

### Step 2.1: Add Vite proxy entry

- [ ] Edit `vite.config.js` so it reads:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/trends': {
        target: 'https://trends.google.com',
        changeOrigin: true,
        rewrite: path =>
          path.replace(/^\/api\/trends/, '/trends/trendingSearches/daily/rss?geo=US&category=travel'),
      },
    },
  },
})
```

### Step 2.2: Create `useTrendSignal.js`

- [ ] Create `src/hooks/useTrendSignal.js`:

```js
import { useState, useEffect } from 'react';
import { scoreCities } from '../utils/trendObserver.js';

const CACHE_KEY = 'vp_trends';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * useTrendSignal — fetches Google Trends RSS for the Travel category,
 * extracts trending search terms, scores cities via scoreCities(), and
 * caches the raw terms in sessionStorage for 15 minutes.
 *
 * @param {Array<{ id: string, name: string, tags: string[] }>} cities
 *   — pass the cities array from useInspireData()
 * @returns {{ trendMap: Map<string, { score: number, label: string }>, loading: boolean }}
 */
export function useTrendSignal(cities) {
  const [trendMap, setTrendMap] = useState(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cities.length) return; // wait until cities are loaded

    let cancelled = false;

    async function loadTrends() {
      try {
        // --- Check sessionStorage cache ---
        let trendTerms = null;
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (
              parsed &&
              Array.isArray(parsed.data) &&
              typeof parsed.fetchedAt === 'number' &&
              Date.now() - parsed.fetchedAt < CACHE_TTL_MS
            ) {
              trendTerms = parsed.data;
            }
          }
        } catch {
          // sessionStorage unavailable or corrupt — ignore
        }

        // --- Fetch if no valid cache ---
        if (!trendTerms) {
          const res = await fetch('/api/trends');
          if (!res.ok) throw new Error(`Trends RSS fetch failed: ${res.status}`);
          const xml = await res.text();

          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          const items = Array.from(doc.querySelectorAll('item title'));
          // The feed's own <channel><title> is NOT inside an <item>, so querySelectorAll('item title') is safe.
          trendTerms = items.map(el => el.textContent.trim()).filter(Boolean);

          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data: trendTerms, fetchedAt: Date.now() })
            );
          } catch {
            // Storage quota exceeded — ignore, still use in-memory terms
          }
        }

        if (!cancelled) {
          setTrendMap(scoreCities(cities, trendTerms));
          setLoading(false);
        }
      } catch (err) {
        console.warn('[useTrendSignal] Could not load trend signals — falling back to empty map.', err);
        if (!cancelled) {
          setTrendMap(new Map());
          setLoading(false);
        }
      }
    }

    loadTrends();
    return () => { cancelled = true; };
  }, [cities]); // re-run if cities array reference changes (i.e. after useInspireData resolves)

  return { trendMap, loading };
}
```

### Step 2.3: Smoke-test the hook compiles cleanly

- [ ] Run: `npx vite build --mode development 2>&1 | head -30`
- Expected: no errors mentioning `useTrendSignal` or `trendObserver`.
  If there are import errors, fix the path before continuing.

### Step 2.4: Commit

- [ ] Run:
```bash
git add vite.config.js src/hooks/useTrendSignal.js
git commit -m "feat(trend-observer): Vite proxy + useTrendSignal hook with sessionStorage cache"
```

---

## Task 3: TrendBadge component

**Files:**
- Create: `src/components/inspire/TrendBadge.jsx`

### Step 3.1: Create `TrendBadge.jsx`

- [ ] Create `src/components/inspire/TrendBadge.jsx`:

```jsx
/**
 * TrendBadge — inline Ember-coloured badge indicating a trending destination.
 * Renders nothing when score is falsy (0 / undefined / null).
 *
 * Props:
 *   score  {number}  — trend score from scoreCities(); badge hidden when 0
 *   label  {string}  — matched trend term shown as tooltip (title attr)
 */
export default function TrendBadge({ score, label }) {
  if (!score) return null;

  return (
    <span
      title={label}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 7,
        letterSpacing: '0.15em',
        color: '#E67E22',
        background: 'rgba(230,126,34,0.12)',
        border: '1px solid rgba(230,126,34,0.3)',
        borderRadius: 3,
        padding: '1px 5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        verticalAlign: 'middle',
        lineHeight: 1.6,
      }}
    >
      🔥 TRENDING
    </span>
  );
}
```

### Step 3.2: Verify it renders in isolation (quick sanity)

- [ ] Run: `npx vite build --mode development 2>&1 | grep -i error`
- Expected: no output (no errors)

### Step 3.3: Commit

- [ ] Run:
```bash
git add src/components/inspire/TrendBadge.jsx
git commit -m "feat(trend-observer): TrendBadge component with Ember brand tokens"
```

---

## Task 4: Wire TrendObserver into InspirePanel

**Files:**
- Modify: `src/components/inspire/InspirePanel.jsx`

The panel currently has two places that iterate `cities`:
1. The **city selector pills** (line 208, inside the `!loading && !error && city` branch)
2. The **browse destinations** grid (line 153, inside the `!loading && !error && !city` branch)

Both must use `sortedCities`. The city header line (line 73) must show the badge when a trending city is selected.

### Step 4.1: Import the hook and badge

- [ ] At the top of `src/components/inspire/InspirePanel.jsx`, replace the existing imports block:

```js
import { useState } from 'react';
import { useInspireData, matchCity } from '../../hooks/useInspireData';
import { useTrendSignal } from '../../hooks/useTrendSignal.js';
import ReportButton from './ReportButton.jsx';
import TrendBadge from './TrendBadge.jsx';
```

### Step 4.2: Call `useTrendSignal` and derive `sortedCities`

- [ ] Inside the `InspirePanel` function body, directly after the existing `useInspireData()` call, add:

Replace:
```js
  const { cities, loading, error } = useInspireData();
  const [selectedCity, setSelectedCity] = useState(null);
```

With:
```js
  const { cities, loading, error } = useInspireData();
  const [selectedCity, setSelectedCity] = useState(null);
  const { trendMap } = useTrendSignal(cities);

  // Cities with trend signals surface first, ranked by score desc; others keep original order.
  const sortedCities = [...cities].sort((a, b) =>
    (trendMap.get(b.id)?.score ?? 0) - (trendMap.get(a.id)?.score ?? 0)
  );
```

### Step 4.3: Update the city header line to show badge

- [ ] Find the header `<div>` that renders `city.name, city.country` (line 73 of original file):

Replace:
```jsx
            <div className="text-[11px] font-mono font-bold text-white tracking-wider mt-0.5 uppercase">
              {loading ? 'Loading…' : city ? `${city.name}, ${city.country}` : dayLabel || 'Explore'}
            </div>
```

With:
```jsx
            <div className="text-[11px] font-mono font-bold text-white tracking-wider mt-0.5 uppercase flex items-center gap-1.5 flex-wrap">
              {loading ? 'Loading…' : city ? `${city.name}, ${city.country}` : dayLabel || 'Explore'}
              {city && (
                <TrendBadge
                  score={trendMap.get(city.id)?.score}
                  label={trendMap.get(city.id)?.label}
                />
              )}
            </div>
```

### Step 4.4: Replace `cities` with `sortedCities` in the city selector pills

- [ ] Find the city selector pills block (inside the `cities.length > 1` guard, around line 207):

Replace:
```jsx
                  {cities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCity(c)}
                      className="text-[8px] font-mono px-2 py-1 rounded border transition-colors tracking-widest uppercase"
                      style={{
                        background: c.id === city.id ? 'rgba(230,126,34,0.15)' : 'transparent',
                        borderColor: c.id === city.id ? 'rgba(230,126,34,0.5)' : '#1e2328',
                        color: c.id === city.id ? '#E67E22' : '#4b5563',
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
```

With:
```jsx
                  {sortedCities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCity(c)}
                      className="text-[8px] font-mono px-2 py-1 rounded border transition-colors tracking-widest uppercase flex items-center gap-1"
                      style={{
                        background: c.id === city.id ? 'rgba(230,126,34,0.15)' : 'transparent',
                        borderColor: c.id === city.id ? 'rgba(230,126,34,0.5)' : '#1e2328',
                        color: c.id === city.id ? '#E67E22' : '#4b5563',
                      }}
                    >
                      {c.name}
                      <TrendBadge
                        score={trendMap.get(c.id)?.score}
                        label={trendMap.get(c.id)?.label}
                      />
                    </button>
                  ))}
```

### Step 4.5: Replace `cities` with `sortedCities` in the browse-destinations grid

- [ ] Find the browse destinations pill grid (inside the `!city` branch, around line 153):

Replace:
```jsx
                    {cities.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCity(c)}
                        className="text-[8px] font-mono px-2 py-1 rounded border border-[#1e2328] text-[#4b5563] hover:border-[#E67E22]/50 hover:text-[#E67E22] transition-colors tracking-widest uppercase"
                      >
                        {c.name}
                      </button>
                    ))}
```

With:
```jsx
                    {sortedCities.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCity(c)}
                        className="text-[8px] font-mono px-2 py-1 rounded border border-[#1e2328] text-[#4b5563] hover:border-[#E67E22]/50 hover:text-[#E67E22] transition-colors tracking-widest uppercase flex items-center gap-1"
                      >
                        {c.name}
                        <TrendBadge
                          score={trendMap.get(c.id)?.score}
                          label={trendMap.get(c.id)?.label}
                        />
                      </button>
                    ))}
```

### Step 4.6: Verify no other raw `cities.map` references remain that should use `sortedCities`

- [ ] Run: `grep -n "cities\.map" src/components/inspire/InspirePanel.jsx`
- Expected: zero results (all references now use `sortedCities`)

### Step 4.7: Build check

- [ ] Run: `npx vite build`
- Expected: Build completed successfully — no errors, warnings about missing imports are acceptable only if they're pre-existing.

### Step 4.8: Commit

- [ ] Run:
```bash
git add src/components/inspire/InspirePanel.jsx
git commit -m "feat(trend-observer): wire useTrendSignal + TrendBadge into InspirePanel"
```

---

## Task 5: Full test run + final build verification

**Files:** none new

### Step 5.1: Run the full test suite

- [ ] Run: `npx vitest run`
- Expected: all tests PASS including the 10 new `trendObserver` tests.
  If any pre-existing tests fail, check whether they were already failing before this feature branch (`git stash` and re-run to confirm). Do not fix pre-existing unrelated failures — just note them.

### Step 5.2: Production build

- [ ] Run: `npx vite build`
- Expected: build completes with no errors. The `dist/` folder is updated.

### Step 5.3: Commit (if any fixes were needed in steps 5.1–5.2)

- [ ] If you made any fixes, commit them:
```bash
git add -p   # stage only the fixed files
git commit -m "fix(trend-observer): resolve build/test issues"
```
If no fixes were needed, skip this step.

---

## Self-Review Checklist

### 1. Spec Coverage

| Requirement | Task |
|---|---|
| `scoreCities(cities, trendTerms)` pure function | Task 1 |
| Weight = `Math.max(1, 20 - termIndex)` | Task 1, Step 1.3 |
| `label` = matched trend term | Task 1, Step 1.3 |
| Returns `Map<cityId, {score, label}>` | Task 1, Step 1.3 |
| Vite proxy `/api/trends` | Task 2, Step 2.1 |
| `useTrendSignal(cities)` hook | Task 2, Step 2.2 |
| sessionStorage cache, 15-min TTL | Task 2, Step 2.2 |
| DOMParser RSS parsing | Task 2, Step 2.2 |
| Graceful fallback on error → empty Map | Task 2, Step 2.2 |
| `TrendBadge` with Ember `#E67E22`, JetBrains Mono, 7px, hidden when `score === 0` | Task 3 |
| Sort cities by trend score desc | Task 4, Step 4.2 |
| Badge in city selector pills | Task 4, Step 4.4 |
| Badge in city header when trending city selected | Task 4, Step 4.3 |
| Badge in browse-destinations grid | Task 4, Step 4.5 |
| Tests: name substring match | Task 1 (`it('scores a city when its name...')`) |
| Tests: tag fallback | Task 1 (`it('matches on tags...')`) |
| Tests: empty trendTerms → empty Map | Task 1 (`it('returns empty Map when trendTerms is empty')`) |
| Tests: position weight | Task 1 (`it('applies correct weight for position')`) |
| Tests: accumulated scores | Task 1 (`it('accumulates scores')`) |
| Tests: minimum weight 1 | Task 1 (`it('minimum weight is 1')`) |

All requirements covered. ✓

### 2. Placeholder Scan

No TBD, TODO, "implement later", or vague instructions present. Every step shows exact code. ✓

### 3. Type Consistency

- Function name `scoreCities` used identically in `trendObserver.js`, `trendObserver.test.js`, and `useTrendSignal.js`. ✓
- Return type `Map<cityId, { score: number, label: string }>` consistent across all tasks. ✓
- `trendMap.get(city.id)?.score` and `trendMap.get(city.id)?.label` access pattern used identically in all three `InspirePanel` render locations. ✓
- Hook export named `useTrendSignal` (named export), imported as `{ useTrendSignal }` in InspirePanel. ✓
- `CACHE_KEY = 'vp_trends'` defined once in hook, not referenced elsewhere. ✓
