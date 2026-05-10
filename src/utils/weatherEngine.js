import sentinelBus from './sentinelBus.js';
import { fetchWeatherHazards } from './weatherHazardMapper.js';

// WMO weather code → human-readable condition
const WMO_MAP = {
  0: { label: 'Clear',    icon: '☀️' },
  1: { label: 'Mostly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy',   icon: '🌫️' },
  48: { label: 'Icy Fog', icon: '🌫️' },
  51: { label: 'Drizzle', icon: '🌦️' },
  61: { label: 'Rain',    icon: '🌧️' },
  71: { label: 'Snow',    icon: '❄️' },
  80: { label: 'Showers', icon: '🌦️' },
  95: { label: 'Storm',   icon: '⛈️' },
};

function decodeWmo(code) {
  // Find closest matching code
  return WMO_MAP[code] ?? WMO_MAP[Math.max(...Object.keys(WMO_MAP).map(Number).filter(k => k <= code))] ?? { label: 'Unknown', icon: '🌡️' };
}

/**
 * Fetch real forecast from Open-Meteo (free, no API key).
 * Falls back to mock data if coords unavailable or fetch fails.
 * @param {{ lat: number, lng: number } | string} locationOrCoords
 * @param {number} days
 * @returns {Promise<Array>}
 */
export async function fetchForecast(locationOrCoords, days = 5) {
  let lat, lng;

  if (locationOrCoords && typeof locationOrCoords === 'object') {
    lat = locationOrCoords.lat;
    lng = locationOrCoords.lng;
  }

  if (lat != null && lng != null) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max&timezone=auto&forecast_days=${days}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.daily.time.map((date, i) => {
          const code = data.daily.weathercode[i];
          const { label, icon } = decodeWmo(code);
          const tempC = Math.round((data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2);
          const windKph = Math.round(data.daily.windspeed_10m_max[i]);
          return {
            day: i,
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            label, icon, tempC, windKph,
          };
        });
      }
    } catch {
      // fall through to mock
    }
  }

  // Fallback mock
  const MOCK = [
    { label: 'Clear', icon: '☀️', tempC: 22, windKph: 12 },
    { label: 'Overcast', icon: '☁️', tempC: 17, windKph: 20 },
    { label: 'Rain', icon: '🌧️', tempC: 13, windKph: 35 },
    { label: 'Snow', icon: '❄️', tempC: -4, windKph: 18 },
    { label: 'Storm', icon: '⛈️', tempC: 10, windKph: 70 },
  ];
  return Array.from({ length: days }, (_, i) => ({
    day: i,
    date: new Date(Date.now() + i * 86_400_000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    ...MOCK[i % MOCK.length],
    windKph: MOCK[i % MOCK.length].windKph,
  }));
}

/**
 * Derive climate type from forecast.
 * @param {Array} forecast
 * @returns {string}
 */
export function classifyClimate(forecast) {
  const avg = forecast.reduce((s, d) => s + d.tempC, 0) / forecast.length;
  if (avg < 0) return 'arctic';
  if (avg > 30) return 'desert';
  const rainyDays = forecast.filter(d => d.label === 'Rain' || d.label === 'Storm').length;
  if (rainyDays >= forecast.length / 2) return 'tropical';
  return 'temperate';
}

/**
 * Load weather hazards and emit HAZARD_UPDATED via sentinelBus if hazards detected.
 * @param {{ lat: number, lng: number }} coords
 * @returns {Promise<void>}
 */
export async function loadAndEmitWeatherHazards(coords) {
  const hazards = await fetchWeatherHazards(coords);
  if (hazards.length > 0) {
    sentinelBus.emit('HAZARD_UPDATED', { hazards });
  }
}
