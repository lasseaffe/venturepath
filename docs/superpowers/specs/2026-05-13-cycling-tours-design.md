# VenturePath — Cycling Tours Design Spec

**Date:** 2026-05-13  
**Status:** Design approved, awaiting implementation plan  
**Scope:** Cycling legs as multi-modal expedition component with squad collaboration, route enrichment, and repair guide

---

## 1. Overview

Cycling tours integrate as a new **leg mode** (`mode: 'cycle'`) within VenturePath's multi-modal expedition framework. Like foot and car legs, cycling legs are enriched with environmental data (road suitability, POI, elevation), but add squad-specific features: pace negotiation via Ledger Workbench, role claiming (sweep rider, navigator, support driver), and an in-app bike repair guide.

A typical workflow: Pioneer creates an expedition "Tuscany Loop," imports a GPX route from gpx.tours, system auto-splits into daily stages (65km/day), squad nominates pace options, convener approves, pioneers claim roles. The route is enriched with shops, toilets, bike repair points, and road suitability heatmap shows which segments are highways (avoid) vs. local roads (ideal).

---

## 2. Data Model

### 2.1 Cycling Leg Structure

```js
{
  id: 100,
  from: 'Firenze',
  to: 'Roma',
  mode: 'cycle',
  durationH: 36,
  distanceKm: 280,
  status: 'pending',         // shared across all modes
  waypoints: [],             // shared, populated by enrichment
  
  // Cycling-specific metadata
  legMeta: {
    cycle: {
      // Route source & geometry
      routeGpxId: 'vault-uuid-abc123',  // ref to vault file
      routeSource: 'gpx.tours' | 'graphhopper' | 'uploaded',
      routeSourceUrl: 'https://gpx.tours/route/12345',  // optional
      
      // Elevation stats
      totalElevationGainM: 2150,
      totalElevationLossM: 2180,
      maxGradePct: 8.5,
      
      // Bike suitability scoring
      bikeSuitability: {
        overallScore: 0.78,  // 0–1 scale; 1 = ideal bike routes
        segments: [
          {
            distanceKm: 45.2,
            startCoord: [43.7693, 11.2557],
            endCoord: [43.8123, 11.3456],
            roadClass: 'secondary',
            surface: 'asphalt',
            score: 0.85,
            trafficLevel: 'low',
            hasCycleway: false
          },
          {
            distanceKm: 23.1,
            startCoord: [43.8123, 11.3456],
            endCoord: [43.9012, 11.4567],
            roadClass: 'primary',
            surface: 'asphalt',
            score: 0.45,
            trafficLevel: 'high',
            hasCycleway: false
          }
          // ... more segments
        ]
      },
      
      // Daily stages (auto-calculated or user-specified)
      stages: [
        {
          id: 'stage-1',
          label: 'Day 1',
          fromCoord: [43.7693, 11.2557],
          toCoord: [43.8567, 11.3890],
          distanceKm: 65,
          elevationGainM: 420,
          estimatedDurationH: 4.5,
          plannedStop: 'stay-uuid-001',  // optional ref to accommodation
          waypoints: ['wp-1', 'wp-5', 'wp-12'],
          roleAssignments: {
            sweep: 'pioneer-uuid-sarah',
            navigator: null,
            support_driver: null
          }
        },
        {
          id: 'stage-2',
          label: 'Day 2',
          fromCoord: [43.8567, 11.3890],
          toCoord: [43.9456, 11.5678],
          distanceKm: 72,
          elevationGainM: 580,
          estimatedDurationH: 5.0,
          plannedStop: 'stay-uuid-002',
          waypoints: ['wp-13', 'wp-18', 'wp-25'],
          roleAssignments: { sweep: null, navigator: 'pioneer-uuid-tom', support_driver: null }
        }
        // ... more stages
      ],
      
      // Pace negotiation (Ledger Workbench style)
      paceLedger: {
        proposals: [
          {
            id: 'prop-1',
            proposedBy: 'pioneer-uuid-alice',
            proposedByName: 'Alice',
            paceKmDay: 65,
            resultingStages: 5,
            createdAt: '2026-05-13T10:00Z',
            votes: {
              'pioneer-uuid-bob': 'yes',
              'pioneer-uuid-carol': 'no',
              'pioneer-uuid-dave': 'maybe'
            },
            status: 'pending'
          },
          {
            id: 'prop-2',
            proposedBy: 'pioneer-uuid-bob',
            proposedByName: 'Bob',
            paceKmDay: 80,
            resultingStages: 4,
            createdAt: '2026-05-13T10:05Z',
            votes: {
              'pioneer-uuid-alice': 'no',
              'pioneer-uuid-carol': 'yes',
              'pioneer-uuid-dave': 'yes'
            },
            status: 'approved'
          }
        ],
        approvedPace: 80,
        approvedBy: 'pioneer-uuid-convener',
        approvedAt: '2026-05-13T10:15Z'
      },
      
      // Claimable roles for the leg
      roles: [
        {
          id: 'sweep',
          label: 'Sweep Rider',
          description: 'Stays at back, ensures no one gets dropped',
          claimable: true,
          max_claims: 1,
          assigned_to: 'pioneer-uuid-sarah'
        },
        {
          id: 'navigator',
          label: 'Navigator',
          description: 'Leads route, watches for turns',
          claimable: true,
          max_claims: 1,
          assigned_to: null
        },
        {
          id: 'support_driver',
          label: 'Support Driver',
          description: 'SAG vehicle support (optional)',
          claimable: true,
          max_claims: 1,
          assigned_to: null
        }
      ]
    }
  }
}
```

