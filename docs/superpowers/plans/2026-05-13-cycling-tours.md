# Cycling Tours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cycling legs as first-class multi-modal expedition component with route enrichment (Overpass POI + road suitability), stage breakdown, squad pace negotiation (Ledger Workbench), role claiming, and in-app bike repair guide.

**Architecture:** Cycling integrates via `cycleEngine` (mirrors footEngine pattern), enriches routes with Overpass road/POI data, auto-splits stages by km/day or overnight stays, wires pace/role negotiation to store, renders via new `LegLensCycle` component (4-tab interface), includes repair knowledge base.

**Tech Stack:** Vite + React 19, useTripStore (Context+useReducer), Overpass API, GraphHopper Routing, Open Elevation API (reused), Vitest + React Testing Library

---

## File Structure Overview

```
src/
  utils/legIntelligence/
    engines/
      cycleEngine.js (new)
    adapters/
      overpassBike.js (new)
      overpassPoi.js (new)
    __tests__/
      cycleEngine.test.js (new)
      overpassBike.test.js (new)
      overpassPoi.test.js (new)
    waypointCategories.js (modify)
    index.js (modify)
  components/legLens/
    LegLensCycle.jsx (new)
    LegLens.jsx (modify)
    __tests__/
      LegLensCycle.test.jsx (new)
  bikeRepair/
    BikeRepairGuide.jsx (new)
    articles/ (new)
      flat-tire-repair.md (new)
      chain-cleaning.md (new)
      derailleur-adjustment.md (new)
      brake-pads.md (new)
      dropped-chain.md (new)
      quick-links.md (new)
    __tests__/
      BikeRepairGuide.test.jsx (new)
  store/
    useTripStore.jsx (modify)
```

---

## Task 0: Add Cycling Waypoint Categories

**Files:**
- Modify: `src/utils/legIntelligence/waypointCategories.js`
- Modify: `src/utils/legIntelligence/__tests__/waypointCategories.test.js` (if exists, append tests)

**Context:** Waypoint categories define how each POI type is styled/labeled on the map. Cycling adds: bike_shop, shop, food, toilet (reuse existing or add if missing). These use VenturePath brand tokens: Ember for primary, Sandstone for secondary, Spruce for water-related.

- [ ] **Step 1: Read current waypointCategories to understand structure**

```bash
cd "C:\Users\lasse\Desktop\venturepath"
cat src/utils/legIntelligence/waypointCategories.js
```

Expected: See existing categories with color/icon/label structure.

- [ ] **Step 2: Identify missing cycling categories**

If `bike_shop`, `shop`, `food`, `toilet` are already defined, skip to Step 5. If not, continue.

- [ ] **Step 3: Add missing categories to waypointCategories.js**

Insert after existing categories:

```javascript
// Cycling-specific waypoint categories (Phase 3+)
bike_shop: {
  color: '#E67E22',  // Ember
  icon: '🔧',
  label: 'Bike shop'
},
shop: {
  color: '#D9C5B2',  // Sandstone
  icon: '🛒',
  label: 'Shop'
},
food: {
  color: '#D9C5B2',  // Sandstone
  icon: '🍽️',
  label: 'Food'
},
toilet: {
  color: '#3A6B5C',  // Spruce
  icon: '🚽',
  label: 'Toilet'
},
```

- [ ] **Step 4: Add tests to waypointCategories.test.js (if test file exists)**

If no test file exists, create `src/utils/legIntelligence/__tests__/waypointCategories.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { getCategoryStyle } from '../waypointCategories';

describe('waypointCategories — cycling categories', () => {
  it('returns Ember color for bike_shop category', () => {
    expect(getCategoryStyle('bike_shop').color).toBe('#E67E22');
    expect(getCategoryStyle('bike_shop').icon).toBe('🔧');
  });

  it('returns Sandstone color for shop category', () => {
    expect(getCategoryStyle('shop').color).toBe('#D9C5B2');
    expect(getCategoryStyle('shop').icon).toBe('🛒');
  });

  it('returns Sandstone color for food category', () => {
    expect(getCategoryStyle('food').color).toBe('#D9C5B2');
    expect(getCategoryStyle('food').icon).toBe('🍽️');
  });

  it('returns Spruce color for toilet category', () => {
    expect(getCategoryStyle('toilet').color).toBe('#3A6B5C');
    expect(getCategoryStyle('toilet').icon).toBe('🚽');
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/legIntelligence/waypointCategories.js src/utils/legIntelligence/__tests__/waypointCategories.test.js
git commit -m "feat(legIntelligence): add cycling waypoint categories (bike_shop, shop, food, toilet)"
```

---

## Task 1: Build Overpass Road Suitability Adapter

**Files:**
- Create: `src/utils/legIntelligence/adapters/overpassBike.js`
- Create: `src/utils/legIntelligence/__tests__/overpassBike.test.js`

**Context:** This adapter queries Overpass API for road metadata (highway class, surface, bicycle infrastructure) and scores each segment for bike-friendliness (0–1 scale). Motorways score 0.1, residential roads score 0.9, etc.

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/overpassBike.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { scoreSegment, calculateBikeSuitability } from '../adapters/overpassBike';

