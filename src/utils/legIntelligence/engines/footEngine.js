import { fetchElevationProfile } from '../adapters/openElevation.js';
import { fetchWaterAndResupply } from '../adapters/overpassTrail.js';

export async function hydrateFootLeg(leg) {
  const polyline = leg?.coords;
  if (!polyline || polyline.length < 2) return { legMeta: null, waypoints: [] };

  const [elevationProfile, amenities] = await Promise.all([
    fetchElevationProfile(polyline),
    fetchWaterAndResupply(polyline),
  ]);

  const waypoints = [];
  for (const w of amenities.water) {
    waypoints.push({
      category: 'water', name: w.name, coords: w.coords,
      subtype: w.subtype, source: 'auto', status: 'planned',
      kmFromStart: null,
    });
  }
  for (const r of amenities.resupply) {
    waypoints.push({
      category: 'resupply', name: r.name, coords: r.coords,
      subtype: r.subtype, source: 'auto', status: 'planned',
      kmFromStart: null,
    });
  }

  const legMeta = {
    elevationProfile,
    permits: [],
    bearCountry: false,
    difficultyRating: null,
    gpxFileId: null,
    lastHydratedAt: new Date().toISOString(),
  };

  return { legMeta, waypoints };
}
