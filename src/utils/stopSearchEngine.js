import { searchPlaces as fsqSearch } from './foursquareEngine';
import { searchLocations } from './geocodeEngine';
import { haversineKm } from './routeEngine';

// Exported for tests
export function rankByProximity(results, refCoords) {
  if (!refCoords) return results;
  return [...results].sort((a, b) => {
    const dA = a.coords ? haversineKm(a.coords, refCoords) : Infinity;
    const dB = b.coords ? haversineKm(b.coords, refCoords) : Infinity;
    return dA - dB;
  });
}

// Unified stop search: Foursquare (if key set) → Nominatim fallback
// destCoords: resolved { lat, lng } of trip destination for proximity ranking
export async function searchStops(query, nearCity = '', destCoords = null) {
  const fsqResults = await fsqSearch(query, nearCity);
  if (fsqResults.length > 0) return rankByProximity(fsqResults, destCoords);

  const nominatim = await searchLocations(`${query} ${nearCity}`.trim(), 5);
  const mapped = nominatim.map(r => ({
    id: String(r.id),
    name: r.name,
    address: r.address,
    type: r.type ?? 'Place',
    coords: r.coords,
  }));
  return rankByProximity(mapped, destCoords);
}
