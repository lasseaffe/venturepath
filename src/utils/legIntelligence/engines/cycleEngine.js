import { calculateBikeSuitability } from '../adapters/overpassBike';
import { queryOverpassPoi } from '../adapters/overpassPoi';

/**
 * Parse GPX file/string and extract coordinates + distance
 */
export function parseGpx(gpxString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');

  const trkpts = doc.querySelectorAll('trkpt');
  const coords = Array.from(trkpts).map((pt) => [
    parseFloat(pt.getAttribute('lat')),
    parseFloat(pt.getAttribute('lon')),
  ]);

  if (coords.length < 2) {
    throw new Error('GPX file contains fewer than 2 points');
  }

  const distanceKm = calculateHaversineDistance(coords);

  return { coords, distanceKm };
}

/**
 * Parse GraphHopper routing response
 */
export function parseGraphHopperRoute(response) {
  if (!response.paths || response.paths.length === 0) {
    throw new Error('No route found from GraphHopper');
  }

  const path = response.paths[0];
  const coords = path.points.coordinates.map((c) => [c[1], c[0]]); // GH uses [lon,lat]
  const distanceKm = (path.distance || 0) / 1000;

  return { coords, distanceKm };
}

/**
 * Calculate total distance from coordinate array using Haversine formula
 */
export function calculateHaversineDistance(coords) {
  const R = 6371; // Earth radius in km
  let totalKm = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalKm += R * c;
  }

  return parseFloat(totalKm.toFixed(2));
}

/**
 * Add elevation data to coordinates via Open Elevation API
 */
export async function addElevationData(coords) {
  if (coords.length === 0) return { gain: 0, loss: 0, maxGrade: 0 };

  // Sample every Nth point to avoid API limits (5000 point max)
  const sampleRate = Math.ceil(coords.length / 1000);
  const sampledCoords = coords.filter((_, i) => i % sampleRate === 0);

  const elevations = await queryOpenElevation(sampledCoords);

  if (!elevations || elevations.length === 0) {
    return { gain: 0, loss: 0, maxGrade: 0 };
  }

  let gain = 0,
    loss = 0,
    maxGrade = 0;

  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) gain += delta;
    else loss += Math.abs(delta);

    // Calculate grade: (elevation change / distance in meters) * 100
    const distMeters = haversineMeters([coords[i - 1], coords[i]]);
    if (distMeters > 0) {
      const grade = (Math.abs(delta) / distMeters) * 100;
      maxGrade = Math.max(maxGrade, grade);
    }
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    maxGrade: parseFloat(maxGrade.toFixed(1)),
  };
}

/**
 * Query Open Elevation API for coordinates
 */
