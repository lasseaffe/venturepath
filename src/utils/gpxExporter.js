import { geocodeLocation } from './geocodeEngine';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function resolveCoords(name, coordsFromLeg) {
  if (coordsFromLeg && Array.isArray(coordsFromLeg) && coordsFromLeg.length === 2) {
    return { lat: coordsFromLeg[0], lng: coordsFromLeg[1] };
  }
  return geocodeLocation(name);
}

export async function exportLegsToGpx(legs, trip) {
  if (!legs || legs.length === 0) return null;

  // Build ordered stop list: [leg[0].from, leg[0].to, leg[1].to, ...]
  const stopNames = [legs[0].from, ...legs.map(l => l.to)];
  const legCoords = legs.map(l => l.coords ?? null);

  // Resolve coords for each stop
  const stopCoords = await Promise.all(
    stopNames.map((name, i) => {
      // from of leg 0 → no coords stored; to of leg i → legCoords[i]
      const coordsHint = i === 0 ? null : legCoords[i - 1];
      return resolveCoords(name, coordsHint);
    })
  );

  const stops = stopNames.map((name, i) => ({
    name,
    lat: stopCoords[i]?.lat ?? null,
    lng: stopCoords[i]?.lng ?? null,
  })).filter(s => s.lat !== null);

  const wpts = stops.map((s, i) => {
    const leg = legs[i] ?? legs[i - 1];
    const desc = leg
      ? `LEG ${i + 1} · ${leg.mode} · ${leg.distanceKm?.toLocaleString() ?? '?'} km · ${leg.durationH ?? '?'}h`
      : s.name;
    return `  <wpt lat="${s.lat}" lon="${s.lng}">
    <name>${esc(s.name)}</name>
    <desc>${esc(desc)}</desc>
    <type>VenturePath-Stop</type>
  </wpt>`;
  }).join('\n');

  const rtepts = stops.map(s =>
    `    <rtept lat="${s.lat}" lon="${s.lng}"><name>${esc(s.name)}</name></rtept>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(trip.name)}</name>
    <desc>${esc(trip.destination)} · ${esc(trip.startDate)} → ${esc(trip.endDate)}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <rte>
    <name>${esc(trip.name)}</name>
${rtepts}
  </rte>
</gpx>`;

  return xml;
}

export function downloadGpx(gpxString, tripName) {
  const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tripName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
