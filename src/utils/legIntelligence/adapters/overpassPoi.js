/**
 * Overpass POI Adapter
 *
 * Queries Overpass API for points of interest (shops, toilets, bike shops, food, landmarks)
 * within a specified buffer of a cycling route and creates enriched waypoints.
 */

/**
 * Maps OSM amenity/tourism tags to VenturePath category
 * @param {Object} tags - OSM tags object
 * @returns {string} Category name
 */
function mapAmenityToCategory(tags) {
  if (tags.amenity === 'bicycle_shop' || tags.amenity === 'bicycle_repair_station') {
    return 'bike_shop';
  }
  if (tags.amenity === 'shop') {
    return 'shop';
  }
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'cafe_bar') {
    return 'food';
  }
  if (tags.amenity === 'toilets') {
    return 'toilet';
  }
  if (tags.tourism === 'viewpoint' || tags.tourism === 'information') {
    return 'poi';
  }
  return 'poi';
}

/**
 * Converts an OSM POI node to a VenturePath waypoint
 * @param {Object} poi - OSM node object with lat, lon, tags
 * @param {string} category - Category for the waypoint
 * @param {number} distanceFromRouteKm - Distance from route in km
 * @returns {Object} Waypoint object
 */
export function mapPoiToWaypoint(poi, category, distanceFromRouteKm) {
  const label = poi.tags.name || poi.tags.amenity || poi.tags.tourism || 'Unnamed';

  // Build description from available metadata
  const descriptionParts = [];
  if (poi.tags.opening_hours) {
    descriptionParts.push(`Hours: ${poi.tags.opening_hours}`);
  }
  if (poi.tags.phone) {
    descriptionParts.push(`Phone: ${poi.tags.phone}`);
  }

  const waypoint = {
    id: `poi_${poi.id || Math.random().toString(36).substr(2, 9)}`,
    lat: poi.lat,
    lon: poi.lon,
    category,
    label,
    distance_from_route_km: distanceFromRouteKm,
  };

  if (descriptionParts.length > 0) {
    waypoint.description = descriptionParts.join(' | ');
  }

  return waypoint;
}

/**
 * Queries Overpass API for POIs near a route
 * @param {Array<[number, number]> | Object} coords - Array of [lat, lon] pairs or bbox object
 * @param {number} bufferKm - Buffer distance in km (default 1.0)
 * @returns {Promise<Array> | Array} Array of waypoint objects
 */
export function queryOverpassPoi(coords, bufferKm = 1.0) {
  // Handle bbox object input
  let bbox;
  if (typeof coords === 'object' && coords.south !== undefined) {
    bbox = coords;
  } else if (Array.isArray(coords)) {
    // Calculate bounding box from coordinate array
    bbox = calculateBbox(coords, bufferKm);
  }

  // Validate bbox - return early if invalid (synchronous)
  if (!bbox || bbox.south >= bbox.north || bbox.west >= bbox.east) {
    return [];
  }

  // Return the async promise for valid bbox
  return queryOverpassApiAsync(bbox);
}

/**
 * Internal async function to query Overpass API
 * @param {Object} bbox - Bounding box with south, north, west, east
 * @returns {Promise<Array>} Array of waypoint objects
 */
async function queryOverpassApiAsync(bbox) {

  const query = buildOverpassQuery(bbox);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.statusText);
      return [];
    }

    const data = await response.json();
    const waypoints = [];

    // Map OSM elements to waypoints
    if (data.elements) {
      data.elements.forEach((element) => {
        if (element.type === 'node' && element.tags) {
          const category = mapAmenityToCategory(element.tags);
          // Estimate distance from route (0 for now, should be calculated properly)
          const waypoint = mapPoiToWaypoint(element, category, 0);
          waypoints.push(waypoint);
        }
      });
    }

    return waypoints;
  } catch (error) {
    console.error('Error querying Overpass API:', error);
    return [];
  }
}

/**
 * Calculates bounding box from coordinate array with buffer
 * @param {Array<[number, number]>} coords - Array of [lat, lon] pairs
 * @param {number} bufferKm - Buffer distance in km
 * @returns {Object} Bbox object with south, north, west, east
 */
function calculateBbox(coords, bufferKm) {
  if (!coords || coords.length === 0) {
    return null;
  }

  let minLat = coords[0][0];
  let maxLat = coords[0][0];
  let minLon = coords[0][1];
  let maxLon = coords[0][1];

  coords.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });

  // Convert buffer from km to degrees (1 degree ≈ 111 km)
  const bufferDegrees = bufferKm / 111;

  return {
    south: minLat - bufferDegrees,
    north: maxLat + bufferDegrees,
    west: minLon - bufferDegrees,
    east: maxLon + bufferDegrees,
  };
}

/**
 * Builds an Overpass API query string
 * @param {Object} bbox - Bounding box with south, north, west, east
 * @returns {string} Overpass query
 */
function buildOverpassQuery(bbox) {
  const { south, north, west, east } = bbox;

  // Query for relevant amenities and tourism POIs
  return `
    [bbox:${south},${west},${north},${east}];
    (
      node[amenity~"shop|restaurant|cafe|cafe_bar|toilets|bicycle_repair_station|bicycle_shop"];
      node[tourism~"viewpoint|information"];
    );
    out center;
  `;
}
