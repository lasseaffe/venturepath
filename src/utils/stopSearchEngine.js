import { searchPlaces as fsqSearch } from './foursquareEngine';
import { searchLocations } from './geocodeEngine';

// Unified stop search: Foursquare (if key set) → Nominatim fallback
export async function searchStops(query, nearCity = '') {
  const fsqResults = await fsqSearch(query, nearCity);
  if (fsqResults.length > 0) return fsqResults;
  const nominatim = await searchLocations(`${query} ${nearCity}`.trim(), 5);
  return nominatim.map(r => ({
    id: String(r.id),
    name: r.name,
    address: r.address,
    type: r.type ?? 'Place',
    coords: r.coords,
  }));
}
