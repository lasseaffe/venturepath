// Geolocation engine — proximity detection for AR Ghost Tours

/**
 * Haversine distance between two lat/lng points in metres.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6_371_000; // Earth radius in metres
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Watch user position and fire onNearby when within thresholdM of any POI.
 * Returns an unsubscribe function.
 * @param {Array} pois  - [{ id, coords: { lat, lng }, ...rest }]
 * @param {function} onNearby - called with the nearby POI object (or null when leaving)
 * @param {number} thresholdM - proximity radius in metres (default 50)
 * @returns {{ stop: function, supported: boolean }}
 */
export function watchProximity(pois, onNearby, thresholdM = 50) {
  if (!navigator.geolocation) {
    return { stop: () => {}, supported: false };
  }

  let currentNearbyId = null;

  const watchId = navigator.geolocation.watchPosition(
    position => {
      const { latitude, longitude } = position.coords;
      let found = null;
      for (const poi of pois) {
        const dist = haversineDistance(latitude, longitude, poi.coords.lat, poi.coords.lng);
        if (dist <= thresholdM) { found = poi; break; }
      }
      const newId = found?.id ?? null;
      if (newId !== currentNearbyId) {
        currentNearbyId = newId;
        onNearby(found);
      }
    },
    () => { /* permission denied or error — handled gracefully in component */ },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );

  return { stop: () => navigator.geolocation.clearWatch(watchId), supported: true };
}
