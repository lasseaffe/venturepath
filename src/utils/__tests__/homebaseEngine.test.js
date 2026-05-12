import { buildLegs } from '../homebaseEngine';

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
