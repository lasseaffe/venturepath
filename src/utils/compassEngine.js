// compassEngine.js — bearing, cardinal direction, and haversine distance calculations
// Used by Tactical Mode for directional context and SOS beacon proximity assessment

const R = 6371; // Earth's radius in km
const toRad = deg => (deg * Math.PI) / 180;

/**
 * Calculate distance between two points using haversine formula
 * @param {Object} a - Point A with lat, lng
 * @param {Object} b - Point B with lat, lng
 * @returns {number} Distance in kilometers, rounded to 2 decimals
 */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return parseFloat((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

/**
 * Calculate initial bearing (azimuth) from point A to point B
 * @param {Object} from - Starting point with lat, lng
 * @param {Object} to - Destination point with lat, lng
 * @returns {number} Bearing in degrees (0-360, where 0 is north)
 */
export function bearing(from, to) {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

const CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/**
 * Convert bearing degrees to cardinal direction label
 * @param {number} degrees - Bearing in degrees (0-360)
 * @returns {string} Cardinal direction label (N, NE, E, SE, S, SW, W, NW, or intercardinals)
 */
export function cardinalLabel(degrees) {
  const index = Math.round(degrees / 22.5) % 16;
  return CARDINALS[index];
}
