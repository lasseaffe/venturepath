const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup';
const MAX_POINTS = 100;

function sample(polyline, max) {
  if (polyline.length <= max) return polyline;
  const step = (polyline.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => polyline[Math.round(i * step)]);
}

const EMPTY = { points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 };

export async function fetchElevationProfile(polyline) {
  if (!polyline || polyline.length < 2) return EMPTY;
  try {
    const sampled = sample(polyline, MAX_POINTS);
    const res = await fetch(OPEN_ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: sampled.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) }),
    });
    if (!res.ok) return EMPTY;
    const json = await res.json();
    const elevations = (json.results ?? []).map(r => r.elevation);
    if (elevations.length === 0) return EMPTY;

    let gainM = 0, lossM = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gainM += diff;
      else lossM += Math.abs(diff);
    }

    const points = (json.results ?? []).map(r => ({ lat: r.latitude, lng: r.longitude, elevM: r.elevation }));
    return { points, gainM, lossM, maxElevM: Math.max(...elevations), minElevM: Math.min(...elevations) };
  } catch {
    return EMPTY;
  }
}