describe('overpassBike adapter', () => {
  describe('scoreSegment', () => {
    it('scores motorway as 0.1', () => {
      const segment = {
        roadClass: 'motorway',
        surface: 'asphalt',
        hasCycleway: false
      };
      expect(scoreSegment(segment)).toBe(0.1);
    });

    it('scores residential as 0.9', () => {
      const segment = {
        roadClass: 'residential',
        surface: 'asphalt',
        hasCycleway: false
      };
      expect(scoreSegment(segment)).toBe(0.9);
    });

    it('adds 0.2 bonus for bicycle=yes', () => {
      const segment = {
        roadClass: 'secondary',
        surface: 'asphalt',
        hasBicycleLane: true,
        hasCycleway: false
      };
      const score = scoreSegment(segment);
      expect(score).toBeGreaterThan(0.7); // secondary is 0.7, +0.2 bonus = capped at 1.0
    });

    it('adds 0.3 bonus for dedicated cycleway', () => {
      const segment = {
        roadClass: 'primary',
        surface: 'asphalt',
        hasCycleway: true
      };
      const score = scoreSegment(segment);
      expect(score).toBeGreaterThan(0.4); // primary is 0.4, +0.3 bonus
    });
  });

  describe('calculateBikeSuitability', () => {
    it('returns overall score as weighted average of segments', () => {
      const segments = [
        { distanceKm: 50, roadClass: 'secondary', surface: 'asphalt', hasCycleway: false },
        { distanceKm: 50, roadClass: 'primary', surface: 'asphalt', hasCycleway: false }
      ];
      const result = calculateBikeSuitability(segments);
      expect(result.overallScore).toBeCloseTo(0.55, 1); // (0.7 + 0.4) / 2
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toHaveProperty('score');
      expect(result.segments[0]).toHaveProperty('trafficLevel');
    });

    it('sets trafficLevel based on roadClass', () => {
      const segments = [
        { distanceKm: 10, roadClass: 'residential', surface: 'asphalt', hasCycleway: false }
      ];
      const result = calculateBikeSuitability(segments);
      expect(result.segments[0].trafficLevel).toBe('low');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/legIntelligence/__tests__/overpassBike.test.js
```

Expected: FAIL — `scoreSegment is not defined`.

- [ ] **Step 3: Implement scoreSegment and calculateBikeSuitability**

Create `src/utils/legIntelligence/adapters/overpassBike.js`:

```javascript
/**
 * Score a route segment for bike-friendliness (0-1 scale)
 * Motorways: 0.1 (forbidden), Residential: 0.9 (ideal)
 */
export function scoreSegment(segment) {
  const { roadClass, hasCycleway, hasBicycleLane } = segment;

  // Base scores by road class
  const baseScores = {
    motorway: 0.1,
    trunk: 0.1,
    primary: 0.4,
    secondary: 0.7,
    residential: 0.9,
    living_street: 0.9,
    path: 0.6,
    track: 0.6,
    unclassified: 0.5,
  };

  let score = baseScores[roadClass] ?? 0.5; // default to 0.5 if unknown

  // Apply bonuses
  if (hasBicycleLane) score += 0.2;
  if (hasCycleway) score += 0.3;

  return Math.min(score, 1.0); // cap at 1.0
}

/**
 * Calculate bike suitability for entire route
 * Returns overall score (weighted by segment distance) and per-segment metadata
 */
export function calculateBikeSuitability(segments) {
  if (!segments || segments.length === 0) {
    return {
      overallScore: 0.5,
      segments: [],
    };
  }

  const totalDistance = segments.reduce((sum, s) => sum + s.distanceKm, 0);

  const scoredSegments = segments.map((seg) => {
    const score = scoreSegment(seg);
    const trafficLevel = getTrafficLevel(seg.roadClass);

    return {
      ...seg,
      score,
      trafficLevel,
    };
  });

  // Weighted average of scores
  const overallScore =
    scoredSegments.reduce((sum, seg) => sum + seg.score * (seg.distanceKm / totalDistance), 0);

  return {
    overallScore: Math.round(overallScore * 100) / 100, // 2 decimal places
    segments: scoredSegments,
  };
}

/**
 * Classify traffic level based on road class
 */
function getTrafficLevel(roadClass) {
  if (['motorway', 'trunk', 'primary'].includes(roadClass)) return 'high';
  if (['secondary', 'tertiary'].includes(roadClass)) return 'medium';
  return 'low';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/legIntelligence/__tests__/overpassBike.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/adapters/overpassBike.js src/utils/legIntelligence/__tests__/overpassBike.test.js
git commit -m "feat(legIntelligence): add overpassBike adapter for road suitability scoring"
```

---

## Task 2: Build Overpass POI Adapter

**Files:**
- Create: `src/utils/legIntelligence/adapters/overpassPoi.js`
- Create: `src/utils/legIntelligence/__tests__/overpassPoi.test.js`

**Context:** This adapter queries Overpass API for POI (shops, toilets, bike shops, food, landmarks) within 1km of the route and creates waypoints with categories and descriptions.

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/overpassPoi.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { queryOverpassPoi, mapPoiToWaypoint } from '../adapters/overpassPoi';

describe('overpassPoi adapter', () => {
  describe('mapPoiToWaypoint', () => {
    it('maps bike_shop OSM node to waypoint with correct category', () => {
      const poi = {
        lat: 43.7693,
        lon: 11.2557,
        tags: {
          name: 'Cicli Rossi',
          amenity: 'bicycle_shop',
          'opening_hours': 'Mo-Sa 09:00-19:00',
        },
      };
      const waypoint = mapPoiToWaypoint(poi, 'bike_shop', 0.5);
      expect(waypoint.category).toBe('bike_shop');
      expect(waypoint.label).toBe('Cicli Rossi');
      expect(waypoint.lat).toBe(43.7693);
      expect(waypoint.lon).toBe(11.2557);
      expect(waypoint.distance_from_route_km).toBe(0.5);
    });

    it('maps food amenity to food category', () => {
      const poi = {
        lat: 43.8,
        lon: 11.3,
        tags: { name: 'Café Rosa', amenity: 'cafe' },
      };
      const waypoint = mapPoiToWaypoint(poi, 'food', 0.2);
      expect(waypoint.category).toBe('food');
      expect(waypoint.label).toBe('Café Rosa');
    });

    it('includes opening hours in description if available', () => {
      const poi = {
        lat: 43.8,
        lon: 11.3,
        tags: {
          name: 'Shop',
          amenity: 'shop',
          'opening_hours': 'Mo-Fr 08:00-18:00',
        },
      };
      const waypoint = mapPoiToWaypoint(poi, 'shop', 0.1);
      expect(waypoint.description).toContain('Mo-Fr 08:00-18:00');
    });
  });

  describe('queryOverpassPoi', () => {
    it('returns empty array if bbox is invalid', () => {
      const result = queryOverpassPoi({ south: 45, west: 10, north: 40, east: 15 }); // south > north
      expect(result).toEqual([]);
    });

    it('builds correct bbox for coordinate array', () => {
      const coords = [
        [43.7693, 11.2557],
        [43.8123, 11.3456],
        [43.9012, 11.4567],
      ];
      // Just verify it returns a promise and doesn't throw
      const promise = queryOverpassPoi(coords, 1.0);
      expect(promise).toBeInstanceOf(Promise);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/legIntelligence/__tests__/overpassPoi.test.js
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement POI mapping and query logic**

Create `src/utils/legIntelligence/adapters/overpassPoi.js`:

```javascript
/**
 * Map OSM POI node to VenturePath waypoint structure
 */
export function mapPoiToWaypoint(poi, category, distanceFromRouteKm) {
  const { lat, lon, tags } = poi;
  const name = tags.name || `${tags.amenity || tags.tourism}`;

  let description = '';
  if (tags['opening_hours']) {
    description += `Hours: ${tags['opening_hours']}`;
  }
  if (tags.phone) {
    if (description) description += ' | ';
    description += `Phone: ${tags.phone}`;
  }

  return {
    id: crypto.randomUUID(),
    lat,
    lon,
    category,
    label: name,
    description: description || undefined,
    distance_from_route_km: distanceFromRouteKm,
  };
}

/**
 * Query Overpass API for POI along a route
 * coords: array of [lat, lon] pairs
 * bufferKm: search radius around route (default 1km)
 * Returns: array of waypoint objects
 */
export async function queryOverpassPoi(coords, bufferKm = 1.0) {
  if (!coords || coords.length < 2) {
    return [];
  }

  // Calculate bounding box with buffer
  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Rough conversion: 1 degree ≈ 111km
  const bufferDegrees = bufferKm / 111;

  const bbox = {
    south: minLat - bufferDegrees,
    north: maxLat + bufferDegrees,
    west: minLon - bufferDegrees,
    east: maxLon + bufferDegrees,
  };

  if (bbox.south > bbox.north || bbox.west > bbox.east) {
    return [];
  }

  const query = `
    [bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];
    (
      node[amenity~"shop|restaurant|cafe|toilets|bicycle_repair_station|bicycle_shop"];
      node[tourism~"viewpoint|information"];
    );
    out center;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status);
      return [];
    }

    const data = await response.json();

    // Map OSM nodes to waypoints
    const waypoints = data.elements.map((element) => {
      const category = mapAmenityToCategory(element.tags);
      return mapPoiToWaypoint(element, category, 0.1); // placeholder distance
    });

    return waypoints;
  } catch (error) {
    console.error('Failed to query Overpass POI:', error);
    return [];
  }
}

/**
 * Map OSM amenity/tourism tags to VenturePath category
 */
function mapAmenityToCategory(tags) {
  const { amenity, tourism } = tags;

  if (amenity === 'bicycle_shop' || amenity === 'bicycle_repair_station') return 'bike_shop';
  if (amenity === 'shop') return 'shop';
  if (amenity === 'restaurant' || amenity === 'cafe') return 'food';
  if (amenity === 'toilets') return 'toilet';
  if (tourism === 'viewpoint' || tourism === 'information') return 'poi';

  return 'poi'; // default
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/legIntelligence/__tests__/overpassPoi.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/adapters/overpassPoi.js src/utils/legIntelligence/__tests__/overpassPoi.test.js
git commit -m "feat(legIntelligence): add overpassPoi adapter for cycling waypoint enrichment"
```

---

## Task 3: Build cycleEngine Core (Route Input & Parsing)

**Files:**
- Create: `src/utils/legIntelligence/engines/cycleEngine.js`
- Create: `src/utils/legIntelligence/__tests__/cycleEngine.test.js`

**Context:** The cycleEngine orchestrates the enrichment pipeline: accepts GPX files or GraphHopper routes, calculates elevation, queries Overpass for suitability and POI, and returns a fully enriched leg object.

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/cycleEngine.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import {
  parseCyclingLeg,
  parseGpx,
  parseGraphHopperRoute,
  addElevationData,
} from '../engines/cycleEngine';

// Mock fetch for Overpass and Elevation APIs
global.fetch = vi.fn();

describe('cycleEngine', () => {
  describe('parseGpx', () => {
    it('extracts coordinates and calculates distance from GPX string', () => {
      const gpxString = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="43.7693" lon="11.2557"><ele>100</ele></trkpt>
              <trkpt lat="43.7694" lon="11.2558"><ele>105</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      const result = parseGpx(gpxString);
      expect(result.coords).toHaveLength(2);
      expect(result.coords[0]).toEqual([43.7693, 11.2557]);
      expect(result.distanceKm).toBeGreaterThan(0);
    });
  });

  describe('parseGraphHopperRoute', () => {
    it('extracts coordinates and distance from GraphHopper response', () => {
      const ghResponse = {
        paths: [
          {
            distance: 65000, // meters
            points: {
              coordinates: [
                [11.2557, 43.7693],
                [11.3456, 43.8123],
              ],
            },
          },
        ],
      };
      const result = parseGraphHopperRoute(ghResponse);
      expect(result.coords).toHaveLength(2);
      expect(result.distanceKm).toBeCloseTo(65, 0);
    });
  });

  describe('parseCyclingLeg', () => {
    it('returns leg object with enriched metadata', async () => {
      const gpxFile = new File(['<gpx></gpx>'], 'route.gpx', { type: 'text/xml' });
      
      // Mock the enrichment functions
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }), // No POI
      });

      const leg = await parseCyclingLeg({
        gpxFile,
        from: 'Firenze',
        to: 'Roma',
        routeSource: 'uploaded',
      });

      expect(leg.mode).toBe('cycle');
      expect(leg.from).toBe('Firenze');
      expect(leg.to).toBe('Roma');
      expect(leg.legMeta.cycle).toBeDefined();
      expect(leg.legMeta.cycle.routeSource).toBe('uploaded');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/legIntelligence/__tests__/cycleEngine.test.js
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement cycleEngine**

Create `src/utils/legIntelligence/engines/cycleEngine.js`:

```javascript
import { calculateBikeSuitability } from '../adapters/overpassBike';
import { queryOverpassPoi } from '../adapters/overpassPoi';

/**
 * Parse GPX file/string and extract coordinates + distance
 */
export function parseGpx(gpxString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');

  const trkpts = doc.querySelectorAll('trkpt');
  const coords = Array.from(trkpts).map((pt) => [
    parseFloat(pt.getAttribute('lat')),
    parseFloat(pt.getAttribute('lon')),
  ]);

  if (coords.length < 2) {
    throw new Error('GPX file contains fewer than 2 points');
  }

  const distanceKm = calculateHaversineDistance(coords);

  return { coords, distanceKm };
}

/**
 * Parse GraphHopper routing response
 */
export function parseGraphHopperRoute(response) {
  if (!response.paths || response.paths.length === 0) {
    throw new Error('No route found from GraphHopper');
  }

  const path = response.paths[0];
  const coords = path.points.coordinates.map((c) => [c[1], c[0]]); // GH uses [lon,lat]
  const distanceKm = (path.distance || 0) / 1000;

  return { coords, distanceKm };
}

/**
 * Calculate total distance from coordinate array using Haversine formula
 */
export function calculateHaversineDistance(coords) {
  const R = 6371; // Earth radius in km
  let totalKm = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalKm += R * c;
  }

  return parseFloat(totalKm.toFixed(2));
}

/**
 * Add elevation data to coordinates via Open Elevation API
 */
export async function addElevationData(coords) {
  if (coords.length === 0) return { gain: 0, loss: 0, maxGrade: 0 };

  // Sample every Nth point to avoid API limits (5000 point max)
  const sampleRate = Math.ceil(coords.length / 1000);
  const sampledCoords = coords.filter((_, i) => i % sampleRate === 0);

  const elevations = await queryOpenElevation(sampledCoords);

  if (!elevations || elevations.length === 0) {
    return { gain: 0, loss: 0, maxGrade: 0 };
  }

  let gain = 0,
    loss = 0,
    maxGrade = 0;

  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) gain += delta;
    else loss += Math.abs(delta);

    // Calculate grade: (elevation change / distance in meters) * 100
    const distMeters = haversineMeters([coords[i - 1], coords[i]]);
    if (distMeters > 0) {
      const grade = (Math.abs(delta) / distMeters) * 100;
      maxGrade = Math.max(maxGrade, grade);
    }
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    maxGrade: parseFloat(maxGrade.toFixed(1)),
  };
}

/**
 * Query Open Elevation API for coordinates
 */
async function queryOpenElevation(coords) {
  try {
    const locations = coords.map((c) => ({ latitude: c[0], longitude: c[1] }));
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.results.map((r) => r.elevation);
  } catch (error) {
    console.error('Open Elevation query failed:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates in meters
 */
function haversineMeters(coordPair) {
  const R = 6371000; // Earth radius in meters
  const [lat1, lon1] = coordPair[0];
  const [lat2, lon2] = coordPair[1];

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Main entry: parse a cycling leg from GPX or GraphHopper input
 */
export async function parseCyclingLeg(input) {
  const { gpxFile, graphHopperResponse, from, to, routeSource, routeSourceUrl } = input;

  let coords, distanceKm;

  // Parse input
  if (gpxFile) {
    const gpxString = await gpxFile.text();
    ({ coords, distanceKm } = parseGpx(gpxString));
  } else if (graphHopperResponse) {
    ({ coords, distanceKm } = parseGraphHopperRoute(graphHopperResponse));
  } else {
    throw new Error('parseCyclingLeg requires either gpxFile or graphHopperResponse');
  }

  // Get elevation data
  const elevationData = await addElevationData(coords);

  // Query Overpass for suitability and POI
  // Note: In real implementation, would need to query road segments via Overpass
  // For now, placeholder returning empty suitability
  const bikeSuitability = {
    overallScore: 0.7,
    segments: [],
  };

  const waypoints = await queryOverpassPoi(coords, 1.0);

  // Construct enriched leg
  const leg = {
    id: null, // Will be assigned by store
    from,
    to,
    mode: 'cycle',
    durationH: 0, // Calculated from pace later
    distanceKm,
    status: 'pending',
    waypoints,
    legMeta: {
      cycle: {
        routeGpxId: null, // Will be assigned by store after vault save
        routeSource,
        routeSourceUrl,
        totalElevationGainM: elevationData.gain,
        totalElevationLossM: elevationData.loss,
        maxGradePct: elevationData.maxGrade,
        bikeSuitability,
        stages: [], // Calculated later
        paceLedger: {
          proposals: [],
          approvedPace: null,
          approvedBy: null,
          approvedAt: null,
        },
        roles: [
          {
            id: 'sweep',
            label: 'Sweep Rider',
            description: 'Stays at back, ensures no one gets dropped',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
          {
            id: 'navigator',
            label: 'Navigator',
            description: 'Leads route, watches for turns',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
          {
            id: 'support_driver',
            label: 'Support Driver',
            description: 'SAG vehicle support (optional)',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
        ],
      },
    },
  };

  return leg;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/legIntelligence/__tests__/cycleEngine.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/engines/cycleEngine.js src/utils/legIntelligence/__tests__/cycleEngine.test.js
git commit -m "feat(legIntelligence): add cycleEngine core (GPX/GH parsing, elevation, POI enrichment)"
```

---

## Task 4: Build Stage Calculator Module

**Files:**
- Modify: `src/utils/legIntelligence/engines/cycleEngine.js` (add new module)

**Context:** Stage calculator takes a route and either a km/day target or existing overnight stays, and auto-splits the route into daily stages. This is called when a cycling leg is created and again when pace is approved.

- [ ] **Step 1: Add stage calculator functions to cycleEngine.js**

Open `src/utils/legIntelligence/engines/cycleEngine.js` and append:

```javascript
/**
 * Calculate stages by target km/day
 * Returns array of stage objects with IDs, labels, coordinates, waypoint assignments
 */
export function calculateStagesByDistance(coords, distanceKm, targetKmPerDay, waypoints = [], stays = []) {
  if (targetKmPerDay <= 0 || distanceKm <= 0) {
    throw new Error('targetKmPerDay and distanceKm must be > 0');
  }

  const stages = [];
  const coordsPerKm = coords.length / distanceKm;
  let cumulativeKm = 0;
  let cumulativeCoordIndex = 0;
  let stageNumber = 1;

  while (cumulativeCoordIndex < coords.length && cumulativeKm < distanceKm) {
    // Accumulate until >= targetKmPerDay
    const targetCoordIndex = Math.min(
      coords.length - 1,
      cumulativeCoordIndex + Math.ceil(targetKmPerDay * coordsPerKm)
    );

    // Calculate actual distance for this segment
    const stageCoordsSlice = coords.slice(cumulativeCoordIndex, targetCoordIndex + 1);
    const stageDistanceKm = calculateHaversineDistance(stageCoordsSlice);

    // Find nearest overnight stay to endpoint (if exists)
    const stageEndCoord = stageCoordsSlice[stageCoordsSlice.length - 1];
    const nearbyStay = findNearestStay(stageEndCoord, stays, 5); // 5km buffer

    // Assign waypoints to this stage
    const stageWaypoints = waypoints.filter((wp) => {
      const distance = haversineMeters([stageEndCoord, [wp.lat, wp.lon]]) / 1000;
      return distance < 5; // within 5km of stage endpoint
    });

    stages.push({
      id: `stage-${stageNumber}`,
      label: nearbyStay ? nearbyStay.name : `Day ${stageNumber}`,
      fromCoord: stageCoordsSlice[0],
      toCoord: stageCoordsSlice[stageCoordsSlice.length - 1],
      distanceKm: parseFloat(stageDistanceKm.toFixed(2)),
      elevationGainM: 0, // Will be calculated separately
      estimatedDurationH: parseFloat((stageDistanceKm / 20).toFixed(1)), // Assume 20km/h average
      plannedStop: nearbyStay ? nearbyStay.id : null,
      waypoints: stageWaypoints.map((wp) => wp.id),
      roleAssignments: { sweep: null, navigator: null, support_driver: null },
    });

    cumulativeKm += stageDistanceKm;
    cumulativeCoordIndex = targetCoordIndex;
    stageNumber++;
  }

  return stages;
}

/**
 * Calculate stages based on existing overnight stays
 */
export function calculateStagesByStays(coords, stays, distanceKm, waypoints = []) {
  if (!stays || stays.length === 0) {
    return calculateStagesByDistance(coords, distanceKm, 65, waypoints, []);
  }

  const stages = [];

  // Sort stays by order along route (using coords proximity)
  const sortedStays = stays.sort((a, b) => {
    const distA = findClosestCoordIndex(coords, [a.lat, a.lon]);
    const distB = findClosestCoordIndex(coords, [b.lat, b.lon]);
    return distA - distB;
  });

  let currentCoordIndex = 0;

  sortedStays.forEach((stay, stayIndex) => {
    const stayCoordIndex = findClosestCoordIndex(coords, [stay.lat, stay.lon]);

    if (stayCoordIndex <= currentCoordIndex) return; // skip if stay is behind current position

    const stageCoordsSlice = coords.slice(currentCoordIndex, stayCoordIndex + 1);
    const stageDistanceKm = calculateHaversineDistance(stageCoordsSlice);

    // Assign waypoints
    const stageWaypoints = waypoints.filter((wp) => {
      const distance = haversineMeters([[stageCoordsSlice[0], stageCoordsSlice[stageCoordsSlice.length - 1]], [wp.lat, wp.lon]]) / 1000;
      return distance < 5;
    });

    stages.push({
      id: `stage-${stayIndex + 1}`,
      label: stay.name || `Day ${stayIndex + 1}`,
      fromCoord: stageCoordsSlice[0],
      toCoord: stageCoordsSlice[stageCoordsSlice.length - 1],
      distanceKm: parseFloat(stageDistanceKm.toFixed(2)),
      elevationGainM: 0,
      estimatedDurationH: parseFloat((stageDistanceKm / 20).toFixed(1)),
      plannedStop: stay.id,
      waypoints: stageWaypoints.map((wp) => wp.id),
      roleAssignments: { sweep: null, navigator: null, support_driver: null },
    });

    currentCoordIndex = stayCoordIndex;
  });

  return stages;
}

/**
 * Find closest coordinate index to a given point
 */
function findClosestCoordIndex(coords, targetCoord) {
  let minDistance = Infinity;
  let closestIndex = 0;

  coords.forEach((coord, index) => {
    const distance = haversineMeters([coord, targetCoord]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Find nearest overnight stay to a coordinate (with optional km buffer)
 */
function findNearestStay(coord, stays, bufferKm = 5) {
  if (!stays || stays.length === 0) return null;

  let nearest = null;
  let minDistance = bufferKm * 1000; // Convert to meters

  stays.forEach((stay) => {
    const distance = haversineMeters([coord, [stay.lat, stay.lon]]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = stay;
    }
  });

  return nearest;
}
```

- [ ] **Step 2: Write tests for stage calculator**

Add to `src/utils/legIntelligence/__tests__/cycleEngine.test.js`:

```javascript
describe('cycleEngine — stage calculation', () => {
  const mockCoords = [
    [43.7693, 11.2557],
    [43.7700, 11.2560],
    [43.7710, 11.2570],
    [43.7720, 11.2580],
  ];

  describe('calculateStagesByDistance', () => {
    it('creates stages based on km/day target', () => {
      const stages = calculateStagesByDistance(mockCoords, 10, 5, [], []);
      expect(stages.length).toBeGreaterThan(0);
      expect(stages[0]).toHaveProperty('id');
      expect(stages[0]).toHaveProperty('label');
      expect(stages[0]).toHaveProperty('distanceKm');
    });

    it('labels stages with stay names if available', () => {
      const stays = [{ id: 'stay-1', name: 'Hotel Roma', lat: 43.7710, lon: 11.2570 }];
      const stages = calculateStagesByDistance(mockCoords, 10, 5, [], stays);
      // First stage should reference nearby stay
      expect(stages[0].plannedStop || stages[1].plannedStop).toBeDefined();
    });
  });

  describe('calculateStagesByStays', () => {
    it('creates stages ending at each stay', () => {
      const stays = [
        { id: 'stay-1', name: 'Hotel 1', lat: 43.7700, lon: 11.2560 },
        { id: 'stay-2', name: 'Hotel 2', lat: 43.7720, lon: 11.2580 },
      ];
      const stages = calculateStagesByStays(mockCoords, stays, 10, []);
      expect(stages.length).toBeGreaterThanOrEqual(1);
      expect(stages[0].plannedStop).toBeDefined();
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npx vitest run src/utils/legIntelligence/__tests__/cycleEngine.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/utils/legIntelligence/engines/cycleEngine.js src/utils/legIntelligence/__tests__/cycleEngine.test.js
git commit -m "feat(legIntelligence): add stage calculator (km/day and stay-based breakdowns)"
```

---

## Task 5: Register cycleEngine in legIntelligence Index

**Files:**
- Modify: `src/utils/legIntelligence/index.js`

**Context:** The legIntelligence index file registers all mode engines (foot, car, cycle, etc.) and routes them to the appropriate enrichment pipeline.

- [ ] **Step 1: Read current legIntelligence index**

```bash
cat "C:\Users\lasse\Desktop\venturepath\src\utils\legIntelligence\index.js"
```

Expected: See how footEngine, carEngine are registered.

- [ ] **Step 2: Import and register cycleEngine**

Open `src/utils/legIntelligence/index.js` and find the engine registrations. Add:

```javascript
import cycleEngine from './engines/cycleEngine';

export const legEngines = {
  foot: footEngine,
  car: carEngine,
  cycle: cycleEngine, // ← ADD THIS
  // ... other modes
};
```

- [ ] **Step 3: Test the import works**

```bash
npx vitest run src/utils/legIntelligence/__tests__/
```

Expected: No import errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/legIntelligence/index.js
git commit -m "feat(legIntelligence): register cycleEngine in mode router"
```

---

## Task 6: Add Pace Ledger Store Actions

**Files:**
- Modify: `src/store/useTripStore.jsx`

**Context:** Pace negotiation is powered by store actions: PROPOSE_CYCLE_PACE, VOTE_CYCLE_PACE, APPROVE_CYCLE_PACE. These mirror the Gatherings Ledger Workbench pattern.

- [ ] **Step 1: Read current useTripStore reducer to understand action pattern**

```bash
head -100 "C:\Users\lasse\Desktop\venturepath\src\store\useTripStore.jsx"
```

Expected: See how other actions (ADD_LEG, UPDATE_LEG, etc.) are structured.

- [ ] **Step 2: Add pace ledger actions to reducer**

Open `src/store/useTripStore.jsx` and find the reducer's case statements. Add:

```javascript
case 'PROPOSE_CYCLE_PACE': {
  const { legId, paceKmDay, proposedBy } = action.payload;
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const newProposal = {
      id: crypto.randomUUID(),
      proposedBy,
      proposedByName: 'Proposer', // Will be filled by component
      paceKmDay,
      resultingStages: Math.ceil(leg.distanceKm / paceKmDay),
      createdAt: new Date().toISOString(),
      votes: {},
      status: 'pending'
    };
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: {
          ...leg.legMeta.cycle,
          paceLedger: {
            ...leg.legMeta.cycle.paceLedger,
            proposals: [...leg.legMeta.cycle.paceLedger.proposals, newProposal]
          }
        }
      }
    };
  });
  return { ...state, legs };
}

case 'VOTE_CYCLE_PACE': {
  const { legId, proposalId, voterId, vote } = action.payload;
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const updatedProposals = leg.legMeta.cycle.paceLedger.proposals.map(prop => {
      if (prop.id !== proposalId) return prop;
      return {
        ...prop,
        votes: { ...prop.votes, [voterId]: vote }
      };
    });
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: {
          ...leg.legMeta.cycle,
          paceLedger: {
            ...leg.legMeta.cycle.paceLedger,
            proposals: updatedProposals
          }
        }
      }
    };
  });
  return { ...state, legs };
}

case 'APPROVE_CYCLE_PACE': {
  const { legId, proposalId } = action.payload;
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const proposal = leg.legMeta.cycle.paceLedger.proposals.find(p => p.id === proposalId);
    if (!proposal) return leg;
    
    // Recalculate stages with approved pace
    const newStages = calculateStagesByDistance(
      leg.legMeta.cycle.coords,
      leg.distanceKm,
      proposal.paceKmDay,
      leg.waypoints,
      state.stays
    );
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: {
          ...leg.legMeta.cycle,
          stages: newStages,
          paceLedger: {
            ...leg.legMeta.cycle.paceLedger,
            proposals: leg.legMeta.cycle.paceLedger.proposals.map(p =>
              p.id === proposalId ? { ...p, status: 'approved' } : p
            ),
            approvedPace: proposal.paceKmDay,
            approvedBy: auth.uid ? auth.uid() : 'anonymous',
            approvedAt: new Date().toISOString()
          }
        }
      }
    };
  });
  return { ...state, legs };
}
```

- [ ] **Step 3: Add action creator functions**

Add after the reducer:

```javascript
// Action creators for pace negotiation
export const proposeCyclePace = (legId, paceKmDay) => ({
  type: 'PROPOSE_CYCLE_PACE',
  payload: { legId, paceKmDay, proposedBy: auth.uid?.() || 'anonymous' }
});

