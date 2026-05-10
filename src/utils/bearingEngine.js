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
    const sorted = [...breadcrumbs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const i = findBracket(sorted, photo.timestamp);
    if (i >= 0) {
      return computeBearing(
        { lat: sorted[i].lat,     lng: sorted[i].lng },
        { lat: sorted[i + 1].lat, lng: sorted[i + 1].lng },
      );
    }
  }

  return 0;
}
