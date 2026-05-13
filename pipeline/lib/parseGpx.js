// pipeline/lib/parseGpx.js
// Parses a GPX file from disk and returns deterministic facts: waypoints, distance, elevation gain.
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function textOf(node, tag) {
  const el = node.getElementsByTagName(tag)[0];
  return el ? el.textContent.trim() : null;
}

export function parseGpx(filePath) {
  const xml = readFileSync(filePath, 'utf8');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  const wptNodes = Array.from(doc.getElementsByTagName('wpt'));
  const waypoints = wptNodes.map((n) => ({
    lat: parseFloat(n.getAttribute('lat')),
    lon: parseFloat(n.getAttribute('lon')),
    ele: textOf(n, 'ele') ? parseFloat(textOf(n, 'ele')) : null,
    name: textOf(n, 'name'),
    sym: textOf(n, 'sym') || textOf(n, 'type'),
  }));

  const trkptNodes = Array.from(doc.getElementsByTagName('trkpt'));
  const trackpoints = trkptNodes.map((n) => ({
    lat: parseFloat(n.getAttribute('lat')),
    lon: parseFloat(n.getAttribute('lon')),
    ele: textOf(n, 'ele') ? parseFloat(textOf(n, 'ele')) : null,
  }));

  let distanceKm = 0;
  let elevationGain = 0;
  for (let i = 1; i < trackpoints.length; i++) {
    const a = trackpoints[i - 1];
    const b = trackpoints[i];
    distanceKm += haversineKm(a.lat, a.lon, b.lat, b.lon);
    if (a.ele != null && b.ele != null && b.ele > a.ele) {
      elevationGain += b.ele - a.ele;
    }
  }

  return {
    waypoints,
    distanceKm: Math.round(distanceKm * 10) / 10,
    elevationGain: Math.round(elevationGain),
    trackpointCount: trackpoints.length,
  };
}