async function queryOpenElevation(coords) {
  try {
    const locations = coords.map((c) => ({ latitude: c[0], longitude: c[1] }));
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.results.map((r) => r.elevation);
  } catch (error) {
    console.error('Open Elevation query failed:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates in meters
 */
function haversineMeters(coordPair) {
  const R = 6371000; // Earth radius in meters
  const [lat1, lon1] = coordPair[0];
  const [lat2, lon2] = coordPair[1];

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Main entry: parse a cycling leg from GPX or GraphHopper input
 */
export async function parseCyclingLeg(input) {
  const { gpxFile, graphHopperResponse, from, to, routeSource, routeSourceUrl } = input;

  let coords, distanceKm;

  // Parse input
  if (gpxFile) {
    const gpxString = await gpxFile.text();
    ({ coords, distanceKm } = parseGpx(gpxString));
  } else if (graphHopperResponse) {
    ({ coords, distanceKm } = parseGraphHopperRoute(graphHopperResponse));
  } else {
    throw new Error('parseCyclingLeg requires either gpxFile or graphHopperResponse');
  }

  // Get elevation data
  const elevationData = await addElevationData(coords);

  // Query Overpass for suitability and POI
  // Note: In real implementation, would need to query road segments via Overpass
  // For now, placeholder returning empty suitability
  const bikeSuitability = {
    overallScore: 0.7,
    segments: [],
  };

  const waypoints = await queryOverpassPoi(coords, 1.0);

  // Construct enriched leg
  const leg = {
    id: null, // Will be assigned by store
    from,
    to,
    mode: 'cycle',
    durationH: 0, // Calculated from pace later
    distanceKm,
    status: 'pending',
    waypoints,
    legMeta: {
      cycle: {
        routeGpxId: null, // Will be assigned by store after vault save
        routeSource,
        routeSourceUrl,
        totalElevationGainM: elevationData.gain,
        totalElevationLossM: elevationData.loss,
        maxGradePct: elevationData.maxGrade,
        bikeSuitability,
        stages: [], // Calculated later
        paceLedger: {
          proposals: [],
          approvedPace: null,
          approvedBy: null,
          approvedAt: null,
        },
        roles: [
          {
            id: 'sweep',
            label: 'Sweep Rider',
            description: 'Stays at back, ensures no one gets dropped',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
          {
            id: 'navigator',
            label: 'Navigator',
            description: 'Leads route, watches for turns',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
          {
            id: 'support_driver',
            label: 'Support Driver',
            description: 'SAG vehicle support (optional)',
            claimable: true,
            max_claims: 1,
            assigned_to: null,
          },
        ],
      },
    },
  };

  return leg;
}

/**
 * Calculate stages by target km/day
 * Returns array of stage objects with IDs, labels, coordinates, waypoint assignments
 */
export function calculateStagesByDistance(coords, distanceKm, targetKmPerDay, waypoints = [], stays = []) {
  if (targetKmPerDay <= 0 || distanceKm <= 0) {
    throw new Error('targetKmPerDay and distanceKm must be > 0');
  }

  const stages = [];
  const coordsPerKm = coords.length / distanceKm;
  let cumulativeKm = 0;
  let cumulativeCoordIndex = 0;
  let stageNumber = 1;

  while (cumulativeCoordIndex < coords.length && cumulativeKm < distanceKm) {
    // Accumulate until >= targetKmPerDay
    const targetCoordIndex = Math.min(
      coords.length - 1,
      cumulativeCoordIndex + Math.ceil(targetKmPerDay * coordsPerKm)
    );

    // Calculate actual distance for this segment
    const stageCoordsSlice = coords.slice(cumulativeCoordIndex, targetCoordIndex + 1);
    const stageDistanceKm = calculateHaversineDistance(stageCoordsSlice);

    // Find nearest overnight stay to endpoint (if exists)
    const stageEndCoord = stageCoordsSlice[stageCoordsSlice.length - 1];
    const nearbyStay = findNearestStay(stageEndCoord, stays, 5); // 5km buffer

    // Assign waypoints to this stage
    const stageWaypoints = waypoints.filter((wp) => {
      const distance = haversineMeters([stageEndCoord, [wp.lat, wp.lon]]) / 1000;
      return distance < 5; // within 5km of stage endpoint
    });

    stages.push({
      id: `stage-${stageNumber}`,
      label: nearbyStay ? nearbyStay.name : `Day ${stageNumber}`,
      fromCoord: stageCoordsSlice[0],
      toCoord: stageCoordsSlice[stageCoordsSlice.length - 1],
      distanceKm: parseFloat(stageDistanceKm.toFixed(2)),
      elevationGainM: 0, // Will be calculated separately
      estimatedDurationH: parseFloat((stageDistanceKm / 20).toFixed(1)), // Assume 20km/h average
      plannedStop: nearbyStay ? nearbyStay.id : null,
      waypoints: stageWaypoints.map((wp) => wp.id),
      roleAssignments: { sweep: null, navigator: null, support_driver: null },
    });

    cumulativeKm += stageDistanceKm;
    cumulativeCoordIndex = targetCoordIndex;
    stageNumber++;
  }

  return stages;
}

/**
 * Calculate stages based on existing overnight stays
 */
export function calculateStagesByStays(coords, stays, distanceKm, waypoints = []) {
  if (!stays || stays.length === 0) {
    return calculateStagesByDistance(coords, distanceKm, 65, waypoints, []);
  }

  const stages = [];

  // Sort stays by order along route (using coords proximity)
  const sortedStays = stays.sort((a, b) => {
    const distA = findClosestCoordIndex(coords, [a.lat, a.lon]);
    const distB = findClosestCoordIndex(coords, [b.lat, b.lon]);
    return distA - distB;
  });

  let currentCoordIndex = 0;

  sortedStays.forEach((stay, stayIndex) => {
    const stayCoordIndex = findClosestCoordIndex(coords, [stay.lat, stay.lon]);

    if (stayCoordIndex <= currentCoordIndex) return; // skip if stay is behind current position

    const stageCoordsSlice = coords.slice(currentCoordIndex, stayCoordIndex + 1);
    const stageDistanceKm = calculateHaversineDistance(stageCoordsSlice);

    // Assign waypoints
    const stageWaypoints = waypoints.filter((wp) => {
      const distance = haversineMeters([[stageCoordsSlice[0], stageCoordsSlice[stageCoordsSlice.length - 1]], [wp.lat, wp.lon]]) / 1000;
      return distance < 5;
    });

    stages.push({
      id: `stage-${stayIndex + 1}`,
      label: stay.name || `Day ${stayIndex + 1}`,
      fromCoord: stageCoordsSlice[0],
      toCoord: stageCoordsSlice[stageCoordsSlice.length - 1],
      distanceKm: parseFloat(stageDistanceKm.toFixed(2)),
      elevationGainM: 0,
      estimatedDurationH: parseFloat((stageDistanceKm / 20).toFixed(1)),
      plannedStop: stay.id,
      waypoints: stageWaypoints.map((wp) => wp.id),
      roleAssignments: { sweep: null, navigator: null, support_driver: null },
    });

    currentCoordIndex = stayCoordIndex;
  });

  return stages;
}

/**
 * Find closest coordinate index to a given point
 */
function findClosestCoordIndex(coords, targetCoord) {
  let minDistance = Infinity;
  let closestIndex = 0;

  coords.forEach((coord, index) => {
    const distance = haversineMeters([coord, targetCoord]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Find nearest overnight stay to a coordinate (with optional km buffer)
 */
function findNearestStay(coord, stays, bufferKm = 5) {
  if (!stays || stays.length === 0) return null;

  let nearest = null;
  let minDistance = bufferKm * 1000; // Convert to meters

  stays.forEach((stay) => {
    const distance = haversineMeters([coord, [stay.lat, stay.lon]]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = stay;
    }
  });

  return nearest;
}