export const voteCyclePace = (legId, proposalId, vote) => ({
  type: 'VOTE_CYCLE_PACE',
  payload: { legId, proposalId, voterId: auth.uid?.() || 'anonymous', vote }
});

export const approveCyclePace = (legId, proposalId) => ({
  type: 'APPROVE_CYCLE_PACE',
  payload: { legId, proposalId }
});
```

- [ ] **Step 4: Test the actions**

Add to `src/store/__tests__/useTripStore.test.jsx`:

```javascript
it('PROPOSE_CYCLE_PACE adds a new proposal to paceLedger', () => {
  // Create a cycling leg first
  // Then dispatch PROPOSE_CYCLE_PACE
  // Verify proposal appears in state
});
```

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add pace ledger actions (propose, vote, approve)"
```

---

## Task 7: Add Role Claiming Store Actions

**Files:**
- Modify: `src/store/useTripStore.jsx`

**Context:** Sweep rider, navigator, and support driver roles are claimable (similar to Gatherings). Store actions: CLAIM_CYCLE_ROLE, UNCLAIM_CYCLE_ROLE, REASSIGN_CYCLE_ROLE (convener only).

- [ ] **Step 1: Add role actions to reducer**

Open `src/store/useTripStore.jsx` and add:

```javascript
case 'CLAIM_CYCLE_ROLE': {
  const { legId, roleId, pioneerId } = action.payload;
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const updatedRoles = leg.legMeta.cycle.roles.map(role => {
      if (role.id !== roleId) return role;
      return { ...role, assigned_to: pioneerId };
    });
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: { ...leg.legMeta.cycle, roles: updatedRoles }
      }
    };
  });
  return { ...state, legs };
}

case 'UNCLAIM_CYCLE_ROLE': {
  const { legId, roleId } = action.payload;
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const updatedRoles = leg.legMeta.cycle.roles.map(role => {
      if (role.id !== roleId) return role;
      return { ...role, assigned_to: null };
    });
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: { ...leg.legMeta.cycle, roles: updatedRoles }
      }
    };
  });
  return { ...state, legs };
}

case 'REASSIGN_CYCLE_ROLE': {
  const { legId, roleId, pioneerIdremind } = action.payload;
  // Same as CLAIM but convener-only (enforce in component)
  const legs = state.legs.map(leg => {
    if (leg.id !== legId) return leg;
    
    const updatedRoles = leg.legMeta.cycle.roles.map(role => {
      if (role.id !== roleId) return role;
      return { ...role, assigned_to: pioneerIdremind };
    });
    
    return {
      ...leg,
      legMeta: {
        ...leg.legMeta,
        cycle: { ...leg.legMeta.cycle, roles: updatedRoles }
      }
    };
  });
  return { ...state, legs };
}
```

