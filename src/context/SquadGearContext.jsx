import { createContext, useContext, useReducer, useCallback } from 'react';

// ── Dummy squad members & shared gear ─────────────────────────────────────────

const SQUAD_MEMBERS = [
  { id: 'lead',  name: 'Lead',  avatar: '🧗', maxKg: 20 },
  { id: 'scout', name: 'Scout', avatar: '🗺', maxKg: 18 },
  { id: 'medic', name: 'Medic', avatar: '🩺', maxKg: 16 },
];

const SHARED_GEAR = [
  { id: 'sg1', label: '4-Season Tent', weight: 3.2, ownerId: 'lead',  critical: true },
  { id: 'sg2', label: 'Group Stove',   weight: 0.8, ownerId: 'scout', critical: true },
  { id: 'sg3', label: 'First Aid Kit', weight: 1.1, ownerId: 'medic', critical: true },
  { id: 'sg4', label: 'Water Filter',  weight: 0.4, ownerId: 'lead',  critical: true },
  { id: 'sg5', label: 'Sat Phone',     weight: 0.3, ownerId: 'scout', critical: true },
];

function memberWeight(gear, memberId) {
  return gear.filter(g => g.ownerId === memberId).reduce((s, g) => s + g.weight, 0);
}

function reducer(state, action) {
  switch (action.type) {
    case 'REASSIGN': {
      const gear = state.gear.map(g =>
        g.id === action.payload.gearId ? { ...g, ownerId: action.payload.toMember } : g
      );
      return { ...state, gear };
    }
    case 'RESET':
      return { ...state, gear: SHARED_GEAR };
    default:
      return state;
  }
}

const SquadGearContext = createContext(null);

export function SquadGearProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { members: SQUAD_MEMBERS, gear: SHARED_GEAR });

  const reassign = useCallback((gearId, toMember) =>
    dispatch({ type: 'REASSIGN', payload: { gearId, toMember } }), []);
  const resetGear = useCallback(() => dispatch({ type: 'RESET' }), []);

  const weights = Object.fromEntries(
    state.members.map(m => [m.id, memberWeight(state.gear, m.id)])
  );

  const overEncumbered = state.members.filter(m => weights[m.id] > m.maxKg);

  return (
    <SquadGearContext.Provider value={{ ...state, weights, overEncumbered, reassign, resetGear }}>
      {children}
    </SquadGearContext.Provider>
  );
}

export function useSquadGear() {
  const ctx = useContext(SquadGearContext);
  if (!ctx) throw new Error('useSquadGear must be used within SquadGearProvider');
  return ctx;
}
