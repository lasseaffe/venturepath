@APPLE_COMPLIANCE.md

## MANDATORY: Task Logging

**This rule is non-negotiable and must never be skipped.**

After EVERY successfully completed task — no exceptions — append an entry to:
`C:\Users\lasse\Desktop\venturepath\logs\`

Rules:
- One log file per session, named `YYYY-MM-DD.md` (use today's date)
- Append (never overwrite) — multiple tasks in one day go in the same file
- Write the entry BEFORE reporting the task as done to the user
- If the logs folder does not exist, create it first
- A task is "complete" when code is written, a bug is fixed, a feature is added, a file is changed — any meaningful work

Entry format:
```
## [HH:MM] <short task title>
- What was done (bullet points)
- Files changed
```

**Failure to log is a critical error. Do not skip this step under any circumstances.**

## MANDATORY: Moodboard Maintenance

The in-app Moodboard view (reachable via Settings → "Design Moodboard") is the live design contract. It must never lag the codebase. When you make ANY change that affects design — tokens, fonts, components, theme registers (default/day/tactical), voice rules (including the VP-1 vocabulary contract in APPLE_COMPLIANCE.md), icon family, motion — you MUST, in the same task:

1. **Update `src/pages/moodboard/moodboard.config.js`** if the change is editorial (a new principle, a new theme/register name, new vocabulary, new do/don't pair, new motion intent). Token/font/spacing changes propagate automatically — no config edit needed for those.
2. **Append a dated entry to `docs/moodboard.log.md`** with BOTH `### Changed` and `### Ideas / next steps`. Newest entry on top. The Change Log section of the in-app Moodboard renders the top 5 entries via Vite's `?raw` import.
3. **Run `npm run moodboard:check`** and resolve any drift warnings (or update the script's `ignored` allow-list if the new token is intentionally a mechanical helper).

**Failure to update the moodboard is a critical error.** It is treated with the same severity as a missing task log. APPLE-RISK: the Moodboard view also satisfies VP minimum-functionality (Apple 4.2) — keep its interactive elements working (theme cycle, motion replay buttons).

## CORE ARCHITECTURE: Cross-Tool Data Flow

**This is a non-negotiable architectural rule. Every tool must wire its commit action to `useTripStore`.**

VenturePath's entire OVERVIEW (map, elevation, timeline, budget, packing) reads from a single Zustand store. When any tool calls a store mutation, all consumers re-render automatically — no prop-drilling, no event buses.

### Required mutations (confirm these exist in `src/store/useTripStore.js`)
| Tool action | Mutation | Field written |
|---|---|---|
| Transport "Add to Plan" | `addLeg(leg)` | `legs[]` |
| Stay "Book / Save" | `addStay(stay)` | `stays[]` |
| Discovery POI "Save" | `addPoi(poi)` | `pois[]` |
| Safety alert acknowledged | `addAlert(alert)` | `alerts[]` |
| Budget item added | `addBudgetItem(item)` | `budget{}` |

### Leg shape (canonical — all tools must use this)
```js
{
  id: uuid,
  from: { label, coords },       // coords = [lat, lng]
  to:   { label, coords },
  mode: 'flight' | 'train' | 'bus' | 'ferry' | 'drive' | 'foot',
  departs: ISO8601,
  arrives: ISO8601,
  price: number,
  currency: string,
  co2kg: number,
  carrier: string,
  status: 'confirmed' | 'pending',
}
```

### User feedback
Every "Add to Plan" action must show a toast: `✓ [Carrier] [FROM]→[TO] added to plan · View on map →`
- 3s duration, clickable (navigates to OVERVIEW tab + pans map to the new leg)
- Use `useToastStore` (component: `src/components/ui/Toast.jsx`)

### Tools not yet wired (wire these when touching them)
- `VehicleSearch` → `addLeg()` with `mode: 'drive'`
- `AccommodationSearch` → `addStay()`
- `MustSee` / `BasecampScout` → `addPoi()`
- `BudgetLoom` manual entries → `addBudgetItem()`

**Failure to wire a tool to the store is an incomplete implementation.** The tool is a dead end until it feeds the plan.
