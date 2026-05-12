import { getEmergencyNumber } from './emergencyNumbers.js';

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/**
 * @param {{ words: string, lat: number, lng: number, country: string, nearestPlace: string, timestamp: string }} opts
 * @returns {string}
 */
export function buildSosMessage({ words, lat, lng, country, nearestPlace, timestamp }) {
  const emergency = getEmergencyNumber(country);
  return [
    '[EMERGENCY SOS] VenturePath Tactical',
    LINE,
    `What3Words:  /// ${words}`,
    `Nearest:     ${nearestPlace}`,
    `Coordinates: ${lat}, ${lng}`,
    `Emergency:   ${emergency} (${country ?? '??'})`,
    `Time (UTC):  ${timestamp}`,
    LINE,
    'Share this message with emergency services.',
    'Free tool: venturepath.com/sos',
  ].join('\n');
}
