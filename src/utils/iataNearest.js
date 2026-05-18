import airports from '../data/airports.iata.json';

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sA = Math.sin(dLat / 2), sB = Math.sin(dLng / 2);
  const chord = sA * sA + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sB * sB;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

export function nearestAirports(point, n = 1) {
  return airports
    .map(a => ({ ...a, distanceKm: haversine(point, a) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n);
}

export function nearestAirport(point) {
  return nearestAirports(point, 1)[0] ?? null;
}
