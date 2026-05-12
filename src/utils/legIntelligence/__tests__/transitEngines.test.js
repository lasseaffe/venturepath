import { describe, it, expect } from 'vitest';
import { hydrateFlightLeg } from '../engines/flightEngine.js';
import { hydrateTrainLeg } from '../engines/trainEngine.js';
import { hydrateBusLeg } from '../engines/busEngine.js';
import { hydrateFerryLeg } from '../engines/ferryEngine.js';
import { hydrateBoatLeg } from '../engines/boatEngine.js';

describe('hydrateFlightLeg', () => {
  it('returns legMeta with mode flight', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight', from: 'MUC', to: 'SCL' });
    expect(legMeta.mode).toBe('flight');
  });
  it('returns legMeta with carrier null by default', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(legMeta.carrier).toBeNull();
  });
  it('seeds carrier from leg.meta if present', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight', meta: { carrier: 'LATAM', flightNumber: 'LA800' } });
    expect(legMeta.carrier).toBe('LATAM');
    expect(legMeta.flightNumber).toBe('LA800');
  });
  it('returns empty waypoints array', async () => {
    const { waypoints } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(waypoints).toEqual([]);
  });
  it('includes lastHydratedAt', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(legMeta.lastHydratedAt).toBeTruthy();
  });
});

describe('hydrateTrainLeg', () => {
  it('returns legMeta with mode train', async () => {
    const { legMeta } = await hydrateTrainLeg({ id: 2, mode: 'train' });
    expect(legMeta.mode).toBe('train');
  });
  it('seeds carrier from leg.meta', async () => {
    const { legMeta } = await hydrateTrainLeg({ id: 2, mode: 'train', meta: { carrier: 'DB', trainNumber: 'ICE 1234' } });
    expect(legMeta.carrier).toBe('DB');
    expect(legMeta.trainNumber).toBe('ICE 1234');
  });
  it('returns empty waypoints by default', async () => {
    const { waypoints } = await hydrateTrainLeg({ id: 2, mode: 'train' });
    expect(waypoints).toEqual([]);
  });
});

describe('hydrateBusLeg', () => {
  it('returns legMeta with mode bus', async () => {
    const { legMeta } = await hydrateBusLeg({ id: 3, mode: 'bus' });
    expect(legMeta.mode).toBe('bus');
  });
  it('seeds restroomBreaks from leg.meta', async () => {
    const { legMeta } = await hydrateBusLeg({ id: 3, mode: 'bus', meta: { restroomBreaks: 2 } });
    expect(legMeta.restroomBreaks).toBe(2);
  });
});

describe('hydrateFerryLeg', () => {
  it('returns legMeta with mode ferry', async () => {
    const { legMeta } = await hydrateFerryLeg({ id: 4, mode: 'ferry' });
    expect(legMeta.mode).toBe('ferry');
  });
  it('seeds vehicleCarried flag from leg.meta', async () => {
    const { legMeta } = await hydrateFerryLeg({ id: 4, mode: 'ferry', meta: { vehicleCarried: true } });
    expect(legMeta.vehicleCarried).toBe(true);
  });
});

describe('hydrateBoatLeg', () => {
  it('returns legMeta with mode boat', async () => {
    const { legMeta } = await hydrateBoatLeg({ id: 5, mode: 'boat' });
    expect(legMeta.mode).toBe('boat');
  });
  it('seeds marina from leg.meta', async () => {
    const { legMeta } = await hydrateBoatLeg({ id: 5, mode: 'boat', meta: { marina: 'Puerto Natales Marina' } });
    expect(legMeta.marina).toBe('Puerto Natales Marina');
  });
});
