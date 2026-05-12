import { deriveCampingGear } from '../campingGear';

describe('deriveCampingGear', () => {
  it('returns empty array for no camp stays', () => {
    expect(deriveCampingGear([{ kind: 'hotel', name: 'Hilton' }])).toHaveLength(0);
  });

  it('returns empty array for empty stays', () => {
    expect(deriveCampingGear([])).toHaveLength(0);
  });

  it('returns tent for any camp stay', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Site A', campMeta: {} }]);
    expect(gear.some(g => g.id === 'tent')).toBe(true);
  });

  it('adds bear canister when bearCountry is true', () => {
    const gear = deriveCampingGear([{ kind: 'wild', name: 'Wild', campMeta: { bearCountry: true } }]);
    expect(gear.some(g => g.id === 'bear-canister')).toBe(true);
  });

  it('adds camp stove when fire is banned', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Camp', campMeta: { fireRules: { permitted: false } } }]);
    expect(gear.some(g => g.id === 'camp-stove')).toBe(true);
  });

  it('adds water filter when treat required', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Camp', campMeta: { waterSource: { treatRequired: true } } }]);
    expect(gear.some(g => g.id === 'water-filter')).toBe(true);
  });

  it('deduplicates bear canister across multiple stays', () => {
    const stays = [
      { kind: 'camp', name: 'A', campMeta: { bearCountry: true } },
      { kind: 'wild', name: 'B', campMeta: { bearCountry: true } },
    ];
    const gear = deriveCampingGear(stays);
    expect(gear.filter(g => g.id === 'bear-canister')).toHaveLength(1);
  });
});
