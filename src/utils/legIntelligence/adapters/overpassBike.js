/**
 * Overpass Road Suitability Adapter
 * Queries Overpass API for road metadata and scores segments for bike-friendliness (0-1 scale)
 */

/**
 * Score a single road segment for bicycle suitability
 * @param {Object} segment - Road segment with roadClass, surface, hasCycleway, hasBicycleLane
 * @returns {number} Score from 0 (least suitable) to 1 (most suitable)
 */
export function scoreSegment(segment) {
  const { roadClass, hasCycleway, hasBicycleLane } = segment;

  // Base scores by road class
  const baseScores = {
    motorway: 0.1,
    trunk: 0.1,
    primary: 0.4,
    secondary: 0.7,
    tertiary: 0.6,
    residential: 0.9,
    living_street: 0.9,
    path: 0.6,
    track: 0.6,
    unclassified: 0.5,
  };

  let score = baseScores[roadClass] ?? 0.5; // Default to 0.5 for unknown classes

  // Add bonuses
  if (hasBicycleLane) {
    score += 0.2;
  }
  if (hasCycleway) {
    score += 0.3;
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Helper function to determine traffic level from road class
 * @param {string} roadClass - The road class
 * @returns {string} 'high', 'medium', or 'low'
 */
function getTrafficLevel(roadClass) {
  const highTraffic = ['motorway', 'trunk', 'primary'];
  const mediumTraffic = ['secondary', 'tertiary'];

  if (highTraffic.includes(roadClass)) return 'high';
  if (mediumTraffic.includes(roadClass)) return 'medium';
  return 'low';
}

/**
 * Calculate overall bike suitability for a leg (multiple segments)
 * @param {Array} segments - Array of road segments with distanceKm and road properties
 * @returns {Object} { overallScore, segments: [ ...with score + trafficLevel ] }
 */
export function calculateBikeSuitability(segments) {
  if (!segments || segments.length === 0) {
    return {
      overallScore: 0,
      segments: [],
    };
  }

  // Score each segment and compute weighted average
  const scoredSegments = segments.map((segment) => ({
    ...segment,
    score: scoreSegment(segment),
    trafficLevel: getTrafficLevel(segment.roadClass),
  }));

  // Weighted average: longer segments contribute more to overall score
  const totalDistance = segments.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
  const overallScore =
    totalDistance > 0
      ? scoredSegments.reduce((sum, s) => sum + s.score * (s.distanceKm || 0), 0) /
        totalDistance
      : 0;

  return {
    overallScore,
    segments: scoredSegments,
  };
}