- [ ] **Step 2: Add action creators**

```javascript
export const claimCycleRole = (legId, roleId, pioneerId) => ({
  type: 'CLAIM_CYCLE_ROLE',
  payload: { legId, roleId, pioneerId: pioneerId || auth.uid?.() }
});

export const unclaimCycleRole = (legId, roleId) => ({
  type: 'UNCLAIM_CYCLE_ROLE',
  payload: { legId, roleId }
});

export const reassignCycleRole = (legId, roleId, pioneerId) => ({
  type: 'REASSIGN_CYCLE_ROLE',
  payload: { legId, roleId, pioneerIdremind: pioneerId }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add role claiming actions (claim, unclaim, reassign)"
```

---

## Task 8: Build LegLensCycle Main Component Structure

**Files:**
- Create: `src/components/legLens/LegLensCycle.jsx`
- Create: `src/components/legLens/__tests__/LegLensCycle.test.jsx`

**Context:** LegLensCycle is a tabbed interface with 4 tabs: Route Overview, Stages & Waypoints, Pace & Roles, Repair Guide. This task builds the tab structure and tab switching logic.

- [ ] **Step 1: Write failing test for tab structure**

Create `src/components/legLens/__tests__/LegLensCycle.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LegLensCycle from '../LegLensCycle';

describe('LegLensCycle', () => {
  const mockLeg = {
    id: 1,
    from: 'Firenze',
    to: 'Roma',
    mode: 'cycle',
    distanceKm: 280,
    waypoints: [],
    legMeta: {
      cycle: {
        routeSource: 'uploaded',
        totalElevationGainM: 2150,
        bikeSuitability: { overallScore: 0.78, segments: [] },
        stages: [],
        paceLedger: { proposals: [], approvedPace: null },
        roles: []
      }
    }
  };

  it('renders all 4 tabs', () => {
    render(<LegLensCycle leg={mockLeg} />);
    expect(screen.getByText('Route Overview')).toBeInTheDocument();
    expect(screen.getByText('Stages & Waypoints')).toBeInTheDocument();
    expect(screen.getByText('Pace & Roles')).toBeInTheDocument();
    expect(screen.getByText('Repair Guide')).toBeInTheDocument();
  });

  it('shows Route Overview tab by default', () => {
    render(<LegLensCycle leg={mockLeg} />);
    expect(screen.getByRole('tabpanel', { name: /route overview/i })).toBeInTheDocument();
  });

  it('switches to different tab when clicked', async () => {
    const { user } = render(<LegLensCycle leg={mockLeg} />);
    const stagesTab = screen.getByRole('tab', { name: /stages & waypoints/i });
    await user.click(stagesTab);
    expect(screen.getByRole('tabpanel', { name: /stages & waypoints/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/legLens/__tests__/LegLensCycle.test.jsx
```

