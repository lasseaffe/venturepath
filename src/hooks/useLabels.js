import { useTheme } from '../context/ThemeContext';

const LABELS = {
  default: {
    trip:          'Trip',
    group:         'Travel party',
    profile:       'Profile',
    saved:         'Saved trips',
    expedition:    'Adventure',
    enter:         'Start Planning',
    activeMission: 'Your trip',
    vault:         'Saved trips',
    pioneer:       'Traveler',
    live:          null,
    tactical:      null,
    addLeg:        'Add stop',
    confirmed:     'Confirmed',
    pending:       'Pending',
  },
  tactical: {
    trip:          'Mission',
    group:         'Squad',
    profile:       'Architect',
    saved:         'Vault',
    expedition:    'Expedition',
    enter:         'Enter Expedition →',
    activeMission: 'Active Mission',
    vault:         'Vault',
    pioneer:       'Pioneer',
    live:          'LIVE',
    tactical:      'TACTICAL',
    addLeg:        'Add Leg',
    confirmed:     'CONFIRMED',
    pending:       'PENDING',
  },
};

export function useLabels() {
  const { theme } = useTheme();
  return LABELS[theme] ?? LABELS.default;
}
