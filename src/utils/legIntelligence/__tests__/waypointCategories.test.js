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

  it('returns Spruce color for water category', () => {
    expect(getCategoryStyle('water').color).toBe('#3A6B5C');
  });

  it('returns Sandstone color for resupply category', () => {
    expect(getCategoryStyle('resupply').color).toBe('#D9C5B2');
  });

  it('returns Golden Hour color for permit category', () => {
    expect(getCategoryStyle('permit').color).toBe('#F2C94C');
  });

  it('returns Sandstone color for transfer category', () => {
    expect(getCategoryStyle('transfer').color).toBe('#D9C5B2');
  });

  it('returns Sandstone color for layover category', () => {
    expect(getCategoryStyle('layover').color).toBe('#D9C5B2');
  });
  it('returns Ember color for platform category', () => {
    expect(getCategoryStyle('platform').color).toBe('#E67E22');
  });
});
