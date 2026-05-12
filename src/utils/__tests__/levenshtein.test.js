import { describe, it, expect } from 'vitest';
import { similarity } from '../levenshtein';

describe('similarity', () => {
  it('returns 100 for identical strings', () => {
    expect(similarity('Patagonia Trek', 'Patagonia Trek')).toBe(100);
  });

  it('is case-insensitive', () => {
    expect(similarity('patagonia trek', 'PATAGONIA TREK')).toBe(100);
  });

  it('returns 0 for completely different strings of same length', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('returns high score for near-duplicates', () => {
    expect(similarity('Dolomites Summer Trek', 'Dolomites Summer Trekk')).toBeGreaterThan(90);
  });

  it('returns lower score for dissimilar strings', () => {
    expect(similarity('Alps Expedition', 'Sahara Desert Walk')).toBeLessThan(50);
  });
});