### 2.2 Waypoint Extensions

All waypoints use the shared `waypoint` structure from `waypointCategories.js`. New cycling-specific categories:

| Category | Icon | Color | Use |
|---|---|---|---|
| `bike_shop` | 🔧 | Ember | Repair stations, bike shops |
| `shop` | 🛒 | Sandstone | General supplies, convenience stores |
| `food` | 🍽️ | Sandstone | Cafés, restaurants |
| `toilet` | 🚽 | Spruce | Facilities along route |
| `poi` | 📍 | Ember | Scenic viewpoints, landmarks |

---

## 3. cycleEngine — Route Calculation & Enrichment

**Location:** `src/utils/legIntelligence/engines/cycleEngine.js`

Pipeline runs sequentially when a cycling leg is created:

### 3.1 Route Input

**Input A: GPX Import**
- User uploads `.gpx` file or provides URL (gpx.tours, Komoot, Strava)
- Parse GPX: extract coordinate array, calculate total distance from haversine distances
- Store raw GPX as base64 blob in vault: `legMeta.cycle.routeGpxId`
- If import source is known (e.g., gpx.tours), store `routeSource` and `routeSourceUrl`

**Input B: GraphHopper Calculation**
- User provides start/end coordinates or stop locations
- Query GraphHopper Routing API with `profile: "bike"` (bike-friendly routing)
- Receive optimized route geometry + distance
- Create synthetic GPX from geometry, store in vault
- Set `routeSource: 'graphhopper'`

**Error handling:** If GPX parse fails or GraphHopper returns no route, fail gracefully with actionable error ("Route too far for bike mode" or "No bike-friendly route found").

### 3.2 Road Suitability Scoring

**Adapter:** `src/utils/legIntelligence/adapters/overpassBike.js`

For each segment of the route (divide into ~5km chunks):
1. Query **Overpass API** for road metadata:
   ```
   [bbox:south,west,north,east];
   (
     way[highway~"motorway|trunk|primary|secondary|residential|cycleway"];
     way[bicycle];
   );
   out geom;
   ```

2. Classify each way segment by `highway` tag and assign base score:
   - `motorway`, `trunk`: **0.1** (forbidden, high speed)
   - `primary`: **0.4** (tolerable, watch for traffic)
   - `secondary`: **0.7** (good, minor roads)
   - `residential`, `living_street`: **0.9** (ideal, quiet)
   - `path`, `track` (unpaved): **0.6** (depends on bike type)

3. Apply **bonuses**:
   - `bicycle=yes` tag: **+0.2**
   - `cycleway=track` or `cycleway=lane`: **+0.3** (dedicated bike infrastructure)

4. For each segment:
   - Match segment coordinates to Overpass ways
   - Calculate segment score as weighted average of intersecting ways
   - Classify `trafficLevel: 'low'|'medium'|'high'` based on road class

5. Build `bikeSuitability.segments` array with per-segment scores
6. **Overall score** = weighted average of all segment scores (longer segments weighted more)

**Storage:** `legMeta.cycle.bikeSuitability`

### 3.3 Waypoint Enrichment

**Adapter:** `src/utils/legIntelligence/adapters/overpassPoi.js`

Query Overpass for POI within 1km of route geometry:
```
[bbox:south,west,north,east];
(
  node[amenity~"shop|restaurant|cafe|toilets|bicycle_repair_station|bicycle_shop"];
  node[tourism~"viewpoint|information"];
);
out center;
```

