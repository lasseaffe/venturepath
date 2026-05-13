// VenturePath · Phase 3 · Offline cache for Gatherings (Tactical Mode)
// TACTICAL-CRITICAL: this module must work offline
//
// Caches the next 7 days of confirmed Gatherings to localStorage so Tactical
// Mode can surface them and reference their coords in SOS messages even with
// zero connectivity.

const CACHE_KEY = 'vp_tactical_gatherings';
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

export function cacheGatherings(gatherings = []) {
  try {
    const now = Date.now();
    const future = gatherings.filter(g => {
      const t = new Date(g.starts_at).getTime();
      return t >= now && t <= now + HORIZON_MS && g.status !== 'cancelled';
    });
    // Strip down to only what Tactical Mode needs
    const slim = future.map(g => ({
      id: g.id,
      title: g.title,
      starts_at: g.starts_at,
      location_label: g.location_label,
      coords: g.coords,
      template_id: g.template_id,
    }));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, items: slim }));
  } catch {
    // localStorage may be unavailable (privacy mode, quota); fail silently
  }
}

export function readCachedGatherings() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const { items } = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function nextCachedGathering() {
  const items = readCachedGatherings();
  const now = Date.now();
  return items
    .filter(g => new Date(g.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] ?? null;
}
