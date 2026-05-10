# Destination Images — Design Spec
**Date:** 2026-05-11  
**Status:** Approved

## Problem

Four surfaces in VenturePath display destination/POI images but have no reliable image source:

1. **ExpeditionSelectScreen** — uses deprecated `source.unsplash.com/featured` which returns random, often wrong images (Hamburg showing museum artifacts instead of city skyline).
2. **LedgerWorkbench `LedgerCard`** — has a `thumb` prop slot but falls back to a `📍` emoji because no image is fetched.
3. **KanbanBoard day column headers** — no destination image at all.
4. **KanbanBoard block cards** — no per-stop image at all.

Additionally, none of these surfaces have a "Report Issue" button connected to the existing `/api/element-reports` pipeline.

## Solution

### Runtime Playwright image scraping with Supabase cache

An on-demand API route uses Playwright to scrape Flickr Creative Commons (primary) and Wikimedia Commons (fallback), caching sets of 3–5 images per destination in Supabase. All images include full attribution metadata. Copyright is always respected — only CC-licensed images are accepted.

---

## Architecture

### New: `/api/destination-images` route

```
GET /api/destination-images?q=Lille+France&type=city&count=5
GET /api/destination-images?q=St.+Nikolai+Museum+Hamburg&type=poi&count=3
```

**Flow:**
1. Normalize `query_key`: trim, lowercase, collapse whitespace
2. `SELECT` from `destination_images WHERE query_key = {key}` — if found and `scraped_at > 30 days ago`, return cached set immediately
3. Launch Playwright headless Chromium
4. **Flickr CC search:**
   - Navigate to `flickr.com/search?text={q}&license=2,3,4,5,6,9,10&media=photos&sort=relevance`
   - Wait for photo grid (`photo-list-photo-view` selector)
   - Extract up to 8 candidates: farm/server/id/secret → build `_b.jpg` (full) and `_m.jpg` (thumb) CDN URLs
   - For each candidate: scrape photo page for author name, author profile URL, license badge text + URL
   - Filter: skip results where title/tags suggest wrong location
   - Take top 5 valid results
5. **Wikimedia fallback** (if Flickr returns < 2 usable results):
   - Navigate to `commons.wikimedia.org/w/index.php?search={q}&ns6=1&uselang=en`
   - Extract `File:` links; for each, scrape file page for image URL, license, and author
6. Upsert full set to `destination_images`
7. Close Playwright browser, return `images[]`

**Cache TTL:** 30 days. An incoming report with `issue_type: 'missing_image'` can trigger a re-scrape via the existing `/api/admin/element-fix` endpoint (clear cache row + re-fetch).

**Dependency:** `@playwright/browser-chromium` added to `dependencies` (not devDependencies — this runs at runtime in the API route). Browser binary installed via `npx playwright install chromium`.

---

## Data Model

### Supabase: `destination_images` table

```sql
create table destination_images (
  query_key   text primary key,
  images      jsonb not null default '[]',
  scraped_at  timestamptz default now()
);
```

### Image object shape (within `images` JSONB array)

```json
{
  "url": "https://live.staticflickr.com/65535/abc_b.jpg",
  "thumb": "https://live.staticflickr.com/65535/abc_m.jpg",
  "title": "Vieux-Lille at golden hour",
  "author": "Pierre Moreau",
  "authorUrl": "https://www.flickr.com/photos/pierremoreau/",
  "photoPageUrl": "https://www.flickr.com/photos/pierremoreau/12345678/",
  "license": "CC BY 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
  "source": "flickr"
}
```

Wikimedia entries use the same shape with `source: "wikimedia"` and `photoPageUrl` pointing to the Commons file page.

---

## Client-Side Hook: `useDestinationImage`

```js
// src/hooks/useDestinationImage.js
useDestinationImage(query, type = 'city', index = 0)
// returns { image, loading, error }
// image = one entry from the cached set, selected by (index % images.length)
```

`index` is a stable per-callsite integer — each component passes a different value so the same destination shows different photos across different surfaces without randomness.

| Callsite | index |
|---|---|
| ExpeditionSelectScreen hero | 0 |
| LedgerCard thumb | 1 |
| KanbanBoard day header | 2 |
| KanbanBoard block card | 3 |

---

## Per-Component Changes

### 1. ExpeditionSelectScreen (`ExpeditionCard`)

- **Remove** `getHeroUrl()` function and its `source.unsplash.com` call
- **Add** `useDestinationImage(exp.trip?.destination, 'city', 0)` — replaces hero `src`
- **Add** shimmer skeleton (same dimensions as hero, `#1a2030` background with animated pulse) shown while `loading === true`
- **Add** `ReportButton` in the existing top-right action cluster (alongside edit/delete buttons), always visible (not hover-gated like edit/delete)
- Attribution micro-bar always rendered at bottom edge of hero image

