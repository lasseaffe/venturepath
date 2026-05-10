// src/hooks/useSwipePreferences.ts
const STORAGE_KEY = 'vp-swipe-prefs';
const DECAY = 0.95; // recency weight per day

export type SwipeMode = 'expedition' | 'spot' | 'filtered';
export type SwipeDecision = 'right' | 'left';

interface SwipePref {
  itemId: string;
  mode: SwipeMode;
  decision: SwipeDecision;
  timestamp: number;
  tags: string[];
}

function load(): SwipePref[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(prefs: SwipePref[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* storage full */ }
}

export function useSwipePreferences() {
  function record(itemId: string, mode: SwipeMode, decision: SwipeDecision, tags: string[]): void {
    const prefs = load();
    prefs.push({ itemId, mode, decision, timestamp: Date.now(), tags });
    save(prefs);
  }

  function getAffinityScore(tags: string[]): number {
    if (!tags.length) return 0;
    const prefs = load();
    const now = Date.now();
    let score = 0;
    let weight = 0;
    for (const p of prefs) {
      const ageMs = now - p.timestamp;
      const ageDays = ageMs / 86_400_000;
      const recency = Math.pow(DECAY, ageDays);
      const overlap = p.tags.filter(t => tags.includes(t)).length / tags.length;
      const direction = p.decision === 'right' ? 1 : -0.5;
      score += recency * overlap * direction;
      weight += recency * overlap;
    }
    if (weight === 0) return 0;
    return Math.max(0, Math.min(1, (score / weight + 1) / 2));
  }

  return { record, getAffinityScore };
}
