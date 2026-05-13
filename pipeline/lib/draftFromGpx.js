// pipeline/lib/draftFromGpx.js
// Builds the LLM bundle from route JSON + GPX-derived stats, then calls generateExpedition.
import { generateExpedition } from '../generateExpedition.js';

export async function draftFromGpx(routeJson, gpxStats) {
  const waypoint_names = gpxStats.waypoints
    .map((w) => w.name)
    .filter((n) => n && n.length > 0)
    .slice(0, 8);

  const bundle = {
    name:           routeJson.name,
    destination:    routeJson.destination,
    theme_category: routeJson.theme_category,
    tags:           routeJson.tags,
    climate:        routeJson.climate,
    difficulty:     routeJson.difficulty,
    squad_min:      routeJson.squad_min,
    squad_max:      routeJson.squad_max,
    distance_km:    gpxStats.distanceKm,
    elevation_gain: gpxStats.elevationGain,
    waypoint_names,
  };

  return generateExpedition(bundle);
}
