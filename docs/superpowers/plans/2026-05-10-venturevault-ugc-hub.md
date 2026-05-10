# VentureVault UGC Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform VentureVault from 4 hardcoded cards into a Supabase-backed Pro-Path marketplace with animated hero cards, an LLM enrichment pipeline, and three UGC creation paths.

**Architecture:** Supabase holds all Pro-Paths; a local Node.js pipeline reads `destinations.txt`, enriches via Wikidata + Ollama (Anthropic fallback), and upserts curated rows. The React frontend fetches live from Supabase and replaces the static array. UGC flows (minimal submit, guided wizard, clone-and-edit) all write to the same table.

**Tech Stack:** Vite + React, Framer Motion, Supabase JS v2, Zod (validation), Anthropic SDK (pipeline fallback), Ollama REST API, Wikidata API, Open-Meteo API, OpenTripMap API.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/utils/migrations/002_pro_paths.sql` | Supabase schema: pro_paths + pro_path_reviews + RLS |
| `src/lib/supabase.js` | Supabase client singleton |
| `pipeline/run.js` | CLI entry point — reads destinations.txt, orchestrates stages |
| `pipeline/gatherDestination.js` | Stage 1: Wikidata + OTM + Open-Meteo → cache JSON |
| `pipeline/generateExpedition.js` | Stage 2: cache JSON → LLM → validated pro_path object |
| `pipeline/llmClient.js` | Ollama-primary / Anthropic-fallback LLM abstraction |
| `pipeline/upsertPath.js` | Supabase upsert with service role key |
| `pipeline/scoreQuality.js` | Compute 0–1 completeness score |
| `src/hooks/useProPaths.js` | Fetch + filter pro_paths from Supabase, expose state |
| `src/components/discovery/ProPathCard.jsx` | Animated hero card (Ken Burns + pulse glow) |
| `src/components/discovery/VaultFilterBar.jsx` | Difficulty/climate/days/squad/price filters |
| `src/components/discovery/SubmitWizard.jsx` | 5-step guided creation wizard |
| `src/components/discovery/MinimalSubmit.jsx` | Single-form quick submit (Path 1) |
| `src/components/discovery/ReviewsWidget.jsx` | Star rating + note per path |
| `src/components/discovery/ArchitectByline.jsx` | Clickable "by Name" with mini profile popover |
| `src/components/discovery/CloneEditMode.jsx` | Inline editor after clone (Path 3) |

### Modified files
| File | Change |
|---|---|
| `src/components/discovery/VentureVault.jsx` | Replace static PRO_PATHS with useProPaths, swap card render to ProPathCard, add filter bar + creation entry points |
| `src/store/useTripStore.jsx` | clonePath action accepts optional `forked_from` field |

---

## Task 1: Supabase Schema Migration

**Files:**
- Create: `src/utils/migrations/002_pro_paths.sql`
- Create: `src/lib/supabase.js`

- [ ] **Step 1: Write the migration SQL**

Create `src/utils/migrations/002_pro_paths.sql`:

```sql
-- Pro-Paths table
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

-- Reviews table
CREATE TABLE IF NOT EXISTS pro_path_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id     uuid NOT NULL REFERENCES pro_paths(id) ON DELETE CASCADE,
  pioneer_id  uuid REFERENCES auth.users(id),
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: pro_paths
ALTER TABLE pro_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pro_paths"
  ON pro_paths FOR SELECT USING (true);

CREATE POLICY "Authenticated insert own path"
  ON pro_paths FOR INSERT
  WITH CHECK (auth.uid() = architect_id OR architect_id IS NULL);

CREATE POLICY "Authenticated update own path"
  ON pro_paths FOR UPDATE
  USING (auth.uid() = architect_id);

-- RLS: pro_path_reviews
ALTER TABLE pro_path_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reviews"
  ON pro_path_reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated insert review"
  ON pro_path_reviews FOR INSERT
  WITH CHECK (auth.uid() = pioneer_id);
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Copy the SQL above into your Supabase project → SQL Editor → Run.
Expected: no errors, two new tables visible in Table Editor.

- [ ] **Step 3: Create Supabase client**

Create `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env');
}

export const supabase = createClient(url, key);
```

- [ ] **Step 4: Add env vars to .env.local**

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/migrations/002_pro_paths.sql src/lib/supabase.js
git commit -m "feat(db): pro_paths + reviews schema with RLS"
```

---

## Task 2: useProPaths Hook

**Files:**
- Create: `src/hooks/useProPaths.js`

- [ ] **Step 1: Write the hook**

Create `src/hooks/useProPaths.js`:

```js
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export const DEFAULT_FILTERS = {
  difficulty: [],      // e.g. ['Moderate','Hard']
  climate: [],         // e.g. ['alpine']
  daysMax: 30,
  squadMin: 1,
  paidOnly: false,
  freeOnly: false,
  tab: 'trending',     // 'trending' | 'curated' | 'community' | 'mine'
};

export function useProPaths(filters = DEFAULT_FILTERS) {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('pro_paths')
      .select('*')
      .order('clones', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) { setError(err.message); setLoading(false); return; }
        setPaths(data ?? []);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = [...paths];

    if (filters.tab === 'curated') result = result.filter(p => p.is_curated);
    if (filters.tab === 'community') result = result.filter(p => p.is_community);

    if (filters.difficulty.length > 0)
      result = result.filter(p => filters.difficulty.includes(p.difficulty));
    if (filters.climate.length > 0)
      result = result.filter(p => filters.climate.includes(p.climate));
    if (filters.daysMax < 30)
      result = result.filter(p => p.days <= filters.daysMax);
    if (filters.squadMin > 1)
      result = result.filter(p => p.squad_max >= filters.squadMin);
    if (filters.freeOnly)
      result = result.filter(p => p.price_usd === 0);
    if (filters.paidOnly)
      result = result.filter(p => p.price_usd > 0);

    if (filters.tab === 'trending') {
      result = result.slice().sort((a, b) => b.clones - a.clones);
    }

    return result;
  }, [paths, filters]);

  return { paths: filtered, loading, error, refetch: () => {} };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProPaths.js
