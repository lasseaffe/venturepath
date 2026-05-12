import { describe, it, expect } from 'vitest';
import { getEmergencyNumber } from './emergencyNumbers.js';

describe('getEmergencyNumber', () => {
  it('returns 911 for the United States', () => {
    expect(getEmergencyNumber('US')).toBe('911');
  });

  it('returns 999 for Great Britain', () => {
    expect(getEmergencyNumber('GB')).toBe('999');
  });

  it('returns 000 for Australia', () => {
    expect(getEmergencyNumber('AU')).toBe('000');
  });

  it('returns 112 (EU standard) for Germany', () => {
    expect(getEmergencyNumber('DE')).toBe('112');
  });

  it('returns 112 as the default for unknown country codes', () => {
    expect(getEmergencyNumber('XX')).toBe('112');
  });

  it('returns 112 when country is null or undefined', () => {
    expect(getEmergencyNumber(null)).toBe('112');
    expect(getEmergencyNumber(undefined)).toBe('112');
  });

  it('is case-insensitive', () => {
    expect(getEmergencyNumber('us')).toBe('911');
    expect(getEmergencyNumber('Gb')).toBe('999');
  });
});
