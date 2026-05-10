# VenturePath — Sentinel Triggers, Architect AI, After-Action Design
**Date:** 2026-05-10
**Scope:** Three interconnected systems that complete the VenturePath mission lifecycle

---

## Overview

These three systems form a lifecycle loop:

```
Live hazards (Sentinel) → passive insight cards (Architect) → post-trip settlement + publish (After-Action)
```

They share a single internal event model (`VentureEvent`) so that any system can react to changes in any other.

---

## 1. Shared Event Bus (`sentinelBus.js`)

### Purpose
A lightweight pub/sub module that decouples hazard sources from the modules that react to them. No component needs to import another — they all talk through the bus.

### API
```js
// publish
sentinelBus.emit(eventType, payload)

// subscribe (returns unsubscribe fn)
const unsub = sentinelBus.on(eventType, handler)
```

### Event Types
| Event | Payload | Emitted by |
|---|---|---|
| `HAZARD_UPDATED` | `{ hazards: Hazard[] }` | weatherEngine, safetyEngine |
| `STOP_ADDED` | `{ stop, legIndex }` | StopEditor |
| `STOP_CONFIRMED` | `{ stop, legIndex }` | LedgerWorkbench |
| `PACK_ITEM_MISSING` | `{ itemLabel, category }` | packingLogic |
| `BUDGET_THRESHOLD` | `{ category, spent, limit }` | budgetEngine |
| `DEPARTURE_IMMINENT` | `{ hoursUntil, leg }` | TripStore (date watcher) |
| `SQUAD_WEIGHT_CHANGED` | `{ memberId, newKg, overLimit }` | SquadGearContext |

### Implementation Notes
- Plain JS module, no React dependency — safe to import from engines and contexts alike
- Listeners are stored in a `Map<eventType, Set<handler>>`
- `emit` is synchronous — handlers fire immediately
- No persistence — bus is session-lifetime only

---

## 2. Sentinel Cross-Module Triggers

### Purpose
When a hazard is detected, it automatically updates three downstream modules: PackingManifest (item criticality), LedgerWorkbench (stop risk flags), and BudgetLoom (insurance highlight).

### Hazard Sources

**Real weather (free tier OpenWeatherMap):**
- Current conditions: `api.openweathermap.org/data/2.5/weather` (free, ~1 call per destination load)
- 5-day forecast: `api.openweathermap.org/data/2.5/forecast` (free, called once on trip load)
- New env var: `VITE_OWM_API_KEY`
- Weather types mapped to hazard severity: wind >50km/h → `HIGH_WINDS` (red), rain >10mm → `HEAVY_RAIN` (amber), etc.

**Mock (unchanged) for:** Trail, Wildlife, Medical, Flood hazards — still served by `safetyEngine.js`

**New file: `src/utils/weatherHazardMapper.js`**
```js
// Maps OWM response → normalized Hazard objects
// { id, type, severity, label, affectedGearTags, affectedStopTypes }
```

### Downstream Reactions

**PackingManifest — item elevation to CRITICAL**
- Subscribes to `HAZARD_UPDATED`
- Maps `hazard.affectedGearTags` → marks matching items as `critical: true`
- Example: `HIGH_WINDS` → tags `['hardshell', 'tent_stakes', 'guy_lines']` → those items move to top of list with red CRITICAL badge
- Gear tag library lives in `packingLogic.js` alongside existing climate logic

**LedgerWorkbench — stop risk flagging**
- Subscribes to `HAZARD_UPDATED`
- Maps `hazard.affectedStopTypes` (e.g. `['summit', 'exposed_ridge', 'coastal']`) against each stop's `type` field
- Matching stops get a `riskLevel: 'HIGH' | 'MEDIUM'` badge and a suggested delay ("+4h delay recommended")
- A "Plan B" link appears if the stop has an `altStopId` in its metadata (future: user can set this in StopEditor)

**BudgetLoom — insurance highlight**
- Subscribes to `HAZARD_UPDATED`
- If any hazard is `severity: 'red'` and no "Travel Insurance" line item exists in the ledger → renders a highlighted callout: "Active weather alert — check your cancellation coverage"
- Tapping it opens the FlightScout `EmergencyRebook` panel

### New field on Stop objects
```js
{
  // existing fields ...
  type: 'summit' | 'coastal' | 'urban' | 'transit' | 'camp' | 'viewpoint',
  altStopId: string | null,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',  // computed, not stored
}
```
`riskLevel` is derived on render from bus state — never persisted, always fresh.

