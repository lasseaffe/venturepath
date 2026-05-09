// Nominatim (OpenStreetMap) geocoder — no API key required
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'VenturePath/1.0' };

export async function geocodeLocation(text) {
  if (!text?.trim()) return null;
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function searchLocations(text, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return data.map(r => ({
      id: r.place_id,
      name: r.display_name.split(',')[0],
      address: r.display_name,
      coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      type: r.type,
    }));
  } catch {
    return [];
  }
}
