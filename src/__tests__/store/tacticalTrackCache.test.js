import { describe, it, expect, beforeEach } from 'vitest';
import { cacheTacticalTrack, loadTacticalTracks, clearTacticalTracks } from '../../store/tacticalTrackCache.js';

beforeEach(async () => { await clearTacticalTracks(); });

describe('tacticalTrackCache', () => {
  it('stores and retrieves a track', async () => {
    await cacheTacticalTrack({ id: 't1', name: 'Ridge Run', points: [{ lat: 47, lng: 11, ele: 1200 }] });
    const tracks = await loadTacticalTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Ridge Run');
  });

  it('accumulates multiple tracks (does not overwrite)', async () => {
    await cacheTacticalTrack({ id: 'a', name: 'A', points: [] });
    await cacheTacticalTrack({ id: 'b', name: 'B', points: [] });
    const tracks = await loadTacticalTracks();
    expect(tracks).toHaveLength(2);
  });

  it('returns [] when nothing cached', async () => {
    expect(await loadTacticalTracks()).toEqual([]);
  });
});
