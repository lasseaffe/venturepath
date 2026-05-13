// pipeline/lib/graphhopperSnap.js
// Snaps a list of [lat, lon] coordinates to a real path via GraphHopper.
// Returns a GPX 1.1 XML string ready to write to pipeline/gpx/<slug>.gpx.
// GraphHopper requires an API key (free tier sufficient for one-off batch).
// Set GRAPHHOPPER_API_KEY in .env.local. Orchestrator sleeps 2s between routes
// to stay under rate limit.

const ENDPOINT = process.env.GRAPHHOPPER_URL ?? 'https://graphhopper.com/api/1/route';

export async function graphhopperSnap({ coords, slug, profile = 'foot' }) {
  if (!coords || coords.length < 2) {
    throw new Error(`graphhopperSnap(${slug}): need at least 2 coords`);
  }
  const key = process.env.GRAPHHOPPER_API_KEY;
  if (!key) {
    throw new Error(`graphhopperSnap(${slug}): GRAPHHOPPER_API_KEY not set in env`);
  }
  const pointParams = coords.map(([lat, lon]) => `point=${lat},${lon}`).join('&');
  const url = `${ENDPOINT}?${pointParams}&profile=${profile}&type=json&points_encoded=false&instructions=false&calc_points=true&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`graphhopperSnap(${slug}): HTTP ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  const path = body.paths?.[0];
  if (!path || !path.points?.coordinates) {
    throw new Error(`graphhopperSnap(${slug}): no path in response`);
  }

  return buildGpx({
    name: slug,
    coords: path.points.coordinates,  // [[lon, lat, ele?], ...]
  });
}

function buildGpx({ name, coords }) {
  const trkpts = coords
    .map(([lon, lat, ele]) => {
      const eleTag = ele != null ? `<ele>${ele}</ele>` : '';
      return `      <trkpt lat="${lat}" lon="${lon}">${eleTag}</trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath-graphhopperSnap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name></metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}
