import { photonAutocomplete } from './photonEngine';
import { overpassRadius } from './overpassEngine';
import { rankResults } from './searchRanker';
import { geocodeLocation } from './geocodeEngine';
import { otmRadius } from './otmEngine';

const CLIMATE_MAP = {
  alpine:    'alpine',
  temperate: 'leisure',
  tropical:  'leisure',
  arid:      'tactical',
};

export function tripTypeFromClimate(climate) {
  return CLIMATE_MAP[climate] ?? 'city';
}

export async function getInspireResults(strategy, destination, context) {
  const geo = await geocodeLocation(destination);
  if (!geo) return [];

  const overpassResults = await overpassRadius(
    geo.lat, geo.lng,
    strategy.inspireQuery.filters,
    destination,
    5000,
  );

  // Merge OTM for DISCOVERY tab if key available
  let merged = overpassResults;
  if (strategy._tab === 'DISCOVERY' && import.meta.env.VITE_OTM_API_KEY) {
    const otmResults = await otmRadius(geo.lat, geo.lng, 'cultural,historic,natural', 12);
    const seen = new Set(overpassResults.map(p => p.id));
    const unique = otmResults.filter(p => !seen.has(p.id));
    merged = [...overpassResults, ...unique];
  }

  return rankResults(merged, context).slice(0, 8);
}

export async function getAutocompleteResults(query, strategy, context) {
  const results = await photonAutocomplete(query, strategy.filterMask);
  return rankResults(results, context).slice(0, 10);
}
