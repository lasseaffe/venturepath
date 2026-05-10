# VentureVault UGC Hub — Design Spec
**Date:** 2026-05-10
**Status:** Approved for implementation planning

---

## Overview

Transform VentureVault from a hardcoded 4-card display into a living Pro-Path marketplace powered by:
- A Supabase-backed data layer replacing the static `PRO_PATHS` array
- An enrichment pipeline (destinations.txt → Wikidata + Ollama/Anthropic → Supabase)
- Animated hero cards with real Wikimedia Commons photos + breathing glow
- Three UGC creation paths feeding one unified schema
- Community trust signals (ratings, quality scores, architect profiles)

---

## 1. Data Schema

### `pro_paths` table (Supabase)

```sql
CREATE TABLE IF NOT EXISTS pro_paths (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  destination       text NOT NULL,
  architect_name    text NOT NULL,
  architect_id      uuid REFERENCES auth.users(id),
  cover_image_url   text,
  description       text,
  difficulty        text CHECK (difficulty IN ('Easy','Moderate','Hard','Expert')),
  distance_km       int,
  days              int,
  squad_min         int,
  squad_max         int,
  price_usd         numeric DEFAULT 0,
  climate           text CHECK (climate IN ('alpine','tropical','subarctic','desert','temperate','arid')),
  legs              jsonb NOT NULL DEFAULT '[]',
  objectives        jsonb NOT NULL DEFAULT '[]',
  manifest_settings jsonb NOT NULL DEFAULT '{}',
  clones            int NOT NULL DEFAULT 0,
  rating            numeric NOT NULL DEFAULT 0,
  rating_count      int NOT NULL DEFAULT 0,
  is_community      boolean NOT NULL DEFAULT false,
  is_curated        boolean NOT NULL DEFAULT false,
  llm_quality_score numeric CHECK (llm_quality_score BETWEEN 0 AND 1),
  source            text CHECK (source IN ('pipeline','clone','wizard','manual')),
  forked_from       uuid REFERENCES pro_paths(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### RLS Policies
- Public read for all rows
- Authenticated insert/update for own rows (`architect_id = auth.uid()`)
- Pipeline service role bypasses RLS for upserts

### Supporting tables
- `poi_enrichment` — existing migration, used as Wikidata cache layer
- `pro_path_reviews` — `(id, path_id, pioneer_id, rating int, note text, created_at)`

---

## 2. Enrichment Pipeline

**Entry point:** `pipeline/run.js`

### Stage 1 — Data Gathering (free, no LLM)
Reads `pipeline/destinations.txt` line by line. For each city:
1. `wikidataEngine` → QID, description, coordinates, country, Wikimedia Commons image URL
2. `otmEngine` → top 10 POIs by category (nature, cultural, adventure)
3. `weatherEngine` → best travel months, climate classification
4. Cache output to `pipeline/cache/<slug>.json`
5. Skip if cache exists unless `--force` flag passed
6. 200ms debounce between requests (matches existing wikidataEngine pattern)

### Stage 2 — Expedition Generation (LLM)
Input: `pipeline/cache/<slug>.json`

**Primary:** Ollama at `http://localhost:11434/api/generate`
- Model: `llama3` with fallback to `mistral`
- Detects availability via a preflight `GET /api/tags` with 2s timeout

**Fallback:** Anthropic API (`VITE_ANTHROPIC_KEY` already in env)
- Activates automatically on Ollama connection error
- Uses `claude-haiku-4-5-20251001` for cost efficiency

**Prompt contract:**
The LLM receives the destination bundle and must return valid JSON matching the `pro_paths` schema. Pipeline validates shape with Zod before upsert. Invalid JSON triggers one retry with an explicit correction prompt. Quality score (0–1) computed from field completeness: name, description, ≥2 legs, difficulty, climate, cover_image_url.

**Output:** Upsert to Supabase `pro_paths` with `is_curated: true`, `source: 'pipeline'`.

### Planned initial batch (from destinations.txt)
Patagonia, Iceland, Swiss Alps, Tokyo, Bali, Cape Town, Svalbard, Dolomites, Kyoto, Machu Picchu — targeting ~25 curated Pro-Paths in first run.

---

## 3. Animated Hero Cards

### Component: `ProPathCard`
Replaces the current `motion.div` block inside VentureVault.