For each POI found:
- Calculate distance to nearest route point (buffer 1km)
- If within buffer, create waypoint:
  ```js
  {
    id: crypto.randomUUID(),
    lat, lon,
    category: 'bike_shop' | 'shop' | 'food' | 'toilet' | 'poi',
    label: POI name,
    description: OSM tags (opening hours, phone if available),
    distance_from_route_km: 0.3,
    route_segment: 'segment-2'  // which stage contains this
  }
  ```
- Add to `leg.waypoints` array
- Assign to appropriate stage based on route proximity

### 3.4 Elevation Profile

**Reuse:** Open Elevation adapter from `footEngine`

- Sample route coordinates at ~500m intervals
- Query Open Elevation API for elevation at each point
- Calculate gain/loss for each stage
- Store in `legMeta.cycle.totalElevationGainM`, `totalElevationLossM`, `maxGradePct`

### 3.5 Engine Output

Returns updated leg object with:
- ✓ `legMeta.cycle.bikeSuitability` populated
- ✓ `legMeta.cycle.totalElevationGainM/LossM` populated
- ✓ `leg.waypoints` enriched with categories
- ✓ `legMeta.cycle.stages` auto-calculated (see Section 4)
- Ready for display in `LegLensCycle`

---

## 4. Stage Breakdown — Daily Splits

**Logic:** `src/utils/legIntelligence/engines/cycleEngine.js` (stageCalculator sub-module)

Stages are **ephemeral**—recalculated whenever pace or overnight stays change.

### 4.1 Method A: User km/day Target

```js
function calculateStagesByDistance(route, targetKmPerDay, overallStays = []) {
  const stages = [];
  let cumulativeKm = 0;
  let stageNumber = 1;
  let routeSegmentStart = 0;
  
  while (routeSegmentStart < route.segments.length) {
    // Accumulate distance until >= targetKmPerDay
    let segmentEnd = routeSegmentStart;
    while (segmentEnd < route.segments.length && cumulativeKm < targetKmPerDay) {
      cumulativeKm += route.segments[segmentEnd].distanceKm;
      segmentEnd++;
    }
    
    // Find nearest overnight stay to segmentEnd
    const stageEndCoord = route.segments[segmentEnd - 1].endCoord;
    const nearbyStay = findNearestStay(stageEndCoord, overallStays, tolerance: 5); // 5km buffer
    
    stages.push({
      id: `stage-${stageNumber}`,
      label: nearbyStay ? nearbyStay.name : `Day ${stageNumber}`,
      distanceKm: cumulativeKm,
      plannedStop: nearbyStay ? nearbyStay.id : null,
      waypoints: filterWaypointsBySegmentRange(routeSegmentStart, segmentEnd)
    });
    
    cumulativeKm = 0;
    routeSegmentStart = segmentEnd;
    stageNumber++;
  }
  
  return stages;
}
```

### 4.2 Method B: Existing Overnight Stays

If the expedition already has bookings (hotels, camps):
- Use bookings as stage boundaries
- Calculate distance between consecutive stays
- Each segment becomes a stage
- Label by stay name or "Day N"

### 4.3 Recalculation on Pace Approval

When squad votes on pace and **convener approves**:
1. Dispatch `APPROVE_CYCLE_PACE` action with approved `paceKmDay`
2. Store calls `calculateStagesByDistance(route, approvedPace, overallStays)`
3. Replace old stages with new stages
4. Re-assign waypoints to new stages by proximity
5. If overnight stays shift stage boundaries, notify user

---

## 5. Squad Pace Negotiation — Ledger Workbench

**UI Component:** New tab in `LegLensCycle`: "Pace & Roles"

**Workflow:**

### 5.1 Nominate Phase
- Any pioneer can propose a pace: click "Propose Pace" → modal
- Input field: km/day (radio options: 60, 70, 80, 90, or custom)
- System calculates: resulting stages, total days, feasibility check
- Proposal appears in card: "Alice proposed 65km/day → 5 days"

### 5.2 Vote Phase
- All other pioneers see proposals
- Click to vote: ✓ (agree), ✗ (disagree), or "Propose alternative"
- Votes are visible (no anonymity, matches Ledger Workbench)
- Can't close this phase until convener acts

### 5.3 Convener Decision
- Convener (leg creator or LEADER role) sees all proposals + vote tallies
- Clicks "Approve" on one proposal
- System recalculates stages immediately
- Toast: "Pace approved: 80km/day → 4 stages"
- All pioneers notified

### 5.4 Store Actions

