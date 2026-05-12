// Phase 1 categories. Phases 2+ add: transfer, resupply, camp, permit.
// Colors must match VP-5 brand tokens — never use raw Tailwind defaults.
export const WAYPOINT_CATEGORIES = {
  fuel:      { color: '#E67E22', icon: '⛽', label: 'Fuel' },
  charge:    { color: '#E67E22', icon: '🔌', label: 'Charge' },
  rest:      { color: '#D9C5B2', icon: '🅿',  label: 'Rest area' },
  food:      { color: '#D9C5B2', icon: '🍽',  label: 'Food' },
  view:      { color: '#F2C94C', icon: '📷', label: 'Viewpoint' },
  toll:      { color: '#F2A900', icon: '💶', label: 'Toll' },
  border:    { color: '#F2A900', icon: '🛂', label: 'Border' },
  hazard:    { color: '#dc2626', icon: '⚠',  label: 'Hazard' },
  emergency: { color: '#dc2626', icon: '🆘', label: 'Emergency' },
};

const FALLBACK = { color: '#D9C5B2', icon: '•', label: 'Waypoint' };

export function getCategoryStyle(category) {
  return WAYPOINT_CATEGORIES[category] ?? FALLBACK;
}
