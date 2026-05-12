import { hydrateCarLeg } from './engines/carEngine.js';

const ENGINES = { car: hydrateCarLeg };

export async function hydrateLeg(leg) {
  const engine = ENGINES[leg?.mode];
  if (!engine) return { legMeta: null, waypoints: [] };
  return engine(leg);
}

export { WAYPOINT_CATEGORIES, getCategoryStyle } from './waypointCategories.js';
