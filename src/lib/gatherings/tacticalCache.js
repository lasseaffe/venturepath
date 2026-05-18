// TACTICAL-CRITICAL: this module must work offline — reads/writes only to localStorage
const KEY = 'vp_tactical_gatherings';
const HORIZON_DAYS = 7;

export function cacheGatherings(gatherings) {
  try {
    const horizon = Date.now() + HORIZON_DAYS * 86_400_000;
    const items = (gatherings || []).filter(g => {
      const t = new Date(g.starts_at).getTime();
      return t >= Date.now() && t <= horizon;
    });
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (_) { /* storage unavailable — fail silently */ }
}

export function readCachedGatherings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function nextCachedGathering() {
  const items = readCachedGatherings();
  if (!items.length) return null;
  return items.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
}
