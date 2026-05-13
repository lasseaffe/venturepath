// pipeline/lib/mapCategory.js
// Maps GPX <sym> or <type> values to the VP waypointCategories.js taxonomy.
// Only existing taxonomy keys are emitted; unknown values return null
// (waypoint stores `null` in the category column).
// Spec 5 may extend WAYPOINT_CATEGORIES later (e.g. trailhead, summit, town);
// when that happens, add the new mappings here.

const SYM_MAP = {
  water:           'water',
  'drinking water':'water',
  spring:          'water',
  viewpoint:       'view',
  'scenic view':   'view',
  vista:           'view',
  permit:          'permit',
  'permit office': 'permit',
  transfer:        'transfer',
  resupply:        'resupply',
  shop:            'shop',
  food:            'food',
  fuel:            'fuel',
  border:          'border',
  toilet:          'toilet',
};

export function mapCategory(sym) {
  if (!sym) return null;
  return SYM_MAP[sym.toLowerCase().trim()] ?? null;
}