```js
// In useTripStore reducer
case 'PROPOSE_CYCLE_PACE': {
  const { legId, paceKmDay, proposedBy } = action.payload;
  const leg = state.legs.find(l => l.id === legId);
  const newProposal = {
    id: crypto.randomUUID(),
    proposedBy,
    proposedByName: getProposerName(proposedBy),
    paceKmDay,
    resultingStages: calculateStagesByDistance(...).length,
    createdAt: new Date().toISOString(),
    votes: {},
    status: 'pending'
  };
  leg.legMeta.cycle.paceLedger.proposals.push(newProposal);
  return { ...state, legs: [...state.legs.map(l => l.id === legId ? leg : l)] };
}

case 'VOTE_CYCLE_PACE': {
  const { legId, proposalId, voterId, vote } = action.payload;
  const leg = state.legs.find(l => l.id === legId);
  const proposal = leg.legMeta.cycle.paceLedger.proposals.find(p => p.id === proposalId);
  proposal.votes[voterId] = vote;  // 'yes' | 'no' | 'maybe'
  return { ...state, legs: [...state.legs.map(l => l.id === legId ? leg : l)] };
}

case 'APPROVE_CYCLE_PACE': {
  const { legId, proposalId, convenerDecision } = action.payload;
  const leg = state.legs.find(l => l.id === legId);
  const proposal = leg.legMeta.cycle.paceLedger.proposals.find(p => p.id === proposalId);
  proposal.status = 'approved';
  leg.legMeta.cycle.paceLedger.approvedPace = proposal.paceKmDay;
  leg.legMeta.cycle.paceLedger.approvedBy = auth.uid();
  leg.legMeta.cycle.paceLedger.approvedAt = new Date().toISOString();
  
  // Recalculate stages
  const newStages = calculateStagesByDistance(leg, proposal.paceKmDay, state.stays);
  leg.legMeta.cycle.stages = newStages;
  
  return { ...state, legs: [...state.legs.map(l => l.id === legId ? leg : l)] };
}
```

---

## 6. Squad Roles — Sweep Rider, Navigator, Support Driver

**Model:** Claimable roles stored in `legMeta.cycle.roles`, identical to Gatherings pattern.

```js
roles: [
  {
    id: 'sweep',
    label: 'Sweep Rider',
    description: 'Stays at back, ensures no one gets dropped',
    claimable: true,
    max_claims: 1,
    assigned_to: 'pioneer-uuid' | null
  },
  // ... navigator, support_driver
]
```

**UI:** In "Pace & Roles" tab, roles appear as claimable cards (unclaimed shows "Unclaimed" badge). Click to claim. Convener can reassign. Each stage card shows current role assignments: "Sweep: Sarah | Navigator: Tom".

