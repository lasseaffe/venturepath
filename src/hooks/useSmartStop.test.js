import { describe, it, expect } from 'vitest';
import { getVisitDurationSuggestion } from './useSmartStop';

describe('getVisitDurationSuggestion', () => {
  it('returns ~2.5h for museum', () => {
    expect(getVisitDurationSuggestion('Museum')).toBe('~2.5h');
  });

  it('returns ~1.5h for restaurant', () => {
    expect(getVisitDurationSuggestion('Restaurant')).toBe('~1.5h');
  });

  it('returns ~2h for bar', () => {
    expect(getVisitDurationSuggestion('Bar')).toBe('~2h');
  });

  it('returns ~3h for park', () => {
    expect(getVisitDurationSuggestion('Park')).toBe('~3h');
  });

  it('returns null for hotel', () => {
    expect(getVisitDurationSuggestion('Hotel')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(getVisitDurationSuggestion('Bookshop')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getVisitDurationSuggestion('CAFE')).toBe('~1.5h');
  });
});