---

## 3. Architect AI — Passive Insight Cards

### Purpose
The Architect observes state changes via the event bus and injects `InsightCard` components inline within relevant tabs. Cards feel like a thoughtful co-pilot, not a notification system.

### InsightCard Component (`src/components/ui/InsightCard.jsx`)
```
┌─────────────────────────────────────────┐
│ ⬡ ARCHITECT                    [×]      │
│ Scout added a 20km hike.                │
│ Medic's pack weight will increase ~15%. │
│ [Reassign gear]                         │
└─────────────────────────────────────────┘
```
- Dismissible (stored in session, not persisted — reappears next load if condition still true)
- Optional CTA button that deep-links into the relevant panel (Reassign gear → SquadGearContext panel)
- Styled in the active theme (default: warm parchment card; tactical: amber bordered panel)
- Stacks vertically — max 3 visible at once, oldest auto-dismissed

### Insight Generation (`src/utils/architectEngine.js`)

New file. Pure functions — no API calls for most insights. Anthropic API called only for insights that require language generation (pre-event reminders with specific item names).

**Rule-based insights (no API, instant):**

| Trigger event | Insight |
|---|---|
| `STOP_ADDED` with type `summit` or `hike` | "Long hike detected — water bottles not in manifest" (checks packingLogic) |
| `SQUAD_WEIGHT_CHANGED` overLimit=true | "Medic is over max carry weight. Reassign 2 items to balance the squad." |
| `HAZARD_UPDATED` HIGH_WINDS | "High winds forecast — Hard Shell Jacket moved to CRITICAL" |
| `BUDGET_THRESHOLD` >90% | "Budget at 92%. Hotel upgrade would require skipping the rental car tomorrow." |
| `PACK_ITEM_MISSING` for water/powerbank/firstaid | "Reminder: [item] not packed for [next leg name]." |

**Anthropic-generated insights (called sparingly — only for pre-event reminders):**
- Trigger: `DEPARTURE_IMMINENT` (≤24h before a leg)
- Input to Claude: leg details, current manifest, current hazards, squad roles
- Output: 2-3 sentence natural pre-departure brief
- Model: `claude-haiku-4-5-20251001` (fast, cheap)
- Cached per leg — only generated once, stored in sessionStorage

**Pre-event reminder examples (Anthropic-generated):**
- "Tomorrow: Summit Push at 06:00. Forecast shows 60km/h gusts. Your manifest is missing a hard shell jacket and hand warmers."
- "Departure in 4 hours. Medic hasn't confirmed the trauma kit is packed. Scout: power bank not stowed."

### Placement
- Insights targeting **gear** appear at the top of the PackingManifest tab
- Insights targeting **stops/itinerary** appear at the top of LedgerWorkbench
- Insights targeting **budget** appear inline in BudgetLoom above the total row
- All insights also mirror into PioneerChat LOGS stream (as `type: 'architect'` messages) so the squad can see them

### Architect state slice (added to TripStore)
```js
architect: {
  insights: [{ id, type, message, cta, targetTab, dismissedAt }],
  lastGeneratedAt: timestamp,
}
```

---

## 4. After-Action State & UI

### State Change
Add `'AFTER-ACTION'` to the `trip.status` enum in `useTripStore.jsx`.

Transition trigger: user manually taps "Complete Expedition" button on the Overview tab (only visible when all legs have `status: 'confirmed'`). This is intentional — no auto-transition.

### After-Action Screen (`src/components/afteraction/AfterActionScreen.jsx`)

Two sequential phases rendered as a stepped UI (not tabs — steps enforce order):

**Phase 1 — Settle**

Expense settlement between squad members.

```
┌─ EXPEDITION DEBRIEF ──────────────────────┐
│ Total Spent: $1,840                        │
│ Split: 3 members                           │
│                                            │
│ lead    paid $920   owed $613  → +$307     │
│ scout   paid $480   owed $613  → -$133     │
│ medic   paid $440   owed $613  → -$173     │
│                                            │
│ [Copy settlement to chat]  [Export CSV]    │
└────────────────────────────────────────────┘
```

- Reads from `BudgetLoom` expense log (already stored in context)
- Equal split by default; toggle for custom weight per member
- "Copy to chat" emits the settlement summary into PioneerChat SQUAD stream
- "Export CSV" generates a downloadable file client-side (no backend needed)
- Once user confirms settlement, Phase 2 unlocks

