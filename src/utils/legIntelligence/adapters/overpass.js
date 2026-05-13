const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Polyline is an array of [lat, lng]. We build a bounding box with a buffer.
function bboxFrom(polyline, padDeg = 0.05) {
  const lats = polyline.map(p => p[0]);
  const lngs = polyline.map(p => p[1]);
  return [
    Math.min(...lats) - padDeg, Math.min(...lngs) - padDeg,
    Math.max(...lats) + padDeg, Math.max(...lngs) + padDeg,
  ];
}

function buildQuery(bbox) {
  const [s, w, n, e] = bbox;
  return `
[out:json][timeout:25];
(
  node["amenity"="fuel"](${s},${w},${n},${e});
  node["amenity"="charging_station"](${s},${w},${n},${e});
  node["highway"="services"](${s},${w},${n},${e});
);
out body;`;
}

function classify(el) {
  const t = el.tags ?? {};
  if (t.amenity === 'fuel')              return 'fuel';
  if (t.amenity === 'charging_station')  return 'charge';
  if (t.highway === 'services')          return 'rest';
  return null;
}

export async function fetchFuelAndRest(polyline) {
  const empty = { fuel: [], charge: [], rest: [] };
  if (!polyline || polyline.length < 2) return empty;
  try {
    const bbox = bboxFrom(polyline);
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: buildQuery(bbox),
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const buckets = { fuel: [], charge: [], rest: [] };
    for (const el of json.elements ?? []) {
      const kind = classify(el);
      if (!kind) continue;
      buckets[kind].push({
        name:    el.tags?.name ?? (kind === 'fuel' ? 'Fuel stop' : kind === 'charge' ? 'Charging point' : 'Rest area'),
        coords:  [el.lat, el.lon],
        subtype: (el.tags?.brand ?? '').toLowerCase() || undefined,
        osmId:   el.id,
      });
    }
    return buckets;
  } catch {
    return empty;
  }
}
