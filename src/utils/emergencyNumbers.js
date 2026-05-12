/** Primary emergency/police number by ISO-3166-1 alpha-2 country code. */
const NUMBERS = {
  // North America
  US: '911', CA: '911', MX: '911',
  // Europe (112 is the EU standard but some keep legacy)
  GB: '999', IE: '999',
  DE: '112', FR: '15', ES: '112', IT: '118', PT: '112',
  NL: '112', BE: '112', AT: '112', CH: '117', SE: '112', NO: '113',
  DK: '112', FI: '112', PL: '112', CZ: '112', SK: '112', HU: '112',
  RO: '112', BG: '112', HR: '112', GR: '112', RS: '194',
  // Oceania
  AU: '000', NZ: '111',
  // Asia-Pacific
  JP: '119', KR: '119', CN: '120', IN: '112', PH: '911', SG: '995',
  TH: '1669', MY: '999', ID: '118', VN: '115', HK: '999', TW: '119',
  // South America
  BR: '192', AR: '107', CL: '131', CO: '125', PE: '117', VE: '171',
  // Africa / Middle East
  ZA: '10177', NG: '199', KE: '999', EG: '123', IL: '101', SA: '911',
  AE: '998', TR: '112', PK: '115',
};

/** @param {string | null | undefined} countryCode ISO-3166-1 alpha-2 */
export function getEmergencyNumber(countryCode) {
  if (!countryCode) return '112';
  return NUMBERS[countryCode.toUpperCase()] ?? '112';
}
