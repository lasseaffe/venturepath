/**
 * parseGpx — Extract track points from GPX XML string
 * Returns array of { lat, lng, alt, timestamp, hr }
 * Designed for matching with photo metadata via timestamp
 */

// Use xmldom for robust XML parsing - it works in both Node and browsers
// eslint-disable-next-line import/no-unresolved
import { DOMParser as XMLDOMParser } from '@xmldom/xmldom';

// Fallback to global DOMParser if xmldom is not available
const getParser = () => {
  try {
    return XMLDOMParser;
  } catch {
    return DOMParser;
  }
};

const Parser = getParser();

export function parseGpx(gpxString) {
  const parser = new Parser();
  const doc = parser.parseFromString(gpxString, 'application/xml');
  const points = [...doc.getElementsByTagName('trkpt')];

  return points.map(pt => {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lng = parseFloat(pt.getAttribute('lon'));
    const eleEls = pt.getElementsByTagName('ele');
    const timeEls = pt.getElementsByTagName('time');

    // Heart rate can be in namespaced element (gpxtpx:hr)
    // Try both plain 'hr' and 'gpxtpx:hr'
    let hrEls = pt.getElementsByTagName('hr');
    if (hrEls.length === 0) {
      hrEls = pt.getElementsByTagName('gpxtpx:hr');
    }

    return {
      lat,
      lng,
      alt: eleEls.length > 0 ? parseFloat(eleEls[0].textContent) : null,
      timestamp: timeEls.length > 0 ? timeEls[0].textContent.trim() : null,
      hr: hrEls.length > 0 ? parseInt(hrEls[0].textContent, 10) : null,
    };
  });
}

/**
 * matchGpxToPhotos — Align photos with GPX track points by timestamp proximity
 * Finds the closest track point for each photo within maxGapMs
 * Augments matched photos with { altitude, heart_rate }
 */
export function matchGpxToPhotos(trackPoints, photos, maxGapMs = 5 * 60 * 1000) {
  return photos.map(photo => {
    const photoTime = new Date(photo.timestamp).getTime();
    let best = null;
    let bestGap = Infinity;

    for (const pt of trackPoints) {
      const gap = Math.abs(new Date(pt.timestamp).getTime() - photoTime);
      if (gap < bestGap) {
        bestGap = gap;
        best = pt;
      }
    }

    if (best && bestGap <= maxGapMs) {
      return { ...photo, altitude: best.alt, heart_rate: best.hr };
    }
    return photo;
  });
}