**Display:** Role badges appear on stage cards and in route overview (so squad sees who's doing what).

---

## 7. Bike Repair Guide

**Location:** `src/components/bikeRepair/BikeRepairGuide.jsx`

Companion knowledge base with two sources:

### 7.1 In-App Articles

Content stored as markdown files in `src/utils/bikeRepair/articles/`:
- `flat-tire-repair.md`
- `chain-cleaning.md`
- `derailleur-adjustment.md`
- `brake-pads.md`
- `dropped-chain.md`
- `quick-links.md`

Each article: 200–300 words + ASCII diagram or link to external step-photo.

### 7.2 External Links

- When a pioneer is near a `bike_shop` waypoint, modal shows:
  - Shop name, address, hours
  - "Need deeper help?" → links to Park Tool, Sheldon Brown, YouTube channels
- Links are configurable, curated list of trusted resources

### 7.3 Access Points

- "?" icon in `LegLensCycle` header → opens guide
- Search box: type "derailleur" → finds matching articles
- Repair modal auto-opens when pioneer zooms in on a `bike_shop` waypoint on the map

---

## 8. UI Components

### 8.1 LegLensCycle

New component, dispatched from `LegLens.jsx` when `mode === 'cycle'`. Tabbed interface:

**Tab 1: Route Overview**
- Interactive map with route geometry
- Color-coded suitability heatmap (green→yellow→red for score 1.0→0.5→0.1)
- Summary stats box: total distance, elevation gain/loss, overall suitability score
- "Reroute" button (recalculates via GraphHopper if user wants to dodge highways)

**Tab 2: Stages & Waypoints**
- Card per stage:
  - Stage label (Day 1 or Overnight stop name)
  - Distance, elevation, estimated duration
  - Expandable waypoint list (shop, toilet, bike_shop, food, poi)
  - Role badges: "Sweep: Sarah | Navigator: Tom"
  - Edit icon to propose new distance (triggers recalculation flow)
- Collapse/expand all controls

**Tab 3: Pace & Roles**
- Pace Ledger: proposals + votes + convener controls
- Role claim UI
- Approval status banner

**Tab 4: Repair Guide**
- Search + category filter
- Article cards (collapsible)
- Modal for bike shop details

### 8.2 Modified Components

**LegLens.jsx**
- Add case for `mode === 'cycle'` → dispatch to `LegLensCycle`

**LegLensDispatcher.jsx** (if exists)
- Register `cycle` mode

**useTripStore.jsx**
- Add reducer actions: `PROPOSE_CYCLE_PACE`, `VOTE_CYCLE_PACE`, `APPROVE_CYCLE_PACE`
- Add leg meta initializer for `cycle` mode

---

## 9. Tech Stack & Dependencies

| Layer | Tech |
|---|---|
| **Router** | GraphHopper Routing API (bike profile) |
| **Elevation** | Open Elevation API (existing adapter) |
| **POI enrichment** | Overpass API (new bike-specific queries) |
| **Route import** | GPX parser (existing), gpx.tours links (documentation) |
| **State** | useTripStore (React Context + useReducer) |
| **UI** | React 19, Tailwind, JetBrains Mono (labels), Playfair (headers) |
| **Tests** | Vitest + React Testing Library |

---

## 10. File Map

**New files:**
- `src/utils/legIntelligence/engines/cycleEngine.js`
- `src/utils/legIntelligence/adapters/overpassBike.js`
- `src/utils/legIntelligence/adapters/overpassPoi.js` (or extend existing)
- `src/utils/legIntelligence/__tests__/cycleEngine.test.js`
- `src/utils/bikeRepair/articles/flat-tire-repair.md`
- `src/utils/bikeRepair/articles/chain-cleaning.md`
- `src/utils/bikeRepair/articles/derailleur-adjustment.md`
- `src/utils/bikeRepair/articles/brake-pads.md`
- `src/utils/bikeRepair/articles/dropped-chain.md`
- `src/utils/bikeRepair/articles/quick-links.md`
- `src/components/legLens/LegLensCycle.jsx`
- `src/components/legLens/__tests__/LegLensCycle.test.jsx`
- `src/components/bikeRepair/BikeRepairGuide.jsx`
- `src/components/bikeRepair/__tests__/BikeRepairGuide.test.jsx`

**Modified files:**
- `src/utils/legIntelligence/waypointCategories.js` — add `bike_shop`, `shop`, `food`, `toilet` if not already present
- `src/utils/legIntelligence/index.js` — register `cycleEngine`
- `src/store/useTripStore.jsx` — add pace/role actions
- `src/components/legLens/LegLens.jsx` — dispatch `cycle` mode

---

## 11. Success Criteria

- [ ] Pioneer can import a GPX route from gpx.tours or upload a `.gpx` file
- [ ] Route is enriched with suitability heatmap (0–1 score, color-coded)
- [ ] Waypoints auto-populated with shops, toilets, bike shops, POI (Overpass queries)
- [ ] Stages auto-split by km/day OR existing overnight stays
- [ ] Squad can nominate pace options, vote, convener approves
- [ ] Stages recalculate on pace approval
- [ ] Roles claimable (sweep rider, navigator, support driver) with single assignee
- [ ] Repair guide searchable, linked to bike shop waypoints
- [ ] LegLensCycle displays all four tabs with full functionality
- [ ] Route can be rerouted via GraphHopper to avoid highways
- [ ] All tests pass (cycleEngine, LegLensCycle, BikeRepairGuide)

---

## 12. Design Constraints (APPLE_COMPLIANCE)

- **Differentiation:** Cycling tours' squad negotiation (Ledger Workbench pace votes) is unique vs. generic bike route apps
- **Brand tokens:** Ember color for primary waypoints, Spruce for water, Sandstone for supplies, JetBrains Mono for all labels
- **Minimum functionality:** Route, waypoints, suitability heatmap, stage breakdown, pace ledger, role claiming, repair guide all functional at launch
- **Empty states:** If no route imported, show CTA: "Import a GPX route from gpx.tours or create a custom route"

---

## 13. Open Questions / Future

- Should we integrate gpx.tours API for search/discovery, or just document the import flow?
- Should cycling tours support multi-day "Grand Tours" with stage standings/power-ups (GCN-style)?
- Should the repair guide include video embeds, or just links?
- Should Support Driver roles auto-suggest itineraries for SAG vehicles?

---

## References

- [gpx.tours](https://gpx.tours) — route discovery and import
- [GraphHopper Routing API](https://graphhopper.com) — bike-friendly routing
- [Overpass API](https://overpass-turbo.eu) — POI and road metadata
- [Open Elevation API](https://open-elevation.com) — elevation sampling
- VenturePath Leg Intelligence docs (Phase 1–3)
- VenturePath Gatherings RLS + Ledger Workbench (roles + voting model)
