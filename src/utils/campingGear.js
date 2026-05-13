// Returns array of { id, name, category, reason } gear driven by campMeta
export function deriveCampingGear(stays = []) {
  const gear = [];
  const seen = new Set();

  function add(id, name, category, reason) {
    if (!seen.has(id)) { seen.add(id); gear.push({ id, name, category, reason }); }
  }

  const campStays = stays.filter(s => ['camp', 'wild', 'shelter'].includes(s.kind));
  if (campStays.length === 0) return [];

  add('tent', 'Tent / shelter', 'Gear', 'camping night');

  campStays.forEach(stay => {
    const meta = stay.campMeta ?? {};
    if (meta.bearCountry) {
      add('bear-canister', 'Bear canister', 'Gear', 'bear country at ' + stay.name);
    }
    if (meta.fireRules?.permitted === false) {
      add('camp-stove', 'Camp stove + fuel', 'Gear', 'fire ban at ' + stay.name);
    }
    if (meta.waterSource?.treatRequired) {
      add('water-filter', 'Water filter / purification tabs', 'Gear', 'water treatment at ' + stay.name);
    }
    if (meta.sanitation === 'pack-out') {
      add('waste-bags', 'Waste bags (LNT)', 'Gear', 'pack-out sanitation at ' + stay.name);
    }
    if (meta.siteType === 'hammock') {
      add('hammock', 'Hammock + straps', 'Gear', 'hammock site at ' + stay.name);
    }
  });

  return gear;
}
