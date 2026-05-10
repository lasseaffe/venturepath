import { overpassRadius } from './overpassEngine';
import { otmRadius } from './otmEngine';
import { waymarkedRoutes } from './waymarkedEngine';
import { rankResults } from './searchRanker';
import { haversineKm } from './routeEngine';

const TACTICAL_FILTERS = [
  'amenity=drinking_water', 'amenity=shelter', 'amenity=toilets',
  'amenity=pharmacy', 'amenity=charging_station',
  'shop=outdoor', 'shop=supermarket', 'shop=hardware',
  'internet_access=wlan', 'amenity=public_transport',
];

function deduplicateByProximity(osmPois, otmPois, thresholdKm = 0.05) {
  const kept = [...otmPois];
  const otmCoords = otmPois.map(p => p.coords);

  for (const osmPoi of osmPois) {
    const tooClose = otmCoords.some(c => c && osmPoi.coords && haversineKm(c, osmPoi.coords) < thresholdKm);
    if (!tooClose) kept.push(osmPoi);
  }
  return kept;
}

export async function globalSearch({
  query = '',
  coords,
  section = 'planner',
  missionType = '',
  userRole = 'MEMBER',
  radiusM = 5000,
  includeRoutes = false,
} = {}) {
  if (!coords) return { pois: [], routes: [] };

  const { lat, lng } = coords;

  const tasks = [
    overpassRadius(lat, lng, TACTICAL_FILTERS, '', radiusM),
    otmRadius(lat, lng, 'cultural,historic,foods,natural,sport', 20),
    includeRoutes ? waymarkedRoutes(lat, lng, 'hiking', radiusM) : Promise.resolve([]),
  ];

  const [osmResult, otmResult, routesResult] = await Promise.allSettled(tasks);

  const osmPois = osmResult.status   === 'fulfilled' ? osmResult.value  : [];
  const otmPois = otmResult.status   === 'fulfilled' ? otmResult.value  : [];
  const routes  = routesResult.status === 'fulfilled' ? routesResult.value : [];

  const merged = deduplicateByProximity(osmPois, otmPois);

  const ranked = rankResults(merged, {
    currentLegCoords: coords,
    tripType: missionType,
    userRole,
    section,
  });

  return { pois: ranked, routes };
}