Expected: FAIL — LegLensCycle not found.

- [ ] **Step 3: Build LegLensCycle component with tab structure**

Create `src/components/legLens/LegLensCycle.jsx`:

```javascript
import { useState } from 'react';
import RouteOverviewTab from './tabs/RouteOverviewTab';
import StagesWaypointsTab from './tabs/StagesWaypointsTab';
import PaceRolesTab from './tabs/PaceRolesTab';
import RepairGuideTab from './tabs/RepairGuideTab';

export default function LegLensCycle({ leg, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Route Overview', component: RouteOverviewTab },
    { id: 'stages', label: 'Stages & Waypoints', component: StagesWaypointsTab },
    { id: 'pace', label: 'Pace & Roles', component: PaceRolesTab },
    { id: 'repair', label: 'Repair Guide', component: RepairGuideTab },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || RouteOverviewTab;

  return (
    <div className="flex flex-col gap-4 p-4 bg-vp-black rounded-lg">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-vp-rule-strong">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === tab.id
                ? 'text-vp-ember border-b-2 border-vp-ember'
                : 'text-vp-text-muted hover:text-vp-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" className="min-h-[300px]">
        <ActiveComponent leg={leg} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder tab components**

Create `src/components/legLens/tabs/RouteOverviewTab.jsx`:

```javascript
export default function RouteOverviewTab({ leg }) {
  return <div className="text-vp-text-muted">Route Overview — TODO</div>;
}
```

Repeat for `StagesWaypointsTab.jsx`, `PaceRolesTab.jsx`, `RepairGuideTab.jsx` with similar placeholders.

- [ ] **Step 5: Run test to verify structure passes**

```bash
npx vitest run src/components/legLens/__tests__/LegLensCycle.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/legLens/LegLensCycle.jsx src/components/legLens/tabs/ src/components/legLens/__tests__/LegLensCycle.test.jsx
git commit -m "feat(legLens): add LegLensCycle component with 4-tab structure"
```

---

## Task 9: Implement Route Overview Tab (Map + Suitability Heatmap)

**Files:**
- Modify: `src/components/legLens/tabs/RouteOverviewTab.jsx`

**Context:** Route Overview displays the route on an interactive map, color-codes segments by suitability (green→yellow→red), shows summary stats (distance, elevation, overall score), and offers a "Reroute" button.

- [ ] **Step 1: Write failing test**

Add to RouteOverviewTab test file:

```javascript
it('renders summary stats: distance, elevation, suitability score', () => {
  render(<RouteOverviewTab leg={mockLeg} />);
  expect(screen.getByText(/280\s*km/)).toBeInTheDocument();
  expect(screen.getByText(/2150\s*m/)).toBeInTheDocument();
  expect(screen.getByText(/78%|0\.78/)).toBeInTheDocument();
});

