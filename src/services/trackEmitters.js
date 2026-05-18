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