**Phase 2 — Publish to VentureVault**

Optional. Packages the completed trip as a Pro-Path template.

```
┌─ PACKAGE THIS EXPEDITION ─────────────────┐
│ Path Name: [Iceland Ring Road — Our Way]  │
│ Difficulty: [Moderate ▾]                  │
│ Description: [                          ] │
│                                            │
│ Includes:                                  │
│  ✓ 8 confirmed stops                      │
│  ✓ Packing manifest (climate: cold)       │
│  ✓ Budget template ($1,840 / 3 pax)      │
│  ✗ Hazard overlays (stripped for privacy) │
│                                            │
│ [Publish to VentureVault]                  │
└────────────────────────────────────────────┘
```

- Strips sensitive data (GPS coords from logs, squad member names → anonymized roles)
- Sets `price: 0` by default (free path) with option to set a price (future: Stripe)
- On publish: calls `CLONE_PATH`-compatible data shape, appends to VentureVault seed array
  (for now: localStorage; future: Supabase)
- After publish: ArchitectProfile `paths published` counter increments

### Trip status badge updates
The existing status badge in TripPlanner header adds `AFTER-ACTION` with a gold "Debrief" label.

---

## 5. Data Model Changes Summary

### Stop (extended)
```js
type: 'summit' | 'coastal' | 'urban' | 'transit' | 'camp' | 'viewpoint'
altStopId: string | null
// riskLevel derived at render, not stored
```

### TripStore additions
```js
trip.status: 'PLANNING' | 'TACTICAL' | 'ACTIVE' | 'AFTER-ACTION'  // new enum value
architect: { insights: [], lastGeneratedAt: null }
```

### VaultTemplate shape (for After-Action publish)
```js
{
  id, name, difficulty, description,
  legs: [...],           // stops with types, no sensitive coords
  manifestConfig: { climate, days, hasChildren },
  budgetTemplate: { totalUSD, paxCount },
  architectName: string,
  publishedAt: timestamp,
  cloneCount: 0,
  rating: null,
}
```

---

## 6. New Files

| File | Purpose |
|---|---|
| `src/utils/sentinelBus.js` | Pub/sub event bus |
| `src/utils/weatherHazardMapper.js` | OWM response → normalized Hazard |
| `src/utils/architectEngine.js` | Rule-based insight generation + Anthropic call |
| `src/components/ui/InsightCard.jsx` | Dismissible inline insight card |
| `src/components/afteraction/AfterActionScreen.jsx` | Phase 1 + 2 post-trip UI |

---

## 7. Modified Files

| File | Change |
|---|---|
| `src/utils/safetyEngine.js` | Add `affectedGearTags`, `affectedStopTypes` to hazard objects |
| `src/utils/packingLogic.js` | Add gear tag library; expose `getItemsByTag(tag)` |
| `src/utils/weatherEngine.js` | Integrate OWM API call; emit `HAZARD_UPDATED` via bus |
| `src/store/useTripStore.jsx` | Add `AFTER-ACTION` status, `architect` slice, `COMPLETE_EXPEDITION` action |
| `src/components/logistics/PackingManifest.jsx` | Subscribe to bus, render CRITICAL elevation + InsightCards |
| `src/components/itinerary/ledger/LedgerWorkbench.jsx` | Subscribe to bus, render stop risk badges + InsightCards |
| `src/components/logistics/BudgetLoom.jsx` | Subscribe to bus, render insurance callout + InsightCards |
| `src/components/social/PioneerChat.jsx` | Handle `type: 'architect'` log messages |
| `src/pages/TripPlanner.jsx` | Add "Complete Expedition" button; render AfterActionScreen when status = AFTER-ACTION |
| `src/components/trip/StopEditor.jsx` | Add `type` field selector to stop form |

---

## 8. Environment Variables

```
VITE_OWM_API_KEY   # OpenWeatherMap free tier
# VITE_ANTHROPIC_API_KEY already exists
```

---

## 9. Out of Scope (this spec)

- Dead Man's Switch / encrypted passport storage (VentureVault identity)
- Compass Ring / Glanceable Logistics widget
- Mobile left-hand mode
- Supabase persistence for published VaultTemplates (uses localStorage for now)
- Real-time squad sync (mock WebSocket unchanged)
