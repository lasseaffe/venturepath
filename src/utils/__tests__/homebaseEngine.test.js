import { vi } from 'vitest';
import sentinelBus from '../sentinelBus.js';
import { HOMEBASE_STOP_ADDED } from '../sentinelBusEvents.js';
import { buildLegs, buildCascadePreviews, onStopAdded } from '../homebaseEngine';

const homebaseCoords = [53.5488, 9.9872]; // Hamburg Speicherstadt

const stops = [
  { id: 'poi-1', name: 'Kunsthalle', coords: [53.5607, 10.0006], category: 'museum' },
  { id: 'poi-2', name: 'Speicherstadt', coords: [53.5435, 9.9995], category: 'district' },
];

describe('buildLegs', () => {
  it('produces outbound legs from homebase through each stop', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    // homebase → poi-1 → poi-2 → homebase = 3 legs
    expect(legs).toHaveLength(3);
    expect(legs[0].from).toBe('homebase');
    expect(legs[0].toId).toBe('poi-1');
    expect(legs[1].from).toBe('poi-1');
    expect(legs[1].toId).toBe('poi-2');
    expect(legs[2].from).toBe('poi-2');
    expect(legs[2].toId).toBe('homebase');
  });

  it('all produced legs have source homebase-engine', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs.every(l => l.source === 'homebase-engine')).toBe(true);
  });

  it('all produced legs have dayLoopId', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs.every(l => l.dayLoopId === 'loop-1')).toBe(true);
  });

  it('returns empty array when no stops', () => {
    expect(buildLegs('loop-1', homebaseCoords, [])).toEqual([]);
  });

  it('calculates non-zero distanceKm between Hamburg coords', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs[0].distanceKm).toBeGreaterThan(0);
  });

  it('each leg has a unique id', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    const ids = legs.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

const mockPayload = {
  dayLoopId: 'loop-1',
  dayLoop: { id: 'loop-1', date: '2026-05-16', homebaseStayId: 'stay-1', stopIds: ['poi-1'] },
  stop: { id: 'poi-1', name: 'Kunsthalle', coords: [53.5607, 10.0006], category: 'museum' },
  legs: [
    { id: 'leg-1', distanceKm: 1.4, mode: 'foot', source: 'homebase-engine' },
    { id: 'leg-2', distanceKm: 1.4, mode: 'foot', source: 'homebase-engine' },
  ],
  homebaseCoords: [53.5488, 9.9872],
  totalDistanceKm: 2.8,
  tripClimate: 'temperate',
};

describe('buildCascadePreviews', () => {
  it('returns a preview object for each of the 8 tools', () => {
    const previews = buildCascadePreviews(mockPayload);
    const keys = ['budget', 'packing', 'map', 'elevation', 'transit', 'tactical', 'squad', 'ledger'];
    keys.forEach(k => {
      expect(previews[k]).toBeDefined();
      expect(typeof previews[k].label).toBe('string');
      expect(typeof previews[k].value).toBe('string');
      expect(typeof previews[k].apply).toBe('function');
    });
  });

  it('budget preview includes a positive cost estimate', () => {
    const previews = buildCascadePreviews(mockPayload);
    expect(previews.budget.value).toMatch(/€/);
  });

  it('packing preview includes item suggestions for museum category', () => {
    const previews = buildCascadePreviews(mockPayload);
    expect(previews.packing.value).toMatch(/item/);
  });
});

describe('onStopAdded', () => {
  beforeEach(() => sentinelBus._reset());

  it('emits HOMEBASE_STOP_ADDED with correct payload', () => {
    const handler = vi.fn();
    sentinelBus.on(HOMEBASE_STOP_ADDED, handler);

    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: ['poi-1'], planningMode: 'full' };
    const stop = { id: 'poi-1', name: 'Kunsthalle', coords: [53.56, 10.0], category: 'museum' };
    const homebaseCoords = [53.54, 9.98];
    const dispatch = vi.fn();

    onStopAdded({ dayLoop, stop, homebaseCoords, allStops: [stop], mode: 'full', dispatch });

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0];
    expect(payload.dayLoopId).toBe('loop-1');
    expect(payload.stop.id).toBe('poi-1');
    expect(payload.legs).toBeDefined();
  });

  it('dispatches SET_AUTO_LEGS in full mode', () => {
    const dispatch = vi.fn();
    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: ['poi-1'], planningMode: 'full' };
    const stop = { id: 'poi-1', name: 'Museum', coords: [53.56, 10.0], category: 'museum' };

    onStopAdded({ dayLoop, stop, homebaseCoords: [53.54, 9.98], allStops: [stop], mode: 'full', dispatch });

    const setAutoCall = dispatch.mock.calls.find(c => c[0].type === 'SET_AUTO_LEGS');
    expect(setAutoCall).toBeDefined();
  });

  it('does not dispatch SET_AUTO_LEGS in manual mode', () => {
    const dispatch = vi.fn();
    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: [], planningMode: 'manual' };
    const stop = { id: 'poi-1', name: 'Museum', coords: [53.56, 10.0], category: 'museum' };

    onStopAdded({ dayLoop, stop, homebaseCoords: [53.54, 9.98], allStops: [stop], mode: 'manual', dispatch });

    const setAutoCall = dispatch.mock.calls.find(c => c[0].type === 'SET_AUTO_LEGS');
    expect(setAutoCall).toBeUndefined();
  });
});