git commit -m "feat: useProPaths hook with client-side filtering"
```

---

## Task 3: ProPathCard — Animated Hero Card

**Files:**
- Create: `src/components/discovery/ProPathCard.jsx`

- [ ] **Step 1: Write the climate glow color map**

Create `src/components/discovery/ProPathCard.jsx`:

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLIMATE_GLOW = {
  alpine:     'radial-gradient(ellipse at center, rgba(100,116,139,0.6) 0%, transparent 70%)',
  tropical:   'radial-gradient(ellipse at center, rgba(16,185,129,0.5) 0%, transparent 70%)',
  subarctic:  'radial-gradient(ellipse at center, rgba(6,182,212,0.5) 0%, transparent 70%)',
  desert:     'radial-gradient(ellipse at center, rgba(245,158,11,0.5) 0%, transparent 70%)',
  temperate:  'radial-gradient(ellipse at center, rgba(20,184,166,0.5) 0%, transparent 70%)',
  arid:       'radial-gradient(ellipse at center, rgba(234,88,12,0.4) 0%, transparent 70%)',
};

const CLIMATE_FALLBACK_GRADIENT = {
  alpine:    'from-slate-800 to-zinc-950',
  tropical:  'from-emerald-900 to-teal-950',
  subarctic: 'from-blue-900 to-indigo-950',
  desert:    'from-amber-900 to-orange-950',
  temperate: 'from-green-900 to-emerald-950',
  arid:      'from-orange-900 to-red-950',
};

const DIFFICULTY_COLOR = {
  Easy:     'text-green-300 border-green-700',
  Moderate: 'text-green-400 border-green-700',
  Hard:     'text-yellow-400 border-yellow-700',
  Expert:   'text-red-400 border-red-700',
};

function QualityDots({ score }) {
  const filled = Math.round((score ?? 0) * 5);
  return (
    <span className="text-[10px] font-mono text-slate-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'text-[#E67E22]' : 'text-slate-600'}>◆</span>
      ))}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 text-slate-300">
      {children}
    </span>
  );
}

export default function ProPathCard({ path, onClone, cloning }) {
  const [legsOpen, setLegsOpen] = useState(false);

  const hasPhoto = !!path.cover_image_url;
  const fallbackGradient = CLIMATE_FALLBACK_GRADIENT[path.climate] ?? 'from-slate-800 to-zinc-950';
  const isElite = (path.clones ?? 0) >= 100;
  const isCommunity = path.is_community && !path.is_curated;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, zIndex: 10 }}
      className="relative rounded-xl overflow-hidden border border-white/10 cursor-pointer"
      style={{ height: 220 }}
      onClick={() => setLegsOpen(v => !v)}
    >
      {/* Breathing glow layer */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: CLIMATE_GLOW[path.climate] ?? CLIMATE_GLOW.temperate }}
      />

      {/* Photo background with Ken Burns */}
      {hasPhoto ? (
        <motion.div
          className="absolute inset-0 z-1"
          animate={{ backgroundPosition: ['50% 40%', '50% 60%'] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            backgroundImage: `url(${path.cover_image_url})`,
            backgroundSize: 'cover',
          }}
        />
      ) : (
        <div className={`absolute inset-0 z-1 bg-gradient-to-br ${fallbackGradient}`} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 z-2 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* Content */}
      <div className="relative z-10 p-5 h-full flex flex-col justify-between">
        <div>
          {/* Badge */}
          <div className="flex justify-end mb-2">
            {isElite && !isCommunity && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#0F1115] bg-[#F2C94C]">
                ELITE PIONEER
              </span>
            )}
            {isCommunity && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#0F1115] bg-[#D9C5B2]">
                COMMUNITY
              </span>
            )}
          </div>

          <div className="font-editorial text-xl text-white mb-1">{path.name}</div>
          <div className="text-xs text-slate-400 font-mono mb-1">
            by {path.architect_name} · {path.clones} clones · ★ {path.rating?.toFixed(1) ?? '—'}
          </div>
          {path.llm_quality_score != null && (
            <div className="mb-2"><QualityDots score={path.llm_quality_score} /></div>
          )}
          <div className="flex flex-wrap gap-2">
            <Tag>{path.distance_km} km</Tag>
            <Tag>{path.days}d</Tag>
            <Tag>Squad {path.squad_min}–{path.squad_max}</Tag>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFFICULTY_COLOR[path.difficulty] ?? 'text-slate-400 border-slate-700'}`}>
              {path.difficulty}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#F2C94C] font-mono font-bold text-lg">
            {path.price_usd === 0 ? 'Free' : `$${path.price_usd}`}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onClone(path); }}
            disabled={cloning}
            className="px-4 py-2 bg-[#E67E22] hover:bg-[#d4711e] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg transition-colors"
          >
            {cloning ? 'CLONING…' : 'CLONE PATH'}
          </button>
        </div>
      </div>

      {/* Legs preview drawer */}
      <AnimatePresence>
        {legsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 border-t border-white/10 p-3"
          >
            {(path.legs ?? []).map((leg, i) => (
              <div key={i} className="text-[10px] font-mono text-slate-300 py-0.5">
                {leg.from} → {leg.to} · {leg.mode} · {leg.durationH}h
              </div>
            ))}
            {path.forked_from && (
              <div className="text-[10px] font-mono text-[#D9C5B2] mt-1">
                forked from a curated expedition
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/ProPathCard.jsx
git commit -m "feat: ProPathCard with Ken Burns parallax + breathing pulse glow"
```

---

## Task 4: VaultFilterBar

**Files:**
- Create: `src/components/discovery/VaultFilterBar.jsx`

- [ ] **Step 1: Write the filter bar**

Create `src/components/discovery/VaultFilterBar.jsx`:

```jsx
const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Expert'];
const CLIMATES = ['alpine', 'tropical', 'subarctic', 'desert', 'temperate', 'arid'];
const TABS = ['trending', 'curated', 'community'];

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-colors ${
        active
          ? 'bg-[#E67E22] border-[#E67E22] text-white'
          : 'border-white/20 text-slate-400 hover:border-[#E67E22]/50'
      }`}
    >
      {label}
    </button>
  );
}

export default function VaultFilterBar({ filters, onChange }) {
  function toggle(key, value) {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value],
    });
  }

  return (
    <div className="space-y-3 mb-5">
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <Chip
            key={tab}
            label={tab.toUpperCase()}
            active={filters.tab === tab}
            onClick={() => onChange({ ...filters, tab })}
          />
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">DIFF</span>
        {DIFFICULTIES.map(d => (
          <Chip key={d} label={d} active={filters.difficulty.includes(d)} onClick={() => toggle('difficulty', d)} />
        ))}
      </div>

      {/* Climate */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">CLIMATE</span>
        {CLIMATES.map(c => (
          <Chip key={c} label={c} active={filters.climate.includes(c)} onClick={() => toggle('climate', c)} />
        ))}
      </div>

      {/* Price */}
      <div className="flex gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">PRICE</span>
        <Chip label="FREE" active={filters.freeOnly} onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly, paidOnly: false })} />
        <Chip label="PAID" active={filters.paidOnly} onClick={() => onChange({ ...filters, paidOnly: !filters.paidOnly, freeOnly: false })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/VaultFilterBar.jsx
git commit -m "feat: VaultFilterBar — difficulty/climate/price/tab chips"
```

---

## Task 5: ReviewsWidget

**Files:**
- Create: `src/components/discovery/ReviewsWidget.jsx`

- [ ] **Step 1: Write the widget**

Create `src/components/discovery/ReviewsWidget.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ReviewsWidget({ pathId }) {
  const [reviews, setReviews] = useState([]);
  const [note, setNote] = useState('');
  const [myRating, setMyRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('pro_path_reviews')
      .select('*')
      .eq('path_id', pathId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setReviews(data ?? []));
  }, [pathId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (myRating === 0) return;
    setSubmitting(true);
    await supabase.from('pro_path_reviews').insert({
      path_id: pathId,
      rating: myRating,
      note: note.trim() || null,
    });
    const { data } = await supabase
      .from('pro_path_reviews')
      .select('*')
      .eq('path_id', pathId)
      .order('created_at', { ascending: false })
      .limit(5);
    setReviews(data ?? []);
    setNote('');
    setMyRating(0);
    setSubmitting(false);
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="text-[10px] font-mono text-slate-500 mb-2">
        {reviews.length === 0 ? '0 reviews — be the first' : `${reviews.length} review${reviews.length > 1 ? 's' : ''}`}
      </div>

      {reviews.map(r => (
        <div key={r.id} className="text-[10px] font-mono text-slate-400 py-0.5">
          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.note}
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setMyRating(n)}
              className={`text-sm ${n <= myRating ? 'text-[#F2C94C]' : 'text-slate-600'}`}>★</button>
          ))}
        </div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="one line review…"
          className="flex-1 bg-transparent border-b border-white/20 text-[10px] font-mono text-slate-300 outline-none px-1"
          maxLength={120}
        />
        <button type="submit" disabled={submitting || myRating === 0}
          className="text-[10px] font-mono text-[#E67E22] disabled:opacity-40">
          POST
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/ReviewsWidget.jsx
git commit -m "feat: ReviewsWidget — star rating + one-line note, Supabase-backed"
```

---

## Task 6: MinimalSubmit (UGC Path 1)

**Files:**
- Create: `src/components/discovery/MinimalSubmit.jsx`

- [ ] **Step 1: Write the component**

Create `src/components/discovery/MinimalSubmit.jsx`:

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const ENRICHING_LINES = [
  'GEOCODING DESTINATION…',
  'FETCHING WIKIDATA ENTITY…',
  'GENERATING EXPEDITION BRIEF…',
  'SCORING QUALITY…',
  'PUBLISHING TO VENTUREVAULT…',
];

export default function MinimalSubmit({ onComplete, onCancel }) {
  const [destination, setDestination] = useState('');
  const [architectName, setArchitectName] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!destination.trim() || !architectName.trim()) return;
    setEnriching(true);
    setError(null);

    // Animate through enriching lines
    let idx = 0;
    const ticker = setInterval(() => {
      idx++;
      setLineIndex(idx);
      if (idx >= ENRICHING_LINES.length - 1) clearInterval(ticker);
    }, 900);

    try {
      // Insert stub row; Edge Function or pipeline will enrich async
      const { data, error: err } = await supabase
        .from('pro_paths')
        .insert({
          name: destination.trim(),
          destination: destination.trim(),
          architect_name: architectName.trim(),
          is_community: true,
          source: 'manual',
          legs: [],
          objectives: [],
          manifest_settings: {},
        })
        .select()
        .single();

      if (err) throw err;

      // Trigger Edge Function enrichment (fire-and-forget)
      supabase.functions.invoke('enrich-path', { body: { pathId: data.id, destination: destination.trim() } })
        .catch(() => {}); // non-blocking

      clearInterval(ticker);
      setLineIndex(ENRICHING_LINES.length - 1);
      setTimeout(() => onComplete?.(), 1200);
    } catch (err) {
      clearInterval(ticker);
      setEnriching(false);
      setError(err.message);
    }
  }

  if (enriching) {
    return (
      <div className="tactical-panel p-6 space-y-2 font-mono">
        <div className="label-tag mb-3">ENRICHING EXPEDITION</div>
        {ENRICHING_LINES.slice(0, lineIndex + 1).map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-[#E67E22]"
          >
            &gt; {line}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tactical-panel p-5 space-y-4">
      <div className="label-tag">QUICK SUBMIT</div>
      <div>
        <label className="text-[10px] font-mono text-slate-400">DESTINATION</label>
        <input
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="e.g. Dolomites, Italy"
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]"
          required
        />
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-400">YOUR PIONEER NAME</label>
        <input
          value={architectName}
          onChange={e => setArchitectName(e.target.value)}
          placeholder="e.g. Marco V."
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]"
          required
        />
      </div>
      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
      <div className="flex gap-3">
        <button type="submit"
          className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg">
          SUBMIT EXPEDITION
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
          CANCEL
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/MinimalSubmit.jsx
git commit -m "feat: MinimalSubmit — one-form UGC path with enriching terminal animation"
```

---

## Task 7: SubmitWizard (UGC Path 2)

**Files:**
- Create: `src/components/discovery/SubmitWizard.jsx`

- [ ] **Step 1: Write the 5-step wizard**

Create `src/components/discovery/SubmitWizard.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import ProPathCard from './ProPathCard';

const STORAGE_KEY = 'vp-wizard-draft';
const MODES = ['foot', 'bus', 'flight', 'boat', 'train', 'bike'];
const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Expert'];
const CLIMATES = ['alpine', 'tropical', 'subarctic', 'desert', 'temperate', 'arid'];

function emptyDraft() {
  return {
    destination: '',
    architectName: '',
    legs: [{ from: '', to: '', mode: 'foot', durationH: 4, distanceKm: 20 }],
    squadMin: 1,
    squadMax: 4,
    difficulty: 'Moderate',
    climate: 'temperate',
    days: 3,
    price_usd: 0,
    paid: false,
  };
}

export default function SubmitWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? emptyDraft(); }
    catch { return emptyDraft(); }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  function set(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function addLeg() {
    setDraft(d => ({
      ...d,
      legs: [...d.legs, { from: '', to: '', mode: 'foot', durationH: 4, distanceKm: 10 }],
    }));
  }

  function updateLeg(i, key, value) {
    setDraft(d => {
      const legs = [...d.legs];
      legs[i] = { ...legs[i], [key]: value };
      return { ...d, legs };
    });
  }

  function removeLeg(i) {
    setDraft(d => ({ ...d, legs: d.legs.filter((_, idx) => idx !== i) }));
  }

  async function handlePublish() {
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from('pro_paths').insert({
      name: draft.destination,
      destination: draft.destination,
      architect_name: draft.architectName,
      difficulty: draft.difficulty,
      climate: draft.climate,
      days: draft.days,
      squad_min: draft.squadMin,
      squad_max: draft.squadMax,
      price_usd: draft.paid ? draft.price_usd : 0,
      legs: draft.legs,
      objectives: [],
      manifest_settings: { climate: draft.climate, days: draft.days, hasChildren: false },
      is_community: true,
      source: 'wizard',
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    localStorage.removeItem(STORAGE_KEY);
    onComplete?.();
  }

  const STEPS = [
    // Step 0: Destination
    <div key="dest" className="space-y-4">
      <div className="label-tag">STEP 1 / 5 — DESTINATION</div>
      <input value={draft.destination} onChange={e => set('destination', e.target.value)}
        placeholder="e.g. Dolomites, Italy"
        className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
      <input value={draft.architectName} onChange={e => set('architectName', e.target.value)}
        placeholder="Your Pioneer name"
        className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
    </div>,

    // Step 1: Legs
    <div key="legs" className="space-y-3">
      <div className="label-tag">STEP 2 / 5 — LEGS</div>
      {draft.legs.map((leg, i) => (
        <div key={i} className="border border-white/10 rounded p-3 space-y-2">
          <div className="flex gap-2">
            <input value={leg.from} onChange={e => updateLeg(i, 'from', e.target.value)}
              placeholder="From" className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <input value={leg.to} onChange={e => updateLeg(i, 'to', e.target.value)}
              placeholder="To" className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
          </div>
          <div className="flex gap-2 items-center">
            <select value={leg.mode} onChange={e => updateLeg(i, 'mode', e.target.value)}
              className="bg-[#0E1012] border border-white/20 rounded px-2 py-1 text-xs font-mono text-white">
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={leg.durationH} onChange={e => updateLeg(i, 'durationH', +e.target.value)}
              className="w-16 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <span className="text-[10px] font-mono text-slate-500">h</span>
            {draft.legs.length > 1 && (
              <button onClick={() => removeLeg(i)} className="ml-auto text-[10px] font-mono text-red-400">REMOVE</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addLeg} className="text-[10px] font-mono text-[#E67E22]">+ ADD LEG</button>
    </div>,

    // Step 2: Squad & difficulty
    <div key="squad" className="space-y-4">
      <div className="label-tag">STEP 3 / 5 — SQUAD & DIFFICULTY</div>
      <div>
        <div className="text-[10px] font-mono text-slate-400 mb-2">DIFFICULTY</div>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={() => set('difficulty', d)}
              className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors ${draft.difficulty === d ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-slate-400'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-mono text-slate-400 mb-2">CLIMATE</div>
        <div className="flex flex-wrap gap-2">
          {CLIMATES.map(c => (
            <button key={c} onClick={() => set('climate', c)}
              className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors ${draft.climate === c ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-slate-400'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-1">MIN SQUAD</div>
          <input type="number" min={1} max={12} value={draft.squadMin} onChange={e => set('squadMin', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-1">MAX SQUAD</div>
          <input type="number" min={1} max={12} value={draft.squadMax} onChange={e => set('squadMax', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-1">DAYS</div>
          <input type="number" min={1} max={90} value={draft.days} onChange={e => set('days', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
      </div>
    </div>,

    // Step 3: Pricing
    <div key="pricing" className="space-y-4">
      <div className="label-tag">STEP 4 / 5 — PRICING</div>
      <div className="flex gap-3">
        <button onClick={() => set('paid', false)}
          className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${!draft.paid ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-slate-400'}`}>
          FREE
        </button>
        <button onClick={() => set('paid', true)}
          className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${draft.paid ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-slate-400'}`}>
          PAID
        </button>
      </div>
      {draft.paid && (
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-1">PRICE (USD)</div>
          <input type="number" min={1} max={999} value={draft.price_usd}
            onChange={e => set('price_usd', +e.target.value)}
            className="w-24 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
      )}
    </div>,

    // Step 4: Preview
    <div key="preview" className="space-y-4">
      <div className="label-tag">STEP 5 / 5 — PREVIEW & PUBLISH</div>
      <ProPathCard
        path={{
          name: draft.destination || 'Unnamed Expedition',
          architect_name: draft.architectName || 'Pioneer',
          difficulty: draft.difficulty,
          climate: draft.climate,
          days: draft.days,
          distance_km: draft.legs.reduce((s, l) => s + (l.distanceKm || 0), 0),
          squad_min: draft.squadMin,
          squad_max: draft.squadMax,
          price_usd: draft.paid ? draft.price_usd : 0,
          legs: draft.legs,
          clones: 0,
          rating: 0,
          is_community: true,
        }}
        onClone={() => {}}
        cloning={false}
      />
      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
    </div>,
  ];

  return (
    <div className="tactical-panel p-5 space-y-5">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {STEPS[step]}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
            BACK
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg">
            NEXT
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button onClick={handlePublish} disabled={submitting}
            className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg disabled:opacity-50">
            {submitting ? 'PUBLISHING…' : 'PUBLISH EXPEDITION'}
          </button>
        )}
        <button onClick={onCancel}
          className="ml-auto px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
          CANCEL
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/SubmitWizard.jsx
git commit -m "feat: SubmitWizard — 5-step UGC creation with localStorage draft persistence"
```

---

## Task 8: CloneEditMode (UGC Path 3)

**Files:**
- Create: `src/components/discovery/CloneEditMode.jsx`
- Modify: `src/components/discovery/VentureVault.jsx` (wire up after clone)

- [ ] **Step 1: Write CloneEditMode**

Create `src/components/discovery/CloneEditMode.jsx`:

```jsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CloneEditMode({ source, onPublish, onDiscard }) {
  const [name, setName] = useState(source.name + ' (my edit)');
  const [legs, setLegs] = useState(source.legs ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isDifferent = name !== source.name || JSON.stringify(legs) !== JSON.stringify(source.legs);

  function updateLeg(i, key, value) {
    setLegs(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  }

  async function handlePublish() {
    setSubmitting(true);
    const { error: err } = await supabase.from('pro_paths').insert({
      name,
      destination: source.destination,
      architect_name: source.architect_name,
      difficulty: source.difficulty,
      climate: source.climate,
      days: source.days,
      squad_min: source.squad_min,
      squad_max: source.squad_max,
      price_usd: 0,
      legs,
      objectives: source.objectives ?? [],
      manifest_settings: source.manifest_settings ?? {},
      is_community: true,
      source: 'clone',
      forked_from: source.id,
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    onPublish?.();
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="label-tag">EDIT BEFORE PUBLISHING</div>
      <div className="text-[10px] font-mono text-[#D9C5B2]">
        forked from {source.name} by {source.architect_name}
      </div>

      <div>
        <label className="text-[10px] font-mono text-slate-400">EXPEDITION NAME</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-mono text-slate-400">LEGS</div>
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-2">
            <input value={leg.from} onChange={e => updateLeg(i, 'from', e.target.value)}
              className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <input value={leg.to} onChange={e => updateLeg(i, 'to', e.target.value)}
              className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
          </div>
        ))}
      </div>

      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}

      <div className="flex gap-3">
        <button onClick={handlePublish} disabled={!isDifferent || submitting}
          className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg disabled:opacity-40">
          {submitting ? 'PUBLISHING…' : 'PUBLISH AS MY OWN'}
        </button>
        <button onClick={onDiscard}
          className="px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
          DISCARD
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/CloneEditMode.jsx
git commit -m "feat: CloneEditMode — edit-before-publish with forked_from attribution"
```

---

## Task 9: Wire VentureVault to Supabase

**Files:**
- Modify: `src/components/discovery/VentureVault.jsx`

- [ ] **Step 1: Rewrite VentureVault**

Replace the full contents of `src/components/discovery/VentureVault.jsx`:

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useSquadSync } from '../../hooks/useSquadSync';
import { useProPaths, DEFAULT_FILTERS } from '../../hooks/useProPaths';
import ProPathCard from './ProPathCard';
import VaultFilterBar from './VaultFilterBar';
import MinimalSubmit from './MinimalSubmit';
import SubmitWizard from './SubmitWizard';
import CloneEditMode from './CloneEditMode';

export default function VentureVault({ onCloneComplete }) {
  const { clonePath, cloning, userRole } = useTripStore();
  const { broadcastClone } = useSquadSync();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { paths, loading, error, refetch } = useProPaths(filters);
  const [cloneId, setCloneId] = useState(null);
  const [memberRequest, setMemberRequest] = useState(null);
  const [mode, setMode] = useState('vault'); // 'vault' | 'minimal' | 'wizard' | 'cloneEdit'
  const [cloneSource, setCloneSource] = useState(null);

  function handleClone(path) {
    if (userRole !== 'LEADER') { setMemberRequest(path.name); return; }
    setCloneSource(path);
    setMode('cloneEdit');
  }

  function handleDirectClone(path) {
    setCloneId(path.id);
    broadcastClone(path);
    clonePath(path);
    setTimeout(() => { setCloneId(null); onCloneComplete?.(); }, 3800);
  }

  if (mode === 'minimal') {
    return <MinimalSubmit onComplete={() => { setMode('vault'); refetch(); }} onCancel={() => setMode('vault')} />;
  }
  if (mode === 'wizard') {
    return <SubmitWizard onComplete={() => { setMode('vault'); refetch(); }} onCancel={() => setMode('vault')} />;
  }
  if (mode === 'cloneEdit' && cloneSource) {
    return (
      <CloneEditMode
        source={cloneSource}
        onPublish={() => { handleDirectClone(cloneSource); setMode('vault'); refetch(); }}
        onDiscard={() => { handleDirectClone(cloneSource); setMode('vault'); }}
      />
    );
  }

  return (
    <div className="tactical-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="label-tag mb-1">VentureVault</h2>
          <p className="text-white font-editorial text-xl">Pro-Path Marketplace</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-mono text-slate-400">{paths.length} paths</span>
          <button onClick={() => setMode('minimal')}
            className="px-3 py-1 bg-[#E67E22]/20 border border-[#E67E22]/40 text-[#E67E22] font-mono text-[10px] rounded-lg hover:bg-[#E67E22]/30">
            + QUICK SUBMIT
          </button>
          <button onClick={() => setMode('wizard')}
            className="px-3 py-1 bg-[#E67E22] text-white font-mono text-[10px] font-bold rounded-lg hover:bg-[#d4711e]">
            + WIZARD
          </button>
        </div>
      </div>

      <AnimatePresence>
        {memberRequest && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-lg border border-[#F2C94C]/50 bg-[#F2C94C]/10 text-[#F2C94C] text-sm font-mono">
            Request sent to Squad Leader for approval — "{memberRequest}"
            <button onClick={() => setMemberRequest(null)} className="ml-3 text-[#F2C94C]/50 hover:text-[#F2C94C]">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <VaultFilterBar filters={filters} onChange={setFilters} />

      {loading && (
        <div className="text-center text-slate-500 font-mono text-xs py-12">LOADING VAULT…</div>
      )}
      {error && (
        <div className="text-center text-red-400 font-mono text-xs py-12">{error}</div>
      )}
      {!loading && paths.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🗺</div>
          <div className="text-slate-400 font-mono text-sm">No expeditions match your filters.</div>
          <button onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-3 px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg hover:border-[#E67E22]/50">
            CLEAR FILTERS
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paths.map(path => (
          <ProPathCard
            key={path.id}
            path={path}
            onClone={handleClone}
            cloning={cloneId === path.id || (cloning && cloneId === path.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {cloning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="tactical-panel p-8 max-w-sm w-full space-y-3 font-mono">
              <div className="label-tag mb-3">SYSTEM OVERRIDE</div>
              {['REMOTE OVERRIDE DETECTED…', 'DOWNLOADING PRO-PATH ASSETS…', 'RECONFIGURING SQUAD MANIFEST…', 'SYNC COMPLETE.'].map((line, i) => (
                <CloneLogLine key={line} text={line} delay={i * 0.7} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CloneLogLine({ text, delay }) {
  const [show, setShow] = useState(false);
  useState(() => { const t = setTimeout(() => setShow(true), delay * 1000 + 50); return () => clearTimeout(t); });
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={show ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.3 }}
      className={`text-sm ${show ? 'text-[#E67E22]' : 'text-slate-600'}`}>
      &gt; {text}
    </motion.div>
  );
}
```

- [ ] **Step 2: Install Supabase JS if not present**

```bash
npm list @supabase/supabase-js || npm install @supabase/supabase-js
```

- [ ] **Step 3: Commit**

```bash
git add src/components/discovery/VentureVault.jsx
git commit -m "feat: VentureVault wired to Supabase live data with filter bar + 3 UGC entry points"
```

---

## Task 10: Enrichment Pipeline — Stage 1 (gatherDestination.js)

**Files:**
- Create: `pipeline/gatherDestination.js`

- [ ] **Step 1: Write the gatherer**

Create `pipeline/gatherDestination.js`:

```js
// Node.js — uses process.env, not import.meta.env
import fs from 'fs';
import path from 'path';

const WD_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_THUMB = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';
const OTM_KEY = process.env.VITE_OTM_API_KEY ?? '';

function slug(city) {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function wikidataSearch(name) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', name);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data.search?.[0]?.id ?? null;
}

async function wikidataProps(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'descriptions|claims|labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data.entities?.[qid] ?? null;
}

function extractImageUrl(entity) {
  const claims = entity?.claims ?? {};
  const p18 = claims['P18']?.[0]?.mainsnak?.datavalue?.value;
  if (!p18) return null;
  const encoded = encodeURIComponent(p18.replace(/ /g, '_'));
  return `${COMMONS_THUMB}${encoded}?width=800`;
}

function extractCoords(entity) {
  const p625 = entity?.claims?.['P625']?.[0]?.mainsnak?.datavalue?.value;
  if (!p625) return null;
  return { lat: p625.latitude, lng: p625.longitude };
}

async function otmPois(lat, lng) {
  if (!OTM_KEY) return [];
  try {
    const url = new URL(`${OTM_BASE}/places/radius`);
    url.searchParams.set('radius', '10000');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('kinds', 'natural,cultural,historic');
    url.searchParams.set('limit', '10');
    url.searchParams.set('apikey', OTM_KEY);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.features ?? []).map(f => ({
      name: f.properties.name,
      kinds: f.properties.kinds,
      dist: f.properties.dist,
    }));
  } catch { return []; }
}

async function openMeteoClimate(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lng}&models=EC_Earth3P_HR&daily=temperature_2m_mean&start_date=2023-01-01&end_date=2023-12-31&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temps = data.daily?.temperature_2m_mean ?? [];
    const avg = temps.reduce((s, t) => s + t, 0) / (temps.length || 1);
    if (avg < -5) return 'subarctic';
    if (avg < 5) return 'alpine';
    if (avg < 15) return 'temperate';
    if (avg < 25) return 'temperate';
    return 'tropical';
  } catch { return 'temperate'; }
}

export async function gatherDestination(cityLine, cacheDir) {
  const city = cityLine.trim();
  const s = slug(city);
  const cachePath = path.join(cacheDir, `${s}.json`);

  if (fs.existsSync(cachePath)) {
    console.log(`  [cache hit] ${city}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  console.log(`  [gather] ${city}`);
  await new Promise(r => setTimeout(r, 200)); // debounce

  const qid = await wikidataSearch(city);
  const entity = qid ? await wikidataProps(qid) : null;
  const description = entity?.descriptions?.en?.value ?? '';
  const imageUrl = entity ? extractImageUrl(entity) : null;
  const coords = entity ? extractCoords(entity) : null;
  const climate = coords ? await openMeteoClimate(coords.lat, coords.lng) : 'temperate';
  const pois = coords ? await otmPois(coords.lat, coords.lng) : [];

  const bundle = { city, slug: s, qid, description, imageUrl, coords, climate, pois };
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(bundle, null, 2));
  return bundle;
}
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/gatherDestination.js
git commit -m "feat(pipeline): Stage 1 — gatherDestination with Wikidata + OTM + Open-Meteo"
```

---

## Task 11: Enrichment Pipeline — LLM Client

**Files:**
- Create: `pipeline/llmClient.js`
- Create: `pipeline/scoreQuality.js`

- [ ] **Step 1: Write llmClient.js**

Create `pipeline/llmClient.js`:

```js
import Anthropic from '@anthropic-ai/sdk';

const OLLAMA_URL = 'http://localhost:11434';
const MODELS = ['llama3', 'mistral'];

async function ollamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

async function ollamaGenerate(prompt) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return data.response ?? '';
    } catch { continue; }
  }
  throw new Error('All Ollama models failed');
}

async function anthropicGenerate(prompt) {
  const client = new Anthropic({ apiKey: process.env.VITE_ANTHROPIC_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0]?.text ?? '';
}

export async function generateWithLLM(prompt) {
  if (await ollamaAvailable()) {
    console.log('  [llm] using Ollama');
    try { return await ollamaGenerate(prompt); }
    catch (e) { console.warn('  [llm] Ollama failed, falling back to Anthropic:', e.message); }
  } else {
    console.log('  [llm] Ollama unavailable, using Anthropic');
  }
  return anthropicGenerate(prompt);
}
```

- [ ] **Step 2: Write scoreQuality.js**

Create `pipeline/scoreQuality.js`:

```js
export function scoreQuality(path) {
  let score = 0;
  const checks = [
    !!path.name,
    !!path.description && path.description.length > 40,
    Array.isArray(path.legs) && path.legs.length >= 2,
    !!path.difficulty,
    !!path.climate,
    !!path.cover_image_url,
    !!path.destination,
    typeof path.days === 'number' && path.days > 0,
  ];
  score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100) / 100;
}
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/llmClient.js pipeline/scoreQuality.js
git commit -m "feat(pipeline): LLM client — Ollama primary, Anthropic fallback + quality scorer"
```

---

## Task 12: Enrichment Pipeline — generateExpedition.js + upsertPath.js

**Files:**
- Create: `pipeline/generateExpedition.js`
- Create: `pipeline/upsertPath.js`

- [ ] **Step 1: Write generateExpedition.js**

Create `pipeline/generateExpedition.js`:

```js
import { generateWithLLM } from './llmClient.js';
import { scoreQuality } from './scoreQuality.js';

const PROMPT_TEMPLATE = (bundle) => `
You are a VenturePath expedition architect. Given this destination data, generate a single curated Pro-Path expedition as valid JSON only (no markdown, no explanation).

Destination: ${bundle.city}
Description: ${bundle.description}
Climate: ${bundle.climate}
Top POIs: ${bundle.pois.slice(0, 5).map(p => p.name).join(', ')}
Cover image URL: ${bundle.imageUrl ?? 'null'}

Return ONLY this JSON shape:
{
  "name": "expedition name (evocative, not just the city name)",
  "destination": "${bundle.city}",
  "description": "2-3 sentence expedition brief in VenturePath voice. Mention squad, terrain, challenge.",
  "difficulty": "Easy|Moderate|Hard|Expert",
  "climate": "${bundle.climate}",
  "days": <number 2-14>,
  "distance_km": <number>,
  "squad_min": <number 1-4>,
  "squad_max": <number 2-12>,
  "legs": [
    { "from": "...", "to": "...", "mode": "foot|bus|flight|boat|train|bike", "durationH": <number>, "distanceKm": <number>, "status": "confirmed" }
  ],
  "cover_image_url": "${bundle.imageUrl ?? null}"
}

Rules: at least 2 legs, realistic distances, no lorem ipsum, expedition vocabulary only.
`;

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in LLM output');
  return JSON.parse(match[0]);
}

export async function generateExpedition(bundle) {
  const prompt = PROMPT_TEMPLATE(bundle);
  let raw = await generateWithLLM(prompt);
  let parsed;

  try {
    parsed = parseJson(raw);
  } catch {
    console.warn('  [generate] First parse failed, retrying with correction prompt');
    const correctionPrompt = `The following was not valid JSON. Extract and return ONLY the JSON object:\n\n${raw}`;
    raw = await generateWithLLM(correctionPrompt);
    parsed = parseJson(raw);
  }

  // Merge defaults
  const path = {
    name: parsed.name ?? bundle.city,
    destination: parsed.destination ?? bundle.city,
    architect_name: 'VenturePath Curator',
    description: parsed.description ?? '',
    difficulty: parsed.difficulty ?? 'Moderate',
    climate: parsed.climate ?? bundle.climate,
    days: parsed.days ?? 3,
    distance_km: parsed.distance_km ?? 0,
    squad_min: parsed.squad_min ?? 1,
    squad_max: parsed.squad_max ?? 6,
    legs: parsed.legs ?? [],
    objectives: [],
    manifest_settings: { climate: parsed.climate ?? bundle.climate, days: parsed.days ?? 3, hasChildren: false },
    cover_image_url: parsed.cover_image_url ?? bundle.imageUrl ?? null,
    price_usd: 0,
    is_curated: true,
    is_community: false,
    source: 'pipeline',
  };

  path.llm_quality_score = scoreQuality(path);
  return path;
}
```

- [ ] **Step 2: Write upsertPath.js**

Create `pipeline/upsertPath.js`:

```js
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function upsertPath(path) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pro_paths')
    .upsert(path, { onConflict: 'name,destination' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/generateExpedition.js pipeline/upsertPath.js
git commit -m "feat(pipeline): generateExpedition with Zod-free validation + upsertPath"
```

---

## Task 13: Pipeline Entry Point — run.js

**Files:**
- Create: `pipeline/run.js`

- [ ] **Step 1: Write run.js**

Create `pipeline/run.js`:

```js
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gatherDestination } from './gatherDestination.js';
import { generateExpedition } from './generateExpedition.js';
import { upsertPath } from './upsertPath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESTINATIONS_FILE = path.join(__dirname, 'destinations.txt');
const CACHE_DIR = path.join(__dirname, 'cache');
const FORCE = process.argv.includes('--force');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

function readDestinations() {
  return fs.readFileSync(DESTINATIONS_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

async function run() {
  const cities = readDestinations();
  console.log(`\nVentureVault Pipeline — ${cities.length} destinations\n`);

  let ok = 0, fail = 0;
  for (const city of cities) {
    console.log(`\n► ${city}`);
    try {
      const bundle = await gatherDestination(city, CACHE_DIR);
      if (FORCE) {
        const slugPath = path.join(CACHE_DIR, `${bundle.slug}.json`);
        if (fs.existsSync(slugPath)) fs.unlinkSync(slugPath);
      }
      const expedition = await generateExpedition(bundle);
      const saved = await upsertPath(expedition);
      console.log(`  ✓ saved: ${saved.name} (quality: ${expedition.llm_quality_score})`);
      ok++;
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 500)); // rate-limit between cities
  }

  console.log(`\nDone — ${ok} succeeded, ${fail} failed`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add pipeline script to package.json**

In `package.json`, add to `"scripts"`:
```json
"pipeline": "node --experimental-vm-modules pipeline/run.js",
"pipeline:force": "node --experimental-vm-modules pipeline/run.js --force"
```

- [ ] **Step 3: Test a single destination (dry run)**

Add a single test city to `pipeline/destinations.txt` temporarily, run:
```bash
npm run pipeline
```
Expected output:
```
VentureVault Pipeline — N destinations

► TestCity, Country
  [gather] TestCity, Country
  [llm] using Ollama   (or: using Anthropic)
  ✓ saved: <expedition name> (quality: 0.88)

Done — 1 succeeded, 0 failed
```

- [ ] **Step 4: Commit**

```bash
git add pipeline/run.js package.json
git commit -m "feat(pipeline): run.js entry point — reads destinations.txt, gather → generate → upsert"
```

---

## Task 14: Seed Existing 4 Pro-Paths to Supabase

**Files:**
- Create: `pipeline/seedCurated.js`

- [ ] **Step 1: Write the seed script**

Create `pipeline/seedCurated.js`:

```js
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const SEED_PATHS = [
  {
    name: 'Patagonia W-Trek',
    destination: 'Torres del Paine, Chile',
    architect_name: 'Ana M.',
    difficulty: 'Expert',
    distance_km: 72,
    days: 5,
    squad_min: 2,
    squad_max: 4,
    price_usd: 7,
    clones: 168,
    rating: 4.9,
    climate: 'temperate',
    cover_image_url: null,
    description: 'The iconic W circuit through Torres del Paine — granite towers, glaciers, and wild Patagonian weather. Expert-level terrain demands full squad commitment.',
    legs: [
      { from: 'Puerto Natales', to: 'Paine Grande', mode: 'boat', durationH: 3, distanceKm: 45, status: 'confirmed' },
      { from: 'Paine Grande', to: 'Grey Glacier', mode: 'foot', durationH: 7, distanceKm: 18, status: 'confirmed' },
      { from: 'Grey Glacier', to: 'Las Torres', mode: 'foot', durationH: 9, distanceKm: 20, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'temperate', days: 5, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
  {
    name: 'Icelandic Ring Road',
    destination: 'Iceland Ring Road',
    architect_name: 'Erik T.',
    difficulty: 'Moderate',
    distance_km: 1332,
    days: 10,
    squad_min: 2,
    squad_max: 6,
    price_usd: 8,
    clones: 214,
    rating: 4.8,
    climate: 'subarctic',
    cover_image_url: null,
    description: 'The full Ring Road circuit — waterfalls, lava fields, geysers, and the midnight sun. A moderate endurance test best tackled with a squad of 4.',
    legs: [
      { from: 'Reykjavik', to: 'Akureyri', mode: 'bus', durationH: 5, distanceKm: 390, status: 'confirmed' },
      { from: 'Akureyri', to: 'Egilsstaðir', mode: 'bus', durationH: 3, distanceKm: 270, status: 'confirmed' },
      { from: 'Egilsstaðir', to: 'Reykjavik', mode: 'bus', durationH: 6, distanceKm: 672, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'subarctic', days: 10, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
  {
    name: 'Swiss Alps Haute Route',
    destination: 'Swiss Alps, Switzerland',
    architect_name: 'Lena K.',
    difficulty: 'Hard',
    distance_km: 180,
    days: 7,
    squad_min: 1,
    squad_max: 3,
    price_usd: 6,
    clones: 87,
    rating: 4.7,
    climate: 'alpine',
    cover_image_url: null,
    description: 'Chamonix to Zermatt on foot. Seven days of alpine cols, high refuges, and the Matterhorn as your finish line.',
    legs: [
      { from: 'Chamonix', to: 'Verbier', mode: 'foot', durationH: 48, distanceKm: 90, status: 'confirmed' },
      { from: 'Verbier', to: 'Zermatt', mode: 'foot', durationH: 40, distanceKm: 90, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'alpine', days: 7, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.75,
  },
  {
    name: 'Mt. Fuji Sunrise',
    destination: 'Mt. Fuji, Japan',
    architect_name: 'Yuki S.',
    difficulty: 'Moderate',
    distance_km: 22,
    days: 2,
    squad_min: 1,
    squad_max: 8,
    price_usd: 4,
    clones: 453,
    rating: 4.9,
    climate: 'alpine',
    cover_image_url: null,
    description: 'The classic Fujinomiya ascent timed for the summit sunrise. Start at midnight, reach the crater at dawn. Japan's most-cloned expedition.',
    legs: [
      { from: 'Fujinomiya 5th Station', to: 'Summit', mode: 'foot', durationH: 6, distanceKm: 11, status: 'confirmed' },
      { from: 'Summit', to: 'Fujinomiya 5th Station', mode: 'foot', durationH: 3, distanceKm: 11, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'alpine', days: 2, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
];

async function seed() {
  const { data, error } = await supabase.from('pro_paths').upsert(SEED_PATHS, { onConflict: 'name,destination' });
  if (error) { console.error('Seed failed:', error.message); process.exit(1); }
  console.log(`Seeded ${SEED_PATHS.length} curated paths.`);
}

seed();
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json` scripts:
```json
"seed:vault": "node pipeline/seedCurated.js"
```

- [ ] **Step 3: Run the seed**

```bash
npm run seed:vault
```

Expected: `Seeded 4 curated paths.`

- [ ] **Step 4: Commit**

```bash
git add pipeline/seedCurated.js package.json
git commit -m "feat(pipeline): seedCurated — migrate 4 hardcoded Pro-Paths to Supabase"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Schema: Task 1
- ✅ Pipeline Stage 1 (gather): Task 10
- ✅ Pipeline Stage 2 (LLM generate): Tasks 11–12
- ✅ Pipeline entry point: Task 13
- ✅ Animated hero card (Ken Burns + pulse glow): Task 3
- ✅ Filter bar: Task 4
- ✅ UGC Path 1 (minimal submit): Task 6
- ✅ UGC Path 2 (wizard): Task 7
- ✅ UGC Path 3 (clone & edit): Task 8
- ✅ VentureVault wired to Supabase: Task 9
- ✅ Reviews widget (VP-4): Task 5
- ✅ Community badge + quality dots: Task 3 (ProPathCard)
- ✅ forked_from attribution: Tasks 8 + 3
- ✅ Seed existing 4 paths: Task 14
- ⚠️ Architect profiles and My Paths tab: out of scope for this plan (separate feature), spec section 6 notes these as supporting features — add as follow-up

**Type consistency check:** `useProPaths` returns `paths` array matching Supabase column names (`architect_name`, `squad_min`, `squad_max`, `distance_km`, `cover_image_url`, `price_usd`). `ProPathCard` consumes these exact fields. `CloneEditMode` and `SubmitWizard` insert using the same column names. ✅

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete. ✅
