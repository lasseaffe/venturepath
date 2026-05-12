import { WAYPOINT_CATEGORIES, getCategoryStyle } from '../waypointCategories';

describe('waypointCategories', () => {
  it('exposes every Phase 1 category', () => {
    ['fuel', 'charge', 'rest', 'food', 'view', 'toll', 'border', 'hazard', 'emergency']
      .forEach(c => expect(WAYPOINT_CATEGORIES).toHaveProperty(c));
  });

  it('returns a brand-token color for fuel', () => {
    expect(getCategoryStyle('fuel').color).toBe('#E67E22');
  });

  it('returns tactical amber for toll', () => {
    expect(getCategoryStyle('toll').color).toBe('#F2A900');
  });

  it('falls back to a neutral style for unknown categories', () => {
    const s = getCategoryStyle('unknown-thing');
    expect(s).toBeTruthy();
    expect(typeof s.color).toBe('string');
  });
});
