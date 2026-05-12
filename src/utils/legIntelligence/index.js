import { hydrateCarLeg } from './engines/carEngine.js';
import { hydrateFootLeg } from './engines/footEngine.js';

const ENGINES = { car: hydrateCarLeg, foot: hydrateFootLeg };

export async function hydrateLeg(leg) {
  const engine = ENGINES[leg?.mode];
  if (!engine) return { legMeta: null, waypoints: [] };
  return engine(leg);
}

export { WAYPOINT_CATEGORIES, getCategoryStyle } from './waypointCategories.js';