### Layer 1 — Ken Burns parallax (photo)
- `cover_image_url` as CSS `background-image`
- Framer Motion `animate` cycles `backgroundPosition` between `"50% 40%"` and `"50% 60%"`
- Duration: 10s, `repeat: Infinity`, `repeatType: "reverse"`, `ease: "easeInOut"`
- Dark overlay: `from-black/70 via-black/30 to-transparent` gradient on top

### Layer 2 — Breathing pulse glow
- Absolutely positioned `div` at card center, behind photo layer
- Radial gradient color by climate:
  - `alpine` → slate blue
  - `tropical` → emerald
  - `subarctic` → cyan
  - `desert` → amber
  - `temperate` → teal
- Framer Motion: `scale` 1 → 1.15 → 1, `opacity` 0.15 → 0.35 → 0.15
- Duration: 4s, `repeat: Infinity`, `ease: "easeInOut"`

### Hover behavior
- `whileHover`: scale `1.02`, elevated z-index
- `AnimatePresence` reveals "Preview Legs" row sliding down

### Fallback
If `cover_image_url` is null: existing `bg-gradient-to-br` color by climate remains as background. Pulse glow still runs.

---

## 4. UGC Hub — Three Creation Paths

All paths produce a `pro_paths` row with `is_community: true`.

### Path 1 — Minimal Submit
Single form: destination text input + optional leg list.
On submit:
1. Insert stub row to Supabase
2. Supabase Edge Function triggers enrichment (calls Anthropic — Ollama is local-only)
3. Pioneer sees terminal-style "Enriching…" animation (reuses clone overlay)
4. Row updated with enriched fields; Pioneer lands on their published card

### Path 2 — Guided Wizard
5-step flow inside VentureVault:
1. Destination (text + map pin preview)
2. Legs builder (drag-to-reorder, mode selector per leg)
3. Squad & difficulty selectors
4. Pricing toggle (free / paid, USD input)
5. Preview card → Publish

Auto-saves to `localStorage` between steps. Final step renders the exact card as it will appear in the vault.

### Path 3 — Clone & Edit
Existing clone flow gains "Edit before saving" mode:
- All fields editable inline after clone
- "Publish as my own" button enabled once name and ≥1 leg differ from source
- `forked_from` field set to source path ID
- Attribution shown: `forked from <source name> by <source architect>`

---

## 5. Trust & Discovery Signals

### Community card badge
- `COMMUNITY` label in Sandstone (#D9C5B2) — distinct from `ELITE PIONEER` gold
- LLM quality score displayed as `◆◆◆◇◇` (5-dot scale) below star rating

### Surfacing
- Default sort: clone count descending
- Trending tab: most clones in last 7 days
- Filters: difficulty, climate, days range, squad size, price (free/paid)

### "Inspired by" chain
- `forked_from` reference shown on card and architect profile
- Creates visible lineage: community paths trace back to curated originals

---

## 6. Must-Have Supporting Features

### Architect Profiles (required for UGC identity)
- Avatar, display name, published path count, total clones, earnings balance
- Links from every card's "by [name]" byline

### Reviews Widget (VP-4 compliance)
- Star rating + one-line note per clone action
- Shows `0 reviews` widget (not hidden) to avoid empty-state compliance failure

### Search + Filter
- Filter bar above card grid: difficulty chips, climate chips, days slider, squad size slider, price toggle
- Client-side filtering against Supabase-fetched array (no additional queries)

### My Paths Tab
- Lists own submissions with edit, unpublish, and earnings view
- Accessible from Architect Profile

---

## 7. Infrastructure Requirements

| Requirement | Solution |
|---|---|
| Pioneer accounts | Supabase Auth (email or OAuth) |
| Cover image upload | Supabase Storage bucket `expedition-covers` |
| Server-side enrichment | Supabase Edge Function `enrich-path` |
| Pipeline runner | Node.js script `pipeline/run.js` (local CLI) |
| Env vars needed | `VITE_ANTHROPIC_KEY` (exists), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

---

## 8. Out of Scope (this spec)

- Stripe payment processing for paid paths (price field stored, checkout not implemented)
- Real-time collaborative editing of legs
- Mobile-native AR integration with expedition cards
- Moderation tooling beyond LLM quality score
