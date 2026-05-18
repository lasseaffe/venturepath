import { nearestAirport } from '../utils/iataNearest.js';

const PROFILE_TO_LEG_MODE = {
  foot: 'foot',
  cycling: 'cycling',
  mtb: 'cycling',
  car: 'car',
  boat: 'boat',
  flight: 'flight',
};

export function tracksToLegPatch(track) {
  if (!track?.points || track.points.length === 0) return null;
  const start = track.points[0];
  const end = track.points[track.points.length - 1];
  return {
    from: `${track.name} · start`,
    to: `${track.name} · end`,
    mode: PROFILE_TO_LEG_MODE[track.profile] ?? 'foot',
    distanceKm: Math.round(track.stats?.distanceKm ?? 0),
    durationH: track.stats?.durationH ?? 0,
    coords: [end.lat, end.lng],
    status: 'pending',
    trackId: track.id,
    climate: null,
    waypoints: (track.waypoints ?? []).map(w => {
      const p = track.points[w.idx] ?? start;
      return {
        id: w.id,
        name: w.name,
        coords: [p.lat, p.lng],
        category: w.category,
        status: 'planned',
        source: 'gpx-import',
      };
    }),
  };
}

export function nearestAirportToTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const start = track.points[0];
  return nearestAirport({ lat: start.lat, lng: start.lng });
}

import { COST_RATES_USD_PER_KM } from '../data/costRates.js';

const LAPSE_RATE = 6.5; // °C per 1000m
const BASE_TEMP_C = 15; // sea level reference

function tempAtAlt(altM) {
  return BASE_TEMP_C - (altM / 1000) * LAPSE_RATE;
}

export function deriveClimateFromTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const maxAltM = track.stats?.maxEleM ?? Math.max(...track.points.map(p => p.ele ?? 0));
  const expectedLowTempC = Math.round(tempAtAlt(maxAltM) * 10) / 10;
  let climateBand;
  if (expectedLowTempC < -10) climateBand = 'arctic';
  else if (expectedLowTempC < 5) climateBand = 'alpine';
  else if (expectedLowTempC < 15) climateBand = 'temperate';
  else if (expectedLowTempC < 25) climateBand = 'temperate';
  else climateBand = 'tropical';
  return { climateBand, maxAltM, expectedLowTempC };
}

export function buildCostEntryForTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const rate = COST_RATES_USD_PER_KM[track.profile] ?? 0;
  if (rate === 0) return null;
  const distKm = track.stats?.distanceKm ?? 0;
  const amount = Math.round(distKm * rate * 100) / 100;
  return {
    id: `gpx-cost-${track.id}`,
    name: `Route cost · ${track.name}`,
    type: 'Transport',
    thumb: null,
    amount,
    currency: 'USD',
    votes: {},
    status: 'nominated',
    source: 'gpx-import',
  };
}
