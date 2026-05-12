const TYPE_TO_MODE = {
  hiking: 'foot', walking: 'foot',
  cycling: 'cycling', 'mountain biking': 'cycling',
  driving: 'car', motoring: 'car',
  sailing: 'boat', flying: 'flight',
};

function textOf(el, tag) {
  const els = el.getElementsByTagName(tag);
  return els.length > 0 ? els[0].textContent?.trim() : null;
}

function parseStop(el, index, typeTag) {
  const lat = parseFloat(el.getAttribute('lat'));
  const lng = parseFloat(el.getAttribute('lon'));
  if (isNaN(lat) || isNaN(lng)) return null;
  const name = textOf(el, 'name') || textOf(el, 'desc') || `Stop ${index + 1}`;
  const mode = TYPE_TO_MODE[typeTag?.toLowerCase()] ?? null;
  return { name, lat, lng, mode };
}

function sampleTrack(trkpts, max = 10) {
  if (trkpts.length <= max) return trkpts;
  const step = Math.floor(trkpts.length / max);
  const sampled = [];
  for (let i = 0; i < trkpts.length; i += step) {
    sampled.push(trkpts[i]);
    if (sampled.length === max) break;
  }
  return sampled;
}

export function parseGpxToStops(gpxString) {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(gpxString, 'application/xml');

  // Detect global <type> tag at gpx level (for mode hint)
  const globalType = textOf(doc.documentElement, 'type');

  // Priority: wpt > rte > trk
  const wpts = [...doc.getElementsByTagName('wpt')];
  if (wpts.length >= 2) {
    return wpts.map((el, i) => parseStop(el, i, globalType)).filter(Boolean);
  }

  const rtepts = [...doc.getElementsByTagName('rtept')];
  if (rtepts.length >= 2) {
    return rtepts.map((el, i) => parseStop(el, i, globalType)).filter(Boolean);
  }

  const trkpts = [...doc.getElementsByTagName('trkpt')];
  if (trkpts.length >= 2) {
    const sampled = sampleTrack(trkpts, 10);
    return sampled.map((el, i) => parseStop(el, i, globalType)).filter(Boolean);
  }

  return [];
}

export function stopsToLegs(stops) {
  const SPEED = { foot: 5, cycling: 20, bus: 60, car: 80, flight: 800, boat: 15 };
  const legs = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    // Haversine inline — avoids circular dep on bearingEngine
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sinA = Math.sin(dLat / 2);
    const sinB = Math.sin(dLng / 2);
    const chord = sinA * sinA + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinB * sinB;
    const distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord)));

    const mode = a.mode ?? b.mode ?? 'foot';
    const durationH = parseFloat((distanceKm / SPEED[mode]).toFixed(1));

    legs.push({
      from: a.name,
      to: b.name,
      mode,
      distanceKm,
      durationH,
      coords: [b.lat, b.lng],
      status: 'pending',
    });
  }

  return legs;
}