### 2. LedgerCard in LedgerWorkbench

- `item.thumb` is currently populated by the Foursquare/Inspire pipeline where available; remains unchanged
- **Add** fallback: when `item.thumb` is null/empty, call `useDestinationImage(item.name, 'poi', 1)` and use `image.thumb` (52px × 52px, matches existing slot)
- **Add** `ReportButton` overlaid on the thumb image (bottom-right corner, `small` prop)
- Attribution micro-bar on the thumb image

### 3. KanbanBoard — day column header

- **Add** a 48px tall destination image strip at the top of each day column, above the existing label row
- Query: `useDestinationImage(extractDestination(day.label), 'city', 2)` where `extractDestination` strips the day number prefix (`"Day 1 — Punta Arenas"` → `"Punta Arenas"`)
- Strip uses `object-fit: cover`, subtle gradient overlay so the existing label text remains readable
- **Add** `ReportButton` in the column header row (right-aligned, `small` prop)
- Attribution micro-bar on the strip image

### 4. KanbanBoard — block cards (Style C: compact + expand)

**Collapsed state (default):** unchanged — dot + category badge + title + time. No image rendered.

**Expanded state** (block is clicked/tapped to expand — this is existing behaviour):
- Hero image rendered full-width below the category/time row, above notes
- Query: `useDestinationImage(block.title + ' ' + tripDestination, 'poi', 3)` where `tripDestination` comes from `useExpedition()` context (already imported in KanbanBoard)
- Height: 120px, `object-fit: cover`
- Gradient overlay, attribution micro-bar at bottom edge
- **Add** `ReportButton` top-right of the hero image

---

## Attribution Component: `ImageAttribution`

A new shared component used by all four surfaces.

**Always-visible micro-bar:**
```
© Pierre Moreau · CC BY 2.0
```
Rendered as a fixed-height `<a>` tag row at the bottom edge of every image. Clicking opens the attribution popover.

**Attribution popover (click/tap on micro-bar):**
```
Photo by [Pierre Moreau ↗]     ← links to authorUrl
[CC BY 2.0 ↗]                  ← links to licenseUrl
[View original on Flickr ↗]    ← links to photoPageUrl
```
Popover is a small frosted-glass panel (`rgba(14,16,18,0.92)`, `backdrop-filter: blur(8px)`) positioned above the micro-bar. Closes on outside click.

**Inside ReportButton modal:**
When `imageAttribution` prop is passed, the Report modal shows an attribution block above the issue-type picker:
```
Reporting image by [Pierre Moreau ↗] · CC BY 2.0 · [View original ↗]
```

---

## ReportButton Extension

The existing `ReportButton` component accepts two new optional props:

| Prop | Type | Purpose |
|---|---|---|
| `imageUrl` | `string` | Current displayed image URL — pre-selects `missing_image` issue type |
| `imageAttribution` | `object` | `{ author, authorUrl, photoPageUrl, license, licenseUrl }` — renders attribution block in modal |

Extended `card_type` values sent to `/api/element-reports`:

| Surface | card_type |
|---|---|
| Expedition hero | `expedition_hero` |
| Ledger thumb | `ledger_thumb` |
| Kanban day header | `kanban_day` |
| Kanban block card | `kanban_block` |

The `/api/element-reports` route schema is unchanged — `card_type` is already a free `string`.

---

## Copyright Compliance Checklist

- Only Flickr CC licenses `2,3,4,5,6,9,10` (BY, BY-SA, BY-ND, BY-NC, BY-NC-SA, BY-NC-ND, CC0) are accepted
- Author name and license are stored at scrape time and displayed on every image
- `photoPageUrl` is always stored and linked — user can reach original source
- Wikimedia images: Commons file page URL stored as `photoPageUrl`
- No image is shown without `author` and `license` fields populated
- If scraping returns an image with missing attribution metadata, it is discarded

---

## Error & Loading States

| State | UI |
|---|---|
| `loading` | Shimmer skeleton matching image dimensions, branded `#1a2030` base |
| `error` / no results | Existing fallback gradient (`fallbackGradients[tripType]` in ExpeditionCard; solid `#111316` elsewhere) |
| Image load failure (`onError`) | Fall back to gradient; do not show broken image icon |

---

## Files Created / Modified

**New:**
- `src/app/api/destination-images/route.js` — Playwright scraping + Supabase cache
- `src/hooks/useDestinationImage.js` — client hook
- `src/components/ui/ImageAttribution.jsx` — attribution micro-bar + popover
- `supabase/migrations/20260511_destination_images.sql`

**Modified:**
- `src/components/trip/ExpeditionSelectScreen.jsx`
- `src/components/itinerary/ledger/LedgerWorkbench.jsx`
- `src/components/itinerary/KanbanBoard.jsx`
- `src/components/inspire/ReportButton.jsx`
