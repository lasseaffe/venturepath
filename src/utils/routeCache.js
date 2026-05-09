const cache = new Map();

export function makeCacheKey(fromCoords, toCoords) {
  const r = (n) => Math.round(n * 10000) / 10000;
  return `${r(fromCoords.lat)},${r(fromCoords.lng)}|${r(toCoords.lat)},${r(toCoords.lng)}`;
}

export function getCached(key) {
  return cache.has(key) ? cache.get(key) : null;
}

export function setCached(key, value) {
  cache.set(key, value);
}

export function clearCache() {
  cache.clear();
}
