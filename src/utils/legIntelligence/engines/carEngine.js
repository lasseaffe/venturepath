import { fetchTolls } from '../adapters/tollguru';
import { fetchFuelAndRest } from '../adapters/overpass';
import { fetchRouteVariant } from '../../routeEngine';

const VARIANTS = ['fastest', 'toll-free', 'scenic'];

function toCoordObj(latLng) {
  return Array.isArray(latLng) ? { lat: latLng[0], lng: latLng[1] } : latLng;
}

// Hydrate a car leg with mode-specific intelligence.
// Returns { legMeta, waypoints } — caller dispatches setLegMeta + addWaypoint per item.
export async function hydrateCarLeg(leg) {
  const from = toCoordObj(leg.fromCoords ?? leg.coords?.[0]);
  const to   = toCoordObj(leg.toCoords   ?? leg.coords?.[leg.coords.length - 1]);
  if (!from || !to) return { legMeta: null, waypoints: [] };

  const [tolls, variantsResults] = await Promise.all([
    fetchTolls(from, to),
    Promise.all(VARIANTS.map(v => fetchRouteVariant(from, to, v))),
  ]);

  // Build polyline preview from the fastest variant (or fall back to straight line)
  const fastest = variantsResults.find(v => v.variant === 'fastest') ?? {};
  const polylinePreview = [[from.lat, from.lng], [to.lat, to.lng]];
  const amenities = await fetchFuelAndRest(polylinePreview);

  // Auto-waypoints: every toll gantry + first fuel + first rest
  const waypoints = [];
  for (const g of tolls.gantries) {
    waypoints.push({
      category: 'toll', name: g.name, coords: g.coords,
      kmFromStart: g.kmFromStart, estCost: g.estCost, source: 'auto', status: 'planned',
      subtype: g.country ?? undefined,
    });
  }
  if (amenities.fuel[0]) {
    waypoints.push({
      category: 'fuel', name: amenities.fuel[0].name, coords: amenities.fuel[0].coords,
      kmFromStart: Math.round(((fastest.distanceKm ?? 0) / 2)),
      subtype: amenities.fuel[0].subtype, source: 'auto', status: 'planned',
    });
  }
  if (amenities.rest[0]) {
    waypoints.push({
      category: 'rest', name: amenities.rest[0].name, coords: amenities.rest[0].coords,
      kmFromStart: Math.round(((fastest.distanceKm ?? 0) * 0.4)),
      source: 'auto', status: 'planned',
    });
  }

  const legMeta = {
    tolls,
    routeVariants: variantsResults,
    activeVariant: 'fastest',
    fuelPlan: { stops: amenities.fuel.slice(0, 3) },
    lastHydratedAt: new Date().toISOString(),
  };

  return { legMeta, waypoints };
}
