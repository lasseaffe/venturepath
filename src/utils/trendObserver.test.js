import { describe, it, expect } from 'vitest';
import { scoreCities } from './trendObserver.js';

const CITIES = [
  { id: 'tokyo',  name: 'Tokyo',  tags: ['asia', 'urban', 'food'] },
  { id: 'paris',  name: 'Paris',  tags: ['europe', 'art', 'romance'] },
  { id: 'bali',   name: 'Bali',   tags: ['asia', 'beach', 'spiritual'] },
];

describe('scoreCities', () => {
  it('returns empty Map when trendTerms is empty', () => {
    const result = scoreCities(CITIES, []);
    expect(result.size).toBe(0);
  });

  it('scores a city when its name is a substring of a trend term', () => {
    // "Tokyo" substring of "Tokyo weekend travel"
    const result = scoreCities(CITIES, ['Tokyo weekend travel']);
    expect(result.has('tokyo')).toBe(true);
    expect(result.get('tokyo').score).toBe(20); // position 0 → weight 20
    expect(result.get('tokyo').label).toBe('Tokyo weekend travel');
  });

  it('scores a city when a trend term is a substring of the city name', () => {
    // "paris" substring of "Paris"
    const result = scoreCities(CITIES, ['paris art galleries']);
    expect(result.has('paris')).toBe(true);
    expect(result.get('paris').score).toBe(20);
  });

  it('matches on tags — tag is substring of trend term', () => {
    // "beach" is a tag of Bali; "beach holiday" contains "beach"
    const result = scoreCities(CITIES, ['beach holiday destinations']);
    expect(result.has('bali')).toBe(true);
    expect(result.get('bali').score).toBe(20);
  });

  it('applies correct weight for position — position 1 gets weight 19', () => {
    const result = scoreCities(CITIES, ['no match here', 'Tokyo deals']);
    expect(result.get('tokyo').score).toBe(19); // position 1 → weight 19
  });

  it('accumulates scores when multiple terms match the same city', () => {
    // position 0 → 20, position 2 → 18; total 38
    const result = scoreCities(CITIES, ['Tokyo travel', 'nothing', 'Tokyo cherry blossom']);
    expect(result.get('tokyo').score).toBe(38);
  });

  it('label is the term that produced the highest single-term score (first matched)', () => {
    // position 0 scores 20 (highest), position 2 scores 18
    const result = scoreCities(CITIES, ['Tokyo travel', 'nothing', 'Tokyo cherry blossom']);
    expect(result.get('tokyo').label).toBe('Tokyo travel');
  });

  it('does not score cities with no matching terms', () => {
    const result = scoreCities(CITIES, ['volcano eruption', 'stock market news']);
    expect(result.size).toBe(0);
  });

  it('minimum weight is 1 for positions 20 and beyond', () => {
    // Build 25 terms, Tokyo only at position 24
    const terms = Array.from({ length: 24 }, (_, i) => `unrelated term ${i}`);
    terms.push('Tokyo adventure');
    const result = scoreCities(CITIES, terms);
    expect(result.get('tokyo').score).toBe(1); // Math.max(1, 20 - 24) = 1
  });

  it('returns empty Map when cities array is empty', () => {
    const result = scoreCities([], ['Tokyo travel']);
    expect(result.size).toBe(0);
  });
});
