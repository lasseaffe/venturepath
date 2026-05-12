import { describe, it, expect } from 'vitest';
import { tracksReducer, initialTracksState, ADD_TRACK, APPEND_POINTS, UNDO, REDO, REMOVE_TRACK } from '../../../store/slices/tracks.js';

describe('tracks slice', () => {
  it('ADD_TRACK appends a new track with generated id and empty points', () => {
    const next = tracksReducer(initialTracksState, {
      type: ADD_TRACK,
      payload: { name: 'Compose Test', profile: 'foot' },
    });
    expect(next.tracks).toHaveLength(1);
    expect(next.tracks[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(next.tracks[0].name).toBe('Compose Test');
    expect(next.tracks[0].profile).toBe('foot');
    expect(next.tracks[0].points).toEqual([]);
    expect(next.tracks[0].segments).toEqual([]);
    expect(next.tracks[0].source).toBe('drawn');
  });

  it('APPEND_POINTS adds points and a segment record', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'cycling' } });
    const id = a.tracks[0].id;
    const b = tracksReducer(a, {
      type: APPEND_POINTS,
      payload: {
        trackId: id,
        points: [{ lat: 52.0, lng: 5.0, ele: 10 }, { lat: 52.1, lng: 5.1, ele: 12 }],
        engine: 'brouter',
        profile: 'cycling',
      },
    });
    expect(b.tracks[0].points).toHaveLength(2);
    expect(b.tracks[0].segments).toHaveLength(1);
    expect(b.tracks[0].segments[0]).toMatchObject({ fromIdx: 0, toIdx: 1, profile: 'cycling', routerEngine: 'brouter' });
  });

  it('UNDO restores prior state; REDO re-applies it', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'foot' } });
    const undone = tracksReducer(a, { type: UNDO });
    expect(undone.tracks).toHaveLength(0);
    const redone = tracksReducer(undone, { type: REDO });
    expect(redone.tracks).toHaveLength(1);
  });

  it('REMOVE_TRACK drops a track by id', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'foot' } });
    const id = a.tracks[0].id;
    const b = tracksReducer(a, { type: REMOVE_TRACK, payload: { trackId: id } });
    expect(b.tracks).toHaveLength(0);
  });
});
