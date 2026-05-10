// Safety Pulse engine — mock real-time incident data per destination
import sentinelBus from './sentinelBus.js';

const INCIDENT_POOLS = {
  default: [
    { type: 'Weather',   severity: 'amber', description: 'High winds forecast — gusts up to 80kph',        lat:  -51.5,  lng: -72.6, affectedGearTags: ['hardshell', 'tent_stakes', 'guy_lines'], affectedStopTypes: ['summit', 'exposed_ridge', 'viewpoint'] },
    { type: 'Trail',     severity: 'green', description: 'All main trails open, good conditions',           lat:  -51.65, lng: -72.8, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Medical',   severity: 'green', description: 'Nearest clinic 12km away — fully operational',   lat:  -51.4,  lng: -72.5, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Wildlife',  severity: 'amber', description: 'Puma activity reported near Refugio Grey',       lat:  -51.7,  lng: -73.0, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Flood',     severity: 'red',   description: 'River crossing at km 8 — elevated water level',  lat:  -51.55, lng: -72.7, affectedGearTags: [], affectedStopTypes: [] },
  ],
  svalbard: [
    { type: 'Wildlife',  severity: 'red',   description: 'Polar bear sighting — stay within guided zones', lat: 78.2,  lng: 15.6, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Weather',   severity: 'amber', description: 'Blizzard warning: visibility <50m tomorrow',     lat: 78.3,  lng: 16.0, affectedGearTags: ['down_jacket', 'balaclava', 'hardshell'], affectedStopTypes: ['summit', 'coastal', 'viewpoint'] },
    { type: 'Trail',     severity: 'green', description: 'Guided routes clear — crampons required',        lat: 78.1,  lng: 15.2, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Medical',   severity: 'amber', description: 'Longyearbyen hospital: 2h evacuation radius',    lat: 78.22, lng: 15.63, affectedGearTags: [], affectedStopTypes: [] },
  ],
  namib: [
    { type: 'Weather',   severity: 'red',   description: 'Extreme heat alert — 45°C peak temps today',    lat: -24.0, lng: 15.5, affectedGearTags: ['sun_protection', 'electrolytes', 'extra_water'], affectedStopTypes: ['summit', 'urban', 'transit'] },
    { type: 'Wildlife',  severity: 'amber', description: 'Scorpion activity high — check footwear',       lat: -24.2, lng: 15.7, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Water',     severity: 'red',   description: 'No potable water within 60km — carry reserves', lat: -23.8, lng: 15.3, affectedGearTags: [], affectedStopTypes: [] },
    { type: 'Trail',     severity: 'green', description: 'Dune 45 and Sossusvlei tracks open',            lat: -24.1, lng: 15.6, affectedGearTags: [], affectedStopTypes: [] },
  ],
};

/**
 * Fetch mock safety incidents for a destination.
 * Simulates real-time variability by randomly toggling one incident.
 * @param {string} destinationId
 * @returns {Promise<Array<{ id, type, severity, description, lat, lng, timestamp }>>}
 */
export async function fetchSafetyIncidents(destinationId = 'default') {
  await new Promise(r => setTimeout(r, 300));
  const key = destinationId.toLowerCase().replace(/[^a-z]/g, '');
  const pool = INCIDENT_POOLS[key] ?? INCIDENT_POOLS.default;
  const incidents = pool.map((inc, i) => ({
    ...inc,
    id: `inc_${i}`,
    timestamp: new Date(Date.now() - Math.random() * 3_600_000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }));
  const hazards = incidents.filter(inc => inc.severity !== 'green');
  sentinelBus.emit('HAZARD_UPDATED', { hazards });
  return incidents;
}

export const SEVERITY_COLORS = {
  green: { hex: '#22c55e', label: 'All Clear',       ring: 'border-green-500/40' },
  amber: { hex: '#f59e0b', label: 'Advisory',        ring: 'border-amber-500/40' },
  red:   { hex: '#ef4444', label: 'Active Alert',    ring: 'border-red-500/40'   },
};
