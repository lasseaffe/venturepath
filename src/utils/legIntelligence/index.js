import { hydrateCarLeg } from './engines/carEngine.js';
import { hydrateFootLeg } from './engines/footEngine.js';
import { hydrateFlightLeg } from './engines/flightEngine.js';
import { hydrateTrainLeg } from './engines/trainEngine.js';
import { hydrateBusLeg } from './engines/busEngine.js';
import { hydrateFerryLeg } from './engines/ferryEngine.js';
import { hydrateBoatLeg } from './engines/boatEngine.js';

const ENGINES = {
  car:    hydrateCarLeg,
  foot:   hydrateFootLeg,
  flight: hydrateFlightLeg,
  train:  hydrateTrainLeg,
  bus:    hydrateBusLeg,
  ferry:  hydrateFerryLeg,
  boat:   hydrateBoatLeg,
};

export async function hydrateLeg(leg) {
  const engine = ENGINES[leg?.mode];
  if (!engine) return { legMeta: null, waypoints: [] };
  return engine(leg);
}

export { WAYPOINT_CATEGORIES, getCategoryStyle } from './waypointCategories.js';
