import { describe, it, expect } from 'vitest';
import { buildSlideDeck } from './slideDeck';

const makePhoto = (id, timestamp, coords = [48.86, 2.35]) => ({
  id, url: `https://example.com/${id}.jpg`, timestamp, coords,
});

const makeBreadcrumb = (timestamp, lat, lng) => ({ timestamp, lat, lng });

describe('buildSlideDeck', () => {
  it('returns empty array for no photos', () => {
    expect(buildSlideDeck([], [], [])).toEqual([]);
  });

  it('wraps each photo in a photo slide', () => {
    const photos = [makePhoto('p1', '2026-01-01T10:00:00Z')];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides[0]).toMatchObject({ type: 'photo', photo: photos[0] });
  });

  it('inserts a fact slide after every 5 photo slides', () => {
    const photos = Array.from({ length: 6 }, (_, i) =>
      makePhoto(`p${i}`, `2026-01-01T10:0${i}:00Z`)
    );
    const slides = buildSlideDeck(photos, [], []);
    const factSlides = slides.filter(s => s.type === 'fact');
    expect(factSlides).toHaveLength(1);
    // fact slide is at index 5 (after 5 photo slides)
    expect(slides[5].type).toBe('fact');
  });

  it('inserts a breadcrumb slide when photo gap exceeds 120 minutes', () => {
    const photos = [
      makePhoto('p1', '2026-01-01T08:00:00Z'),
      makePhoto('p2', '2026-01-01T11:00:00Z'), // 3hr gap
    ];
    const breadcrumbs = [
      makeBreadcrumb('2026-01-01T09:00:00Z', 48.87, 2.36),
    ];
    const slides = buildSlideDeck(photos, breadcrumbs, []);
    const breadcrumbSlides = slides.filter(s => s.type === 'breadcrumb');
    expect(breadcrumbSlides).toHaveLength(1);
    expect(breadcrumbSlides[0].gap_minutes).toBeGreaterThan(120);
  });

  it('does NOT insert breadcrumb slide when gap is under 120 minutes', () => {
    const photos = [
      makePhoto('p1', '2026-01-01T10:00:00Z'),
      makePhoto('p2', '2026-01-01T11:00:00Z'), // 60min gap
    ];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides.filter(s => s.type === 'breadcrumb')).toHaveLength(0);
  });

  it('sorts photos by timestamp before building', () => {
    const photos = [
      makePhoto('p2', '2026-01-01T11:00:00Z'),
      makePhoto('p1', '2026-01-01T10:00:00Z'),
    ];
    const slides = buildSlideDeck(photos, [], []);
    const photoSlides = slides.filter(s => s.type === 'photo');
    expect(photoSlides[0].photo.id).toBe('p1');
    expect(photoSlides[1].photo.id).toBe('p2');
  });

  it('each photo slide has a bearing field', () => {
    const photos = [makePhoto('p1', '2026-01-01T10:00:00Z')];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides[0]).toHaveProperty('bearing');
    expect(typeof slides[0].bearing).toBe('number');
  });
});
