// used by onStopAdded() — added to this file in Task 5
import sentinelBus from './sentinelBus.js';
import { HOMEBASE_STOP_ADDED } from './sentinelBusEvents.js';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── buildLegs ─────────────────────────────────────────────────────────────────
// Pure function — no store access, no side effects.
// Returns array of legs: homebase → stop[0] → ... → stop[n] → homebase.
// All legs tagged source:'homebase-engine' so the engine can safely rebuild them.
export function buildLegs(dayLoopId, homebaseCoords, stops) {
  if (!stops.length) return [];

  const points = [
    { id: 'homebase', name: 'Homebase', coords: homebaseCoords },
    ...stops,
    { id: 'homebase', name: 'Homebase', coords: homebaseCoords },
  ];

  return points.slice(0, -1).map((from, i) => {
    const to = points[i + 1];
    const dist = haversineKm(from.coords, to.coords);
    return {
      id: crypto.randomUUID(),
      dayLoopId,
      source: 'homebase-engine',
      from: from.id,
      fromName: from.name,
      toId: to.id,
      toName: to.name,
      mode: 'foot',
      status: 'pending',
      distanceKm: parseFloat(dist.toFixed(2)),
      durationH: parseFloat((dist / 5).toFixed(2)), // ~5 km/h walk
    };
  });
}

// ── Packing suggestions by POI category ──────────────────────────────────────
const PACKING_HINTS = {
  museum:     ['Comfortable shoes', 'Water bottle'],
  beach:      ['Sunscreen', 'Towel', 'Swimwear'],
  hiking:     ['Trail shoes', 'Rain jacket', 'Snacks'],
  park:       ['Sunscreen', 'Comfortable shoes'],
  restaurant: ['Smart casual top'],
  bar:        ['Smart casual top'],
  district:   ['Comfortable shoes', 'Camera'],
  default:    ['Comfortable shoes'],
};

function packingHints(category) {
  return PACKING_HINTS[category] ?? PACKING_HINTS.default;
}

// Transit cost estimate: €0.30/km, min €1.50 per leg
function estimateCost(legs) {
  return legs.reduce((sum, l) => sum + Math.max(1.5, l.distanceKm * 0.3), 0);
}

// ── buildCascadePreviews ──────────────────────────────────────────────────────
// Returns { [toolKey]: { label, value, apply(dispatch) } }
// apply() is called when the Pioneer confirms (Semi) or immediately (Full).
export function buildCascadePreviews(payload) {
  // tripClimate available via payload.tripClimate — reserved for climate-aware packing in a future task
  const { dayLoopId, stop, legs } = payload;
  const cost = estimateCost(legs);
  const items = packingHints(stop.category ?? 'default');

  return {
    budget: {
      label: '💰 Budget',
      value: `+€${cost.toFixed(2)}`,
      apply: (dispatch) => dispatch({
        type: 'ADD_BUDGET_ITEM',
        payload: { label: `Transit · ${stop.name}`, amount: cost, currency: 'EUR', dayLoopId },
      }),
    },
    packing: {
      label: '🎒 Packing',
      value: `${items.length} item${items.length !== 1 ? 's' : ''} suggested`,
      apply: () => {
        // PackingManifest listens to HOMEBASE_STOP_ADDED directly for suggestions
      },
    },
    map: {
      label: '🗺️ Route',
      value: `${payload.totalDistanceKm.toFixed(1)} km loop`,
      apply: () => {
        // LiveMap re-renders reactively from store.dayLoops — no action needed
      },
    },
    elevation: {
      label: '⛰️ Elevation',
      value: 'Profile updating...',
      apply: () => {
        // ElevationStrip subscribes to HOMEBASE_STOP_ADDED and fetches independently
      },
    },
    transit: {
      label: '🚌 Transit',
      value: 'Fetching times...',
      apply: () => {
        // TransitPlanner subscribes to HOMEBASE_STOP_ADDED and fetches independently
      },
    },
    tactical: {
      label: '🛡️ Tactical',
      value: 'Caching area...',
      apply: () => {
        // TacticalCache prefetch fires via the bus listener (non-blocking)
      },
    },
    squad: {
      label: '👥 Squad',
      value: 'Notifying...',
      apply: () => {
        // SquadSync broadcasts via Supabase realtime (bus listener)
      },
    },
    ledger: {
      label: '⚖️ Ledger',
      value: 'Checking conflicts...',
      apply: () => {
        // LedgerWorkbench checks preferences (bus listener)
      },
    },
  };
}

// ── onStopAdded ───────────────────────────────────────────────────────────────
// Called by AddStopFlow after addStopToDayLoop() has updated the store.
// { dayLoop, stop, homebaseCoords, allStops, mode, dispatch }
//   mode: effective planning mode (dayLoop.planningMode ?? trip.planningMode)
//   allStops: resolved POI objects for all stopIds in the dayLoop
//   dispatch: the store dispatch function
export function onStopAdded({ dayLoop, stop, homebaseCoords, allStops, mode, dispatch }) {
  if (mode === 'manual') {
    // Emit event so tools can observe the stop was added, but do not build legs or cascade
    sentinelBus.emit(HOMEBASE_STOP_ADDED, {
      dayLoopId: dayLoop.id,
      dayLoop,
      stop,
      legs: [],
      homebaseCoords,
      totalDistanceKm: 0,
      mode,
    });
    return { previews: null, legs: [] };
  }

  const legs = buildLegs(dayLoop.id, homebaseCoords, allStops);
  const totalDistanceKm = legs.reduce((s, l) => s + l.distanceKm, 0);

  const payload = {
    dayLoopId: dayLoop.id,
    dayLoop,
    stop,
    legs,
    homebaseCoords,
    totalDistanceKm,
    mode,
  };

  // Build legs and commit them to the store in both semi and full modes
  dispatch({ type: 'SET_AUTO_LEGS', payload: { dayLoopId: dayLoop.id, legs } });

  sentinelBus.emit(HOMEBASE_STOP_ADDED, payload);

  const previews = buildCascadePreviews(payload);

  if (mode === 'full') {
    // Apply all cascades immediately
    Object.values(previews).forEach(p => p.apply(dispatch));
  }

  // In semi mode, return previews for CascadeConfirmSheet to render
  return { previews, legs };
}
