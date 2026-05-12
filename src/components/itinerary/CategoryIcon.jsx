// src/components/itinerary/CategoryIcon.jsx
const ICONS = {
  transport: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" />
      <line x1="2" y1="7" x2="12" y2="7" />
      <polyline points="9,4 12,7 9,10" />
    </svg>
  ),
  logistics: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4" height="4" />
      <rect x="8" y="2" width="4" height="4" />
      <rect x="2" y="8" width="4" height="4" />
      <rect x="8" y="8" width="4" height="4" />
    </svg>
  ),
  food: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="2" x2="5" y2="12" />
      <path d="M3,2 C3,2 3,6 5,6" />
      <line x1="9" y1="2" x2="9" y2="5" />
      <path d="M9,5 Q12,5 12,8 L12,12" />
      <line x1="9" y1="8" x2="12" y2="8" />
    </svg>
  ),
  activity: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7,1 13,7 7,13 1,7" />
      <circle cx="7" cy="7" r="1.5" />
      <line x1="7" y1="4" x2="7" y2="5.5" />
      <line x1="7" y1="8.5" x2="7" y2="10" />
      <line x1="4" y1="7" x2="5.5" y2="7" />
      <line x1="8.5" y1="7" x2="10" y2="7" />
    </svg>
  ),
  rest: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="10" x2="12" y2="10" />
      <path d="M4,10 Q4,5 7,4 Q10,5 10,10" />
    </svg>
  ),
  accommodation: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,7 7,2 13,7" />
      <rect x="3" y="7" width="8" height="5" />
      <rect x="5.5" y="9" width="3" height="3" />
    </svg>
  ),
};

export default function CategoryIcon({ category, color = '#94A3B8', size = 14 }) {
  const Icon = ICONS[category] ?? ICONS.activity;
  return <Icon color={color} size={size} />;
}
