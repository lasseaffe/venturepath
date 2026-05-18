const TYPE_TO_PROFILE = {
  hiking: 'foot', walking: 'foot', running: 'foot',
  cycling: 'cycling', biking: 'cycling',
  'mountain biking': 'mtb', mtb: 'mtb',
  driving: 'car', motoring: 'car',
  sailing: 'boat',
};

function textOf(el, tag) {
  const list = el.getElementsByTagName(tag);
  return list.length ? (list[0].textContent ?? '').trim() : null;
}

function parsePoints(trkOrSeg) {
  const trkpts = Array.from(trkOrSeg.getElementsByTagName('trkpt'));
  return trkpts.map(p => ({
    lat: parseFloat(p.getAttribute('lat')),
    lng: parseFloat(p.getAttribute('lon')),
    ele: textOf(p, 'ele') != null ? parseFloat(textOf(p, 'ele')) : null,
    time: textOf(p, 'time'),
  })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function parseWaypoints(doc) {
  return Array.from(doc.getElementsByTagName('wpt')).map((w, i) => ({
    id: crypto.randomUUID(),
    name: textOf(w, 'name') ?? `Waypoint ${i + 1}`,
    idx: 0, // best-effort: import waypoints anchor to start; user can move them in Studio
    category: textOf(w, 'type') ?? 'view',
    note: textOf(w, 'desc'),
    importedLat: parseFloat(w.getAttribute('lat')),
    importedLng: parseFloat(w.getAttribute('lon')),
  }));
}

export function parseGpxToTracks(gpxString) {
  // DOMParser is provided natively by jsdom (test env) and browsers.
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'application/xml');

  const trks = Array.from(doc.getElementsByTagName('trk'));
  return trks.map(trk => {
    const name = textOf(trk, 'name') ?? 'Imported Track';
    const profile = TYPE_TO_PROFILE[(textOf(trk, 'type') ?? '').toLowerCase()] ?? 'foot';
    const points = parsePoints(trk);
    const segments = points.length >= 2
      ? [{ fromIdx: 0, toIdx: points.length - 1, profile, surface: null, routerEngine: 'manual' }]
      : [];
    const waypoints = parseWaypoints(doc);
    return {
      id: crypto.randomUUID(),
      legId: null,
      name,
      profile,
      points,
      segments,
      waypoints,
      stats: { distanceKm: 0, durationH: 0, ascentM: 0, descentM: 0, maxEleM: 0, minEleM: 0, difficulty: 'easy' },
      source: 'imported',
      visibility: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
