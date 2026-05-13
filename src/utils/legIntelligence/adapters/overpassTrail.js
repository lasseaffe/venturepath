const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function bboxFrom(polyline, padDeg = 0.1) {
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
  node["amenity"="drinking_water"](${s},${w},${n},${e});
  node["natural"="spring"](${s},${w},${n},${e});
  node["shop"="supermarket"](${s},${w},${n},${e});
  node["shop"="convenience"](${s},${w},${n},${e});
  node["amenity"="ranger_station"](${s},${w},${n},${e});
);
out body;`;
}

function classify(el) {
  const t = el.tags ?? {};
  if (t.amenity === 'drinking_water' || t.natural === 'spring') return 'water';
  if (t.shop === 'supermarket' || t.shop === 'convenience' || t.amenity === 'ranger_station') return 'resupply';
  return null;
}

export async function fetchWaterAndResupply(polyline) {
  const empty = { water: [], resupply: [] };
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
    const buckets = { water: [], resupply: [] };
    for (const el of json.elements ?? []) {
      const kind = classify(el);
      if (!kind) continue;
      const t = el.tags ?? {};
      buckets[kind].push({
        name: t.name ?? (kind === 'water' ? 'Water source' : 'Resupply point'),
        coords: [el.lat, el.lon],
        subtype: t.natural ?? t.shop ?? t.amenity ?? undefined,
        osmId: el.id,
      });
    }
    return buckets;
  } catch {
    return empty;
  }
}
