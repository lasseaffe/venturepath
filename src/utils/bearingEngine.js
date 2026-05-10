const DEG = Math.PI / 180;

export function computeBearing(from, to) {
  const lat1 = from.lat * DEG;
  const lat2 = to.lat * DEG;
  const dLng = (to.lng - from.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

// Binary search: find index i such that breadcrumbs[i].timestamp <= ts < breadcrumbs[i+1].timestamp
function findBracket(breadcrumbs, ts) {
  let lo = 0;
  let hi = breadcrumbs.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (breadcrumbs[mid].timestamp <= ts && breadcrumbs[mid + 1].timestamp > ts) return mid;
    if (breadcrumbs[mid].timestamp < ts) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

export function deriveBearing(photo, breadcrumbs) {
  if (photo.bearing != null) return photo.bearing;

  if (breadcrumbs.length >= 2 && photo.timestamp) {
    const i = findBracket(breadcrumbs, photo.timestamp);
    if (i >= 0) {
      return computeBearing(
        { lat: breadcrumbs[i].lat,     lng: breadcrumbs[i].lng },
        { lat: breadcrumbs[i + 1].lat, lng: breadcrumbs[i + 1].lng },
      );
    }
  }

  return 0;
}

const EARTH_R = 6371; // km

export function haversineKm(from, to) {
  const dLat = (to.lat - from.lat) * DEG;
  const dLng = (to.lng - from.lng) * DEG;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * DEG) * Math.cos(to.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.asin(Math.sqrt(a));
}
