// pipeline/lib/graphhopperSnap.js
// Snaps a list of [lat, lon] coordinates to a real path via GraphHopper.
// Returns a GPX 1.1 XML string ready to write to pipeline/gpx/<slug>.gpx.
// GraphHopper requires an API key (free tier sufficient for one-off batch).
// Set GRAPHHOPPER_API_KEY in .env.local. Orchestrator sleeps 2s between routes
// to stay under rate limit.

const ENDPOINT = process.env.GRAPHHOPPER_URL ?? 'https://graphhopper.com/api/1/route';

// GraphHopper free tier caps a single Routing API call at 5 points. Chunk
// coords into overlapping batches of 5 (last point of batch N = first point
// of batch N+1) and concatenate the snapped segments.
const MAX_POINTS_PER_CALL = 5;

async function snapBatch({ coords, slug, profile, key }) {
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
  return path.points.coordinates;
}

export async function graphhopperSnap({ coords, slug, profile = 'foot' }) {
  if (!coords || coords.length < 2) {
    throw new Error(`graphhopperSnap(${slug}): need at least 2 coords`);
  }
  const key = process.env.GRAPHHOPPER_API_KEY;
  if (!key) {
    throw new Error(`graphhopperSnap(${slug}): GRAPHHOPPER_API_KEY not set in env`);
  }

  // Split into overlapping batches of up to MAX_POINTS_PER_CALL.
  const batches = [];
  for (let i = 0; i < coords.length - 1; i += MAX_POINTS_PER_CALL - 1) {
    batches.push(coords.slice(i, i + MAX_POINTS_PER_CALL));
  }

  // Snap each batch, concatenate results, dedupe the seam point between batches.
  const allCoords = [];
  for (let b = 0; b < batches.length; b++) {
    const snapped = await snapBatch({ coords: batches[b], slug, profile, key });
    if (b === 0) {
      allCoords.push(...snapped);
    } else {
      // Drop first coord of subsequent batches — duplicates the seam.
      allCoords.push(...snapped.slice(1));
    }
  }

  return buildGpx({
    name: slug,
    coords: allCoords,  // [[lon, lat, ele?], ...]
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
