// pipeline/lib/draftFromGpx.js
// Builds the LLM bundle in the shape generateExpedition expects
// (city / description / climate / pois / imageUrl) from a route JSON +
// GPX-derived stats, then calls generateExpedition and returns the
// three fields we actually use downstream: description, legs, days.
import { generateExpedition } from '../generateExpedition.js';

export async function draftFromGpx(routeJson, gpxStats) {
  const pois = gpxStats.waypoints
    .filter((w) => w.name)
    .slice(0, 5)
    .map((w) => ({ name: w.name }));

  // Fall back to the destination as a single POI if the GPX has no named waypoints.
  if (pois.length === 0) {
    pois.push({ name: routeJson.destination });
  }

  const bundle = {
    city: routeJson.destination,
    description:
      `${routeJson.name} — a ${routeJson.theme_category} expedition. ` +
      `${gpxStats.distanceKm}km, ${routeJson.difficulty} difficulty. ` +
      `Squad ${routeJson.squad_min}-${routeJson.squad_max}. ` +
      `Tags: ${(routeJson.tags ?? []).join(', ')}.`,
    climate: routeJson.climate,
    pois,
    imageUrl: null,
  };

  const result = await generateExpedition(bundle);
  return {
    description: result.description,
    legs: result.legs,
    days: result.days,
  };
}
