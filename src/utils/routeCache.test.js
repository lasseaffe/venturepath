import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCached, makeCacheKey, clearCache } from './routeCache';

describe('routeCache', () => {
  beforeEach(() => clearCache());

  it('returns null for a cache miss', () => {
    const key = makeCacheKey({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(getCached(key)).toBeNull();
  });

  it('returns stored value on hit', () => {
    const key = makeCacheKey({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    const data = [{ mode: 'car', durationH: 5, distanceKm: 450 }];
    setCached(key, data);
    expect(getCached(key)).toEqual(data);
  });

  it('rounds coords to 4dp so near-identical coords hit the same key', () => {
    const key1 = makeCacheKey({ lat: 51.50741, lng: -0.12781 }, { lat: 48.85661, lng: 2.35221 });
    const key2 = makeCacheKey({ lat: 51.5074,  lng: -0.1278  }, { lat: 48.8566,  lng: 2.3522  });
    expect(key1).toBe(key2);
  });
});
