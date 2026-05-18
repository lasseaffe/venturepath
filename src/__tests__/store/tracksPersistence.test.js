import { describe, it, expect, beforeEach } from 'vitest';
import { saveTracks, loadTracks, clearTracks } from '../../store/tracksPersistence.js';

beforeEach(async () => {
  await clearTracks();
});

describe('tracksPersistence', () => {
  it('round-trips an array of tracks', async () => {
    const tracks = [{ id: 't1', name: 'A', points: [{ lat: 1, lng: 2, ele: 100 }] }];
    await saveTracks(tracks);
    const loaded = await loadTracks();
    expect(loaded).toEqual(tracks);
  });

  it('returns [] when nothing is saved', async () => {
    expect(await loadTracks()).toEqual([]);
  });

  it('overwrites prior tracks on save', async () => {
    await saveTracks([{ id: 'a' }]);
    await saveTracks([{ id: 'b' }]);
    expect(await loadTracks()).toEqual([{ id: 'b' }]);
  });
});