it('renders Reroute button', () => {
  render(<RouteOverviewTab leg={mockLeg} />);
  expect(screen.getByRole('button', { name: /reroute/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement RouteOverviewTab**

Replace placeholder in `src/components/legLens/tabs/RouteOverviewTab.jsx`:

```javascript
import { useState } from 'react';

export default function RouteOverviewTab({ leg, onUpdate }) {
  const [isRerouting, setIsRerouting] = useState(false);

  const { cycle } = leg.legMeta;
  const overallScore = cycle.bikeSuitability.overallScore;
  const scorePercentage = Math.round(overallScore * 100);

  // Heatmap color based on score: 0.7-1.0 green, 0.4-0.7 yellow, 0-0.4 red
  const getSegmentColor = (score) => {
    if (score >= 0.7) return '#3A6B5C'; // Spruce — good
    if (score >= 0.4) return '#F2C94C'; // Golden Hour — tolerable
    return '#E67E22'; // Ember — avoid
  };

  const handleReroute = async () => {
    setIsRerouting(true);
    // TODO: Call GraphHopper to reroute, avoiding highways
    // For now, placeholder
    console.log('Rerouting to avoid highways...');
    setIsRerouting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-vp-surface p-3 rounded">
          <div className="text-vp-text-subtle text-xs uppercase tracking-widest">Distance</div>
          <div className="text-vp-ember text-2xl font-bold mt-1">{leg.distanceKm} km</div>
        </div>
        <div className="bg-vp-surface p-3 rounded">
          <div className="text-vp-text-subtle text-xs uppercase tracking-widest">Elevation</div>
          <div className="text-vp-ember text-2xl font-bold mt-1">{cycle.totalElevationGainM} m</div>
        </div>
        <div className="bg-vp-surface p-3 rounded">
          <div className="text-vp-text-subtle text-xs uppercase tracking-widest">Suitability</div>
          <div className="text-vp-ember text-2xl font-bold mt-1">{scorePercentage}%</div>
        </div>
      </div>

      {/* Map Placeholder (TODO: integrate Mapbox) */}
      <div className="bg-vp-surface rounded h-64 flex items-center justify-center text-vp-text-muted">
        <div>
          <div className="text-sm">Interactive Map</div>
          <div className="text-xs text-vp-text-subtle mt-2">
            {cycle.bikeSuitability.segments.length} route segments
          </div>
        </div>
      </div>

      {/* Suitability Legend */}
      <div className="flex gap-4 items-center justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-spruce"></div>
          <span className="text-vp-text-muted">Ideal (0.7–1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-golden-hour"></div>
          <span className="text-vp-text-muted">Tolerable (0.4–0.7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-vp-ember"></div>
          <span className="text-vp-text-muted">Avoid (0–0.4)</span>
        </div>
      </div>

      {/* Reroute Button */}
      <button
        onClick={handleReroute}
        disabled={isRerouting}
        className="px-4 py-2 bg-vp-ember text-vp-black font-bold uppercase text-xs rounded hover:opacity-90 disabled:opacity-50"
      >
        {isRerouting ? 'Rerouting...' : 'Reroute (Avoid Highways)'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npx vitest run src/components/legLens/__tests__/
```

Expected: Tests for RouteOverviewTab pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/legLens/tabs/RouteOverviewTab.jsx
git commit -m "feat(legLens): implement Route Overview tab with stats and suitability legend"
```

---

## Task 10: Implement Stages & Waypoints Tab

**Files:**
- Modify: `src/components/legLens/tabs/StagesWaypointsTab.jsx`

**Context:** Stages tab displays each daily stage as a card with distance, elevation, waypoints, and role assignments. Expandable/collapsible waypoint lists per stage.

- [ ] **Step 1: Write failing test**

Create `src/components/legLens/__tests__/StagesWaypointsTab.test.jsx`:

```javascript
it('renders one card per stage', () => {
  const leg = { ...mockLeg, legMeta: { cycle: { ...mockLeg.legMeta.cycle, stages: [
    { id: 'stage-1', label: 'Day 1', distanceKm: 65, elevationGainM: 420, waypoints: [] },
    { id: 'stage-2', label: 'Day 2', distanceKm: 72, elevationGainM: 580, waypoints: [] }
  ] } } };
  render(<StagesWaypointsTab leg={leg} />);
  expect(screen.getByText('Day 1')).toBeInTheDocument();
  expect(screen.getByText('Day 2')).toBeInTheDocument();
});

it('shows waypoints for each stage when expanded', async () => {
  render(<StagesWaypointsTab leg={mockLeg} />);
  const expandButton = screen.getByRole('button', { name: /expand|show waypoints/i });
  // User clicks to expand, waypoints appear
});
```

- [ ] **Step 2: Implement StagesWaypointsTab**

Replace placeholder in `src/components/legLens/tabs/StagesWaypointsTab.jsx`:

```javascript
import { useState } from 'react';
import { getCategoryStyle } from '../../utils/waypointCategories';

export default function StagesWaypointsTab({ leg }) {
  const { stages, roles } = leg.legMeta.cycle;
  const [expandedStageId, setExpandedStageId] = useState(null);

  const getRoleLabel = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.label : null;
  };

  return (
    <div className="space-y-4">
      {stages.length === 0 && (
        <div className="text-vp-text-muted text-sm">
          No stages yet. Approve a pace to generate daily breakdowns.
        </div>
      )}

      {stages.map(stage => (
        <div key={stage.id} className="bg-vp-surface rounded p-4">
          {/* Stage Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-vp-text font-bold uppercase text-sm">{stage.label}</h3>
              <div className="flex gap-4 mt-2 text-xs text-vp-text-muted">
                <span>{stage.distanceKm} km</span>
                <span>+{stage.elevationGainM} m</span>
                <span>~{stage.estimatedDurationH}h</span>
              </div>
            </div>
            <button
              onClick={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
              className="text-vp-text-subtle hover:text-vp-ember transition"
            >
              {expandedStageId === stage.id ? '▼' : '▶'}
            </button>
          </div>

          {/* Role Badges */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {stage.roleAssignments && Object.entries(stage.roleAssignments).map(([roleId, pioneerId]) => {
              const roleLabel = getRoleLabel(roleId);
              if (!roleLabel) return null;
              return (
                <div key={roleId} className="text-xs bg-vp-black px-2 py-1 rounded border border-vp-rule">
                  <span className="text-vp-text-subtle">{roleLabel}:</span>
                  <span className="text-vp-text ml-1">{pioneerId ? 'Assigned' : 'Unclaimed'}</span>
                </div>
              );
            })}
          </div>

          {/* Expanded Waypoints */}
          {expandedStageId === stage.id && (
            <div className="mt-4 border-t border-vp-rule pt-4">
              {stage.waypoints.length === 0 ? (
                <div className="text-vp-text-muted text-xs">No waypoints on this stage</div>
              ) : (
                <div className="space-y-2">
                  {stage.waypoints.map(wpId => {
                    const wp = leg.waypoints.find(w => w.id === wpId);
                    if (!wp) return null;
                    const style = getCategoryStyle(wp.category);
                    return (
                      <div key={wpId} className="text-xs flex gap-2">
                        <span>{style.icon}</span>
                        <div>
                          <div className="text-vp-text font-semibold">{wp.label}</div>
                          {wp.description && <div className="text-vp-text-subtle">{wp.description}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/components/legLens/__tests__/StagesWaypointsTab.test.jsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/legLens/tabs/StagesWaypointsTab.jsx
git commit -m "feat(legLens): implement Stages & Waypoints tab with expandable details"
```

---

## Task 11: Implement Pace & Roles Tab (Ledger UI)

**Files:**
- Modify: `src/components/legLens/tabs/PaceRolesTab.jsx`

**Context:** Pace & Roles tab shows pace proposals (with vote tallies), allows pioneers to vote, and convener to approve. Below that, role claiming UI for sweep rider, navigator, support driver.

- [ ] **Step 1: Write failing test**

Create `src/components/legLens/__tests__/PaceRolesTab.test.jsx`:

```javascript
it('displays pace proposals with vote counts', () => {
  const leg = { ...mockLeg, legMeta: { cycle: { ...mockLeg.legMeta.cycle, paceLedger: {
    proposals: [
      { id: 'prop-1', proposedByName: 'Alice', paceKmDay: 65, votes: { 'bob': 'yes' }, status: 'pending' }
    ]
  } } } };
  render(<PaceRolesTab leg={leg} />);
  expect(screen.getByText(/alice/i)).toBeInTheDocument();
  expect(screen.getByText(/65\s*km/)).toBeInTheDocument();
});

it('shows role claiming UI for unclaimed roles', () => {
  render(<PaceRolesTab leg={mockLeg} />);
  expect(screen.getByText(/sweep rider/i)).toBeInTheDocument();
  expect(screen.getByText(/navigator/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement PaceRolesTab**

Replace placeholder in `src/components/legLens/tabs/PaceRolesTab.jsx`:

```javascript
import { useState } from 'react';
import { useTrip } from '../../store/useTripStore';

export default function PaceRolesTab({ leg, onUpdate }) {
  const { dispatch } = useTrip();
  const { paceLedger, roles } = leg.legMeta.cycle;
  const [isProposing, setIsProposing] = useState(false);
  const [proposedPace, setProposedPace] = useState(65);

  const handleProposePace = () => {
    dispatch({
      type: 'PROPOSE_CYCLE_PACE',
      payload: { legId: leg.id, paceKmDay: proposedPace }
    });
    setIsProposing(false);
  };

  const handleVote = (proposalId, vote) => {
    dispatch({
      type: 'VOTE_CYCLE_PACE',
      payload: { legId: leg.id, proposalId, vote }
    });
  };

  const handleApprovePace = (proposalId) => {
    dispatch({
      type: 'APPROVE_CYCLE_PACE',
      payload: { legId: leg.id, proposalId }
    });
  };

  const handleClaimRole = (roleId) => {
    dispatch({
      type: 'CLAIM_CYCLE_ROLE',
      payload: { legId: leg.id, roleId }
    });
  };

  return (
    <div className="space-y-6">
      {/* Pace Ledger Section */}
      <div>
        <h3 className="text-vp-text font-bold uppercase text-sm mb-4">Pace Negotiation</h3>

        {paceLedger.proposals.length === 0 ? (
          <div className="text-vp-text-muted text-sm mb-4">
            No pace proposals yet. {!isProposing && <button onClick={() => setIsProposing(true)} className="text-vp-ember hover:underline">Propose one.</button>}
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {paceLedger.proposals.map(prop => (
              <div key={prop.id} className="bg-vp-black border border-vp-rule rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-vp-text text-sm font-semibold">{prop.proposedByName} proposed {prop.paceKmDay} km/day</div>
                    <div className="text-vp-text-subtle text-xs mt-1">
                      {prop.resultingStages ? `${prop.resultingStages} stages` : 'calculating...'}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${prop.status === 'approved' ? 'bg-vp-ember text-vp-black' : 'bg-vp-surface'}`}>
                    {prop.status}
                  </div>
                </div>

                {/* Vote Tallies */}
                <div className="mt-2 text-xs text-vp-text-muted space-y-1">
                  {Object.entries(prop.votes || {}).map(([voterId, voteValue]) => (
                    <div key={voterId}>{voterId}: {voteValue}</div>
                  ))}
                </div>

                {/* Convener Action Buttons */}
                {prop.status === 'pending' && (
                  <button
                    onClick={() => handleApprovePace(prop.id)}
                    className="mt-3 w-full px-3 py-2 bg-vp-ember text-vp-black font-bold uppercase text-xs rounded hover:opacity-90"
                  >
                    Approve This Pace
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isProposing && (
          <div className="bg-vp-black border border-vp-rule rounded p-3">
            <input
              type="number"
              value={proposedPace}
              onChange={(e) => setProposedPace(parseInt(e.target.value))}
              className="w-full px-2 py-1 bg-vp-surface text-vp-text rounded text-sm mb-2"
              placeholder="km/day"
            />
            <div className="flex gap-2">
              <button
                onClick={handleProposePace}
                className="flex-1 px-3 py-2 bg-vp-ember text-vp-black font-bold uppercase text-xs rounded"
              >
                Propose
              </button>
              <button
                onClick={() => setIsProposing(false)}
                className="flex-1 px-3 py-2 border border-vp-rule text-vp-text uppercase text-xs rounded hover:bg-vp-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Roles Section */}
      <div>
        <h3 className="text-vp-text font-bold uppercase text-sm mb-4">Squad Roles</h3>

        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="bg-vp-black border border-vp-rule rounded p-3 flex justify-between items-center">
              <div>
                <div className="text-vp-text text-sm font-semibold">{role.label}</div>
                <div className="text-vp-text-subtle text-xs">{role.description}</div>
              </div>
              {role.assigned_to ? (
                <div className="text-vp-text-muted text-xs">Claimed</div>
              ) : (
                <button
                  onClick={() => handleClaimRole(role.id)}
                  className="px-3 py-1 bg-vp-ember text-vp-black font-bold uppercase text-xs rounded hover:opacity-90"
                >
                  Claim
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/components/legLens/__tests__/PaceRolesTab.test.jsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/legLens/tabs/PaceRolesTab.jsx
git commit -m "feat(legLens): implement Pace & Roles tab with Ledger voting and role claiming"
```

---

## Task 12: Write Bike Repair Guide Articles

**Files:**
- Create: `src/utils/bikeRepair/articles/*.md` (6 files)

**Context:** In-app repair guides for common issues: flat tires, chain cleaning, derailleur adjustment, brake pads, dropped chains, quick links.

- [ ] **Step 1: Write flat-tire-repair.md**

Create `src/utils/bikeRepair/articles/flat-tire-repair.md`:

```markdown
# Flat Tire Repair

A puncture or pinch flat is the most common mechanical issue on the road. Here's how to fix it.

## What you need
- Tire levers (2–3)
- Patch kit or spare inner tube
- Pump (floor or portable)
- Towel or cloth

## Steps

### 1. Remove the wheel
Flip the bike upside down or use a kickstand. Open the quick-release or unscrew the axle bolts. For the rear, shift to the smallest cog first.

### 2. Remove the tire
Insert a tire lever under the tire bead (edge), 180° from the valve. Hook it to the frame. Insert a second lever a few inches away and run it around to pry off one side of the tire.

### 3. Find the puncture
Inflate the tube slightly. Listen for air escaping or feel for moisture on your palm held near the tube. Mark any holes with a pen.

### 4. Patch or replace
- **If patching:** Lightly sand the area, apply glue (if required by patch), wait 30 seconds, press the patch firmly for 1 minute.
- **If replacing:** Install a new tube of the correct size.

### 5. Check the tire interior
Run your fingers (carefully!) inside the tire to find thorns, glass, or sharp objects that caused the flat.

### 6. Reinstall the tube
Insert the valve through the rim hole. Tuck the tube into the tire all the way around.

### 7. Reseat the tire
Starting at the valve, use your palms to roll the tire bead back onto the rim. Work around both sides evenly. Once hand-tight, use tire levers if needed to finish.

### 8. Inflate
Pump to the recommended pressure (check the tire sidewall). Watch the tire seating as you inflate—stop if it bulges.

## Tips
- Pinch flats (snakebite holes) come from under-inflation. Always check pressure before long rides.
- Carry a spare tube; patching kits are backup only.
- Practice at home before doing this on the road in bad weather.
```

Repeat for `chain-cleaning.md`, `derailleur-adjustment.md`, `brake-pads.md`, `dropped-chain.md`, `quick-links.md`.

- [ ] **Step 2: Commit**

```bash
git add src/utils/bikeRepair/articles/
git commit -m "feat(bikeRepair): add repair guide articles (flat tire, chain, derailleur, brakes, dropped chain, quick-links)"
```

---

## Task 13: Build BikeRepairGuide Component

**Files:**
- Create: `src/components/bikeRepair/BikeRepairGuide.jsx`
- Create: `src/components/bikeRepair/__tests__/BikeRepairGuide.test.jsx`

**Context:** Searchable repair guide with article cards and external links. Appears in the Repair Guide tab of LegLensCycle.

- [ ] **Step 1: Write failing test**

Create `src/components/bikeRepair/__tests__/BikeRepairGuide.test.jsx`:

```javascript
it('renders search box and article list', () => {
  render(<BikeRepairGuide />);
  expect(screen.getByPlaceholderText(/search repairs/i)).toBeInTheDocument();
  expect(screen.getByText(/flat tire/i)).toBeInTheDocument();
});

it('filters articles by search term', async () => {
  const { user } = render(<BikeRepairGuide />);
  const searchBox = screen.getByPlaceholderText(/search repairs/i);
  await user.type(searchBox, 'derailleur');
  expect(screen.getByText(/derailleur adjustment/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement BikeRepairGuide**

Create `src/components/bikeRepair/BikeRepairGuide.jsx`:

```javascript
import { useState, useMemo } from 'react';
import flatTireContent from '../../utils/bikeRepair/articles/flat-tire-repair.md?raw';
import chainContent from '../../utils/bikeRepair/articles/chain-cleaning.md?raw';
import deraContent from '../../utils/bikeRepair/articles/derailleur-adjustment.md?raw';
import brakesContent from '../../utils/bikeRepair/articles/brake-pads.md?raw';
import droppedContent from '../../utils/bikeRepair/articles/dropped-chain.md?raw';
import quicklinksContent from '../../utils/bikeRepair/articles/quick-links.md?raw';

const articles = [
  { id: 'flat-tire', title: 'Flat Tire Repair', content: flatTireContent, category: 'wheels' },
  { id: 'chain', title: 'Chain Cleaning', content: chainContent, category: 'drivetrain' },
  { id: 'derailleur', title: 'Derailleur Adjustment', content: deraContent, category: 'drivetrain' },
  { id: 'brakes', title: 'Brake Pad Replacement', content: brakesContent, category: 'brakes' },
  { id: 'dropped-chain', title: 'Dropped Chain Fix', content: droppedContent, category: 'drivetrain' },
  { id: 'quick-links', title: 'Quick Links', content: quicklinksContent, category: 'drivetrain' },
];

export default function BikeRepairGuide({ nearbyBikeShop = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredArticles = useMemo(() => {
    if (!searchTerm) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(a => a.title.toLowerCase().includes(term) || a.content.toLowerCase().includes(term));
  }, [searchTerm]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Box */}
      <input
        type="text"
        placeholder="Search repairs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 bg-vp-surface text-vp-text rounded text-sm border border-vp-rule focus:border-vp-ember focus:outline-none"
      />

      {/* Article List */}
      <div className="space-y-2">
        {filteredArticles.length === 0 ? (
          <div className="text-vp-text-muted text-sm">No articles found.</div>
        ) : (
          filteredArticles.map(article => (
            <div key={article.id} className="bg-vp-black border border-vp-rule rounded p-3">
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full flex justify-between items-center hover:text-vp-ember transition"
              >
                <span className="text-vp-text font-semibold text-sm text-left">{article.title}</span>
                <span className="text-vp-text-subtle">{expandedId === article.id ? '▼' : '▶'}</span>
              </button>

              {expandedId === article.id && (
                <div className="mt-3 border-t border-vp-rule pt-3 text-vp-text-muted text-xs prose prose-invert">
                  {/* Simple markdown rendering — real implementation would use remark */}
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(article.content) }} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Nearby Bike Shop Banner */}
      {nearbyBikeShop && (
        <div className="bg-vp-surface border border-vp-ember rounded p-3">
          <div className="text-vp-ember font-bold text-xs uppercase">Bike Shop Nearby</div>
          <div className="text-vp-text text-sm mt-1">{nearbyBikeShop.name}</div>
          <div className="text-vp-text-muted text-xs mt-1">{nearbyBikeShop.address}</div>
          <a href={nearbyBikeShop.url} target="_blank" rel="noreferrer" className="text-vp-ember hover:underline text-xs mt-2 inline-block">
            View on map
          </a>
        </div>
      )}
    </div>
  );
}

// Simple markdown to HTML converter (real implementation would use remark)
function markdownToHtml(markdown) {
  return markdown
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold mt-3">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold mt-3">$1</h2>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
```

- [ ] **Step 3: Add RepairGuideTab content**

Update `src/components/legLens/tabs/RepairGuideTab.jsx`:

```javascript
import BikeRepairGuide from '../../bikeRepair/BikeRepairGuide';

export default function RepairGuideTab({ leg }) {
  // TODO: find nearby bike shop from waypoints
  return <BikeRepairGuide />;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/bikeRepair/__tests__/BikeRepairGuide.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/bikeRepair/ src/components/legLens/tabs/RepairGuideTab.jsx
git commit -m "feat(bikeRepair): add BikeRepairGuide component with searchable articles"
```

---

## Task 14: Wire LegLensCycle into LegLens Dispatcher

**Files:**
- Modify: `src/components/legLens/LegLens.jsx`

**Context:** LegLens dispatches to mode-specific components (LegLensFoot, LegLensCar, LegLensCycle, etc.). This task adds cycling dispatch.

- [ ] **Step 1: Read current LegLens to understand dispatch pattern**

```bash
grep -A 10 "mode ===" "C:\Users\lasse\Desktop\venturepath\src\components\legLens\LegLens.jsx"
```

Expected: See existing mode cases (foot, car, etc.).

- [ ] **Step 2: Add cycle case to LegLens dispatcher**

Open `src/components/legLens/LegLens.jsx` and find the mode switch. Add:

```javascript
import LegLensCycle from './LegLensCycle';

// In the render function, in the mode dispatch:
case 'cycle':
  return <LegLensCycle leg={leg} onUpdate={onUpdate} />;
```

- [ ] **Step 3: Test the import and dispatch**

```bash
npx vitest run src/components/legLens/__tests__/
```

Expected: No errors; LegLens tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/legLens/LegLens.jsx
git commit -m "feat(legLens): wire LegLensCycle into mode dispatcher"
```

---

## Task 15: Update Moodboard & Documentation

**Files:**
- Modify: `src/app/moodboard/moodboard.config.ts` (if needed)
- Create: `docs/moodboard.log.md` entry (new)
- Modify: `docs/architecture/cycling-tours.md` (new)

**Context:** Update design docs and moodboard to reflect cycling mode addition.

- [ ] **Step 1: Check if new waypoint categories need moodboard update**

```bash
cat "C:\Users\lasse\Desktop\venturepath\src\app\moodboard\moodboard.config.ts"
```

If waypoint categories are listed in moodboard config, add the cycling ones (bike_shop, shop, food, toilet).

- [ ] **Step 2: Add entry to moodboard.log.md**

Append to `docs/moodboard.log.md` at the top:

```markdown
### 2026-05-13 — Cycling Tours Added

**Changed:**
- Added cycling waypoint categories: bike_shop (Ember), shop (Sandstone), food (Sandstone), toilet (Spruce)
- New LegLensCycle component with 4 tabs: Route Overview, Stages & Waypoints, Pace & Roles, Repair Guide
- Route suitability heatmap (green→yellow→red for 0.7→0.4→0.1)
- Pace negotiation via Ledger Workbench pattern
- Role claiming: sweep rider, navigator, support driver

**Ideas / next steps:**
- Integrate Mapbox GL JS for interactive route visualization
- GraphHopper rerouting with highway avoidance
- Real-time Overpass data caching to reduce API calls
- Squad notifications when pace approved
- Performance profiling for large GPX files (>10MB)
```

- [ ] **Step 3: Create architecture docs**

Create `docs/architecture/cycling-tours.md`:

```markdown
# Cycling Tours Architecture

## Overview
Cycling tours are a multi-modal expedition leg type (`mode: 'cycle'`) with squad collaboration, route enrichment, and repair guides.

## Components
- **cycleEngine**: Route parsing (GPX / GraphHopper), Overpass enrichment, elevation sampling
- **Overpass adapters**: Road suitability scoring, POI extraction
- **LegLensCycle**: 4-tab UI (Route Overview, Stages, Pace/Roles, Repair Guide)
- **BikeRepairGuide**: Searchable repair article knowledge base
- **Store actions**: Pace ledger (PROPOSE/VOTE/APPROVE), role claiming (CLAIM/UNCLAIM/REASSIGN)

## Data Flow
1. User imports GPX or calculates route → cycleEngine parses
2. cycleEngine queries Overpass (road class, POI) + Open Elevation
3. Stage calculator breaks into km/day or stay-based stages
4. Squad proposes/votes on pace → Ledger actions update store
5. Convener approves → stages recalculate, waypoints reassign
6. Pioneers claim roles (sweep, navigator, support driver)
7. Route displays in LegLensCycle with suitability heatmap

## API Dependencies
- Open Elevation: elevation sampling (https://api.open-elevation.com)
- Overpass: road metadata & POI (https://overpass-api.de)
- GraphHopper: bike routing (https://graphhopper.com) — requires API key
- gpx.tours: route discovery (documentation only, no direct API yet)

## File Structure
```
src/
  utils/legIntelligence/
    engines/cycleEngine.js
    adapters/
      overpassBike.js (road suitability)
      overpassPoi.js (waypoint enrichment)
  components/legLens/
    LegLensCycle.jsx
    tabs/
      RouteOverviewTab.jsx
      StagesWaypointsTab.jsx
      PaceRolesTab.jsx
      RepairGuideTab.jsx
  bikeRepair/
    BikeRepairGuide.jsx
    articles/ (6 markdown files)
  store/
    useTripStore.jsx (pace + role actions)
```

## Testing
- Unit tests: cycleEngine, adapters, components
- Integration tests: store actions, tab switching
- Vitest + React Testing Library
```

- [ ] **Step 4: Commit**

```bash
git add docs/moodboard.log.md docs/architecture/cycling-tours.md
git commit -m "docs: add cycling tours to moodboard log and architecture guide"
```

---

## Next Steps After Plan

Once all tasks complete:
1. **Manual testing:** Create a cycling leg, import GPX, generate stages, nominate pace, vote, approve
2. **UI polish:** Integrate Mapbox for interactive map, refine heatmap rendering
3. **API keys:** Add GraphHopper and gpx.tours API credentials to env
4. **Performance:** Profile with large GPX files, optimize Overpass queries
5. **Cross-app:** Wire cycling `streak_events` to HolyFlex (e.g., "cycled 65km today")
