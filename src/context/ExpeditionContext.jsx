import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'vp-expedition-store';
const STORE_VERSION = 2; // bump to invalidate stale localStorage

// ── Seed nomination pool items ─────────────────────────────────────────────────

const SEED_NOMINATIONS = [
  { id: 'n1', name: 'Miniatur Wunderland',  type: 'Activity',    thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop', votes: { lead: 'up', scout: null, medic: null }, status: 'nominated' },
  { id: 'n2', name: 'Speicherstadt Canal',  type: 'Viewpoint',   thumb: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=80&h=80&fit=crop', votes: { lead: null, scout: 'up', medic: null }, status: 'nominated' },
  { id: 'n3', name: 'Fischmarkt Hamburg',   type: 'Local Flavor', thumb: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop', votes: { lead: null, scout: null, medic: 'up' }, status: 'nominated' },
];

const SQUAD = ['lead', 'scout', 'medic'];
const MAJORITY = 1;

function calcStatus(votes) {
  const ups   = Object.values(votes).filter(v => v === 'up').length;
  const downs = Object.values(votes).filter(v => v === 'down').length;
  if (ups >= MAJORITY) return 'confirmed';
  if (downs > SQUAD.length / 2) return 'rejected';
  return 'nominated';
}

function reducer(state, action) {
  switch (action.type) {
    case 'NOMINATE': {
      const exists = state.pool.find(i => i.id === action.payload.id);
      if (exists) return state;
      return {
        ...state,
        pool: [...state.pool, {
          ...action.payload,
          votes: Object.fromEntries(SQUAD.map(m => [m, null])),
          status: 'nominated',
        }],
      };
    }
    case 'VOTE': {
      const pool = state.pool.map(item => {
        if (item.id !== action.payload.id) return item;
        const votes = { ...item.votes, [action.payload.member]: action.payload.direction };
        const status = calcStatus(votes);
        return { ...item, votes, status };
      });
      // Move confirmed items to active path
      const confirmed = pool.filter(i => i.status === 'confirmed' && !state.activePath.find(a => a.id === i.id));
      return {
        ...state,
        pool: pool.filter(i => i.status !== 'confirmed'),
        activePath: [...state.activePath, ...confirmed],
      };
    }
    case 'REMOVE_REJECTED': {
      return { ...state, pool: state.pool.filter(i => i.id !== action.payload) };
    }
    case 'MOVE_TO_PATH': {
      const item = state.pool.find(i => i.id === action.payload);
      if (!item) return state;
      return {
        ...state,
        pool: state.pool.filter(i => i.id !== action.payload),
        activePath: [...state.activePath, { ...item, status: 'confirmed' }],
      };
    }
    case 'REMOVE_FROM_PATH': {
      return { ...state, activePath: state.activePath.filter(i => i.id !== action.payload) };
    }
    case 'RESET':
      return { pool: SEED_NOMINATIONS, activePath: [] };
    default:
      return state;
  }
}

const ExpeditionContext = createContext(null);

const DEFAULT_EXPEDITION_STATE = { pool: SEED_NOMINATIONS, activePath: [] };

function loadExpeditionState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXPEDITION_STATE;
    const parsed = JSON.parse(raw);
    // Discard stale state from older store versions
    if (parsed._v !== STORE_VERSION) return DEFAULT_EXPEDITION_STATE;
    return { ...DEFAULT_EXPEDITION_STATE, ...parsed };
  } catch {
    return DEFAULT_EXPEDITION_STATE;
  }
}

export function ExpeditionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadExpeditionState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _v: STORE_VERSION }));
    } catch { /* storage full or unavailable */ }
  }, [state]);

  const nominate = useCallback((item) => dispatch({ type: 'NOMINATE', payload: item }), []);
  const vote = useCallback((id, member, direction) =>
    dispatch({ type: 'VOTE', payload: { id, member, direction } }), []);
  const removeRejected = useCallback((id) => dispatch({ type: 'REMOVE_REJECTED', payload: id }), []);
  const moveToPath = useCallback((id) => dispatch({ type: 'MOVE_TO_PATH', payload: id }), []);
  const removeFromPath = useCallback((id) => dispatch({ type: 'REMOVE_FROM_PATH', payload: id }), []);
  const resetLedger = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <ExpeditionContext.Provider value={{ ...state, nominate, vote, removeRejected, moveToPath, removeFromPath, resetLedger, SQUAD }}>
      {children}
    </ExpeditionContext.Provider>
  );
}

export function useExpedition() {
  const ctx = useContext(ExpeditionContext);
  if (!ctx) throw new Error('useExpedition must be used within ExpeditionProvider');
  return ctx;
}
