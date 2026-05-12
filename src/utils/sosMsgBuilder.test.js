import { describe, it, expect } from 'vitest';
import { buildSosMessage } from './sosMsgBuilder.js';

describe('buildSosMessage', () => {
  const BASE = {
    words: 'lock.spout.radar',
    lat: 51.5074,
    lng: -0.1278,
    country: 'GB',
    nearestPlace: 'Bayswater, London',
    timestamp: '2026-05-11T14:23:00.000Z',
  };

  it('includes the what3words address with triple-slash prefix', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('/// lock.spout.radar');
  });

  it('includes formatted coordinates', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('51.5074');
    expect(msg).toContain('-0.1278');
  });

  it('includes the local emergency number for the country', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('999'); // GB emergency number
  });

  it('includes the timestamp', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('2026-05-11T14:23:00.000Z');
  });

  it('includes the nearest place', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('Bayswater, London');
  });

  it('includes the venturepath.com/sos attribution URL', () => {
    const msg = buildSosMessage(BASE);
    expect(msg).toContain('venturepath.com/sos');
  });

  it('defaults to 112 when country is unknown', () => {
    const msg = buildSosMessage({ ...BASE, country: 'XX' });
    expect(msg).toContain('112');
  });
});
