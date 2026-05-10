const MS_TO_KMH = 3.6;
const KELVIN_OFFSET = 273.15;

export function mapOwmToHazards(owm) {
  const hazards = [];
  const windKmh = (owm.wind?.speed ?? 0) * MS_TO_KMH;
  const rain1h = owm.rain?.['1h'] ?? 0;
  const tempC = owm.main?.temp ? owm.main.temp - KELVIN_OFFSET : null;

  if (windKmh > 50) {
    hazards.push({
      id: 'HIGH_WINDS',
      type: 'Weather',
      severity: windKmh > 80 ? 'red' : 'amber',
      label: `High winds — ${Math.round(windKmh)} km/h gusts`,
      affectedGearTags: ['hardshell', 'tent_stakes', 'guy_lines', 'windbreaker'],
      affectedStopTypes: ['summit', 'exposed_ridge', 'coastal', 'viewpoint'],
    });
  }

  if (rain1h > 10) {
    hazards.push({
      id: 'HEAVY_RAIN',
      type: 'Weather',
      severity: rain1h > 25 ? 'red' : 'amber',
      label: `Heavy rain — ${rain1h}mm/h`,
      affectedGearTags: ['rain_jacket', 'waterproof_bag', 'waterproof_phone_case'],
      affectedStopTypes: ['summit', 'coastal', 'viewpoint', 'camp'],
    });
  }

  if (tempC !== null && tempC > 38) {
    hazards.push({
      id: 'EXTREME_HEAT',
      type: 'Weather',
      severity: 'red',
      label: `Extreme heat — ${Math.round(tempC)}°C`,
      affectedGearTags: ['sun_protection', 'electrolytes', 'extra_water'],
      affectedStopTypes: ['summit', 'urban', 'transit'],
    });
  }

  return hazards;
}

export async function fetchWeatherHazards(coords) {
  const key = import.meta.env.VITE_OWM_API_KEY;
  if (!key || !coords?.lat) return [];
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&appid=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return mapOwmToHazards(data);
  } catch {
    return [];
  }
}
