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
