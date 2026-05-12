import { createContext, useContext, useReducer, useEffect } from 'react';

const STORAGE_KEY = 'vp-trip-store';

// ── Default trip data ──────────────────────────────────────────────────────────

const DEFAULT_TRIP = {
  name: 'Operation Patagonia',
  destination: 'Torres del Paine, Chile',
  startDate: '2026-11-10',
  endDate: '2026-11-28',
  days: 18,
  climate: 'temperate',
  status: 'PLANNING',
};

const DEFAULT_LEGS = [
  { id: 1, from: 'Home Base',        to: 'Gateway City',     mode: 'flight', durationH: 11, distanceKm: 8400, status: 'confirmed' },
  { id: 2, from: 'Gateway City',     to: 'Trailhead Camp',   mode: 'bus',    durationH: 6,  distanceKm: 320,  status: 'confirmed' },
  { id: 3, from: 'Trailhead Camp',   to: 'Summit Approach',  mode: 'foot',   durationH: 8,  distanceKm: 22,   status: 'pending'   },
  { id: 4, from: 'Summit Approach',  to: 'Base Camp Alpha',  mode: 'foot',   durationH: 5,  distanceKm: 12,   status: 'pending'   },
  { id: 5, from: 'Base Camp Alpha',  to: 'Home Base',        mode: 'flight', durationH: 13, distanceKm: 9100, status: 'pending'   },
];

const DEFAULT_OBJECTIVES = [
  { legId: 1, items: ['Collect permits', 'Final gear check', 'Weather briefing'] },
  { legId: 2, items: ['Reach Refugio Chileno', 'Acclimatize', 'Scout Mirador Las Torres'] },
  { legId: 3, items: ['Summit bid on weather window', 'Photography op at golden hour'] },
];

const DEFAULT_MANIFEST_SETTINGS = { climate: 'temperate', days: 18, hasChildren: false };

// ── Reducer ───────────────────────────────────────────────────────────────────

const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER', // 'LEADER' | 'MEMBER'
  cloning: false,
  stays: [],   // { id, name, coords, checkin, checkout, price, currency }
  pois: [],    // { id, name, coords, category, priority }
  alerts: [],  // { id, type, severity, coords, message }
  budget: { total: 0, items: [] }, // items: { id, label, amount, currency, legId? }
};

let nextLegId = 100; // start above seeded leg IDs so there's no collision

function reducer(state, action) {
  switch (action.type) {
    case 'CREATE_TRIP': {
      const t = action.payload;
      const days = t.startDate && t.endDate
        ? Math.round((new Date(t.endDate) - new Date(t.startDate)) / 86_400_000)
        : 0;
      return {
        ...initialState,
        trip: { name: t.name, destination: t.destination, startDate: t.startDate, endDate: t.endDate, days, climate: t.climate ?? 'temperate', status: 'PLANNING' },
        legs: [],
        objectives: [],
        manifestSettings: { climate: t.climate ?? 'temperate', days, hasChildren: false },
      };
    }
    case 'UPDATE_TRIP':
      return { ...state, trip: { ...state.trip, ...action.payload } };
    case 'ADD_LEG': {
      const leg = { ...action.payload, id: nextLegId++, status: 'pending' };
      return { ...state, legs: [...state.legs, leg] };
    }
    case 'UPDATE_LEG': {
      const legs = state.legs.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l);
      return { ...state, legs };
    }
    case 'REMOVE_LEG': {
      const legs = state.legs.filter(l => l.id !== action.payload);
      return { ...state, legs };
    }
    case 'CLONE_PATH': {
      const t = action.payload;
      return {
        ...state,
        cloning: true,
        trip: { ...DEFAULT_TRIP, ...t.destinationMetadata },
        legs: t.legs ?? DEFAULT_LEGS,
        objectives: t.objectives ?? DEFAULT_OBJECTIVES,
        manifestSettings: t.manifestSettings ?? DEFAULT_MANIFEST_SETTINGS,
      };
    }
    case 'CLONE_COMPLETE':
      return { ...state, cloning: false };
    case 'LOAD_EXPEDITION': {
      const e = action.payload;
      const maxId = (e.legs ?? []).reduce((m, l) => Math.max(m, l.id ?? 0), 99);
      if (maxId >= nextLegId) nextLegId = maxId + 1;
      return {
        ...initialState,
        trip: e.trip ?? initialState.trip,
        legs: e.legs ?? [],
        objectives: e.objectives ?? [],
        manifestSettings: e.manifestSettings ?? initialState.manifestSettings,
      };
    }
    case 'RESET_TRIP':
      return { ...initialState };
    case 'SET_ROLE':
      return { ...state, userRole: action.payload };
    case 'UPDATE_LEG_STATUS': {
      const legs = state.legs.map(l =>
        l.id === action.payload.id ? { ...l, status: action.payload.status } : l
      );
      return { ...state, legs };
    }
    case 'REPLACE_LEGS':
      return { ...state, legs: action.payload };
    case 'ADD_STAY': {
      const stay = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
      return { ...state, stays: [...state.stays, stay] };
    }
    case 'REMOVE_STAY':
      return { ...state, stays: state.stays.filter(s => s.id !== action.payload) };
    case 'ADD_POI': {
      const poi = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
      return { ...state, pois: [...state.pois, poi] };
    }
    case 'REMOVE_POI':
      return { ...state, pois: state.pois.filter(p => p.id !== action.payload) };
    case 'ADD_ALERT': {
      const alert = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
      return { ...state, alerts: [...state.alerts, alert] };
    }
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };
    case 'ADD_BUDGET_ITEM': {
      const item = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
      const newTotal = state.budget.total + (item.amount ?? 0);
      return { ...state, budget: { total: newTotal, items: [...state.budget.items, item] } };
    }
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const TripStoreContext = createContext(null);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    // nextLegId must stay above any saved leg ids to avoid collisions
    const maxId = (saved.legs ?? []).reduce((m, l) => Math.max(m, l.id ?? 0), 99);
    if (maxId >= nextLegId) nextLegId = maxId + 1;
    return { ...initialState, ...saved };
  } catch {
    return initialState;
  }
}

export function TripStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        trip: state.trip,
        legs: state.legs,
        objectives: state.objectives,
        manifestSettings: state.manifestSettings,
        userRole: state.userRole,
        stays: state.stays,
        pois: state.pois,
        alerts: state.alerts,
        budget: state.budget,
      }));
    } catch { /* storage full or unavailable */ }
  }, [state]);

  const clonePath = (templateData) => {
    dispatch({ type: 'CLONE_PATH', payload: templateData });
    setTimeout(() => dispatch({ type: 'CLONE_COMPLETE' }), 3500);
  };

  const loadExpedition = (snapshot) => dispatch({ type: 'LOAD_EXPEDITION', payload: snapshot });
  const createTrip = (data) => dispatch({ type: 'CREATE_TRIP', payload: data });
  const updateTrip = (data) => dispatch({ type: 'UPDATE_TRIP', payload: data });
  const addLeg = (data) => dispatch({ type: 'ADD_LEG', payload: data });
  const updateLeg = (data) => dispatch({ type: 'UPDATE_LEG', payload: data });
  const removeLeg = (id) => dispatch({ type: 'REMOVE_LEG', payload: id });
  const resetTrip = () => dispatch({ type: 'RESET_TRIP' });
  const setRole = (role) => dispatch({ type: 'SET_ROLE', payload: role });
  const updateLegStatus = (id, status) =>
    dispatch({ type: 'UPDATE_LEG_STATUS', payload: { id, status } });
  const replaceLegs = (legs) => dispatch({ type: 'REPLACE_LEGS', payload: legs });

  const addStay = (data) => dispatch({ type: 'ADD_STAY', payload: data });
  const removeStay = (id) => dispatch({ type: 'REMOVE_STAY', payload: id });
  const addPoi = (data) => dispatch({ type: 'ADD_POI', payload: data });
  const removePoi = (id) => dispatch({ type: 'REMOVE_POI', payload: id });
  const addAlert = (data) => dispatch({ type: 'ADD_ALERT', payload: data });
  const clearAlerts = () => dispatch({ type: 'CLEAR_ALERTS' });
  const addBudgetItem = (data) => dispatch({ type: 'ADD_BUDGET_ITEM', payload: data });

  return (
    <TripStoreContext.Provider value={{ ...state, clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg, resetTrip, setRole, updateLegStatus, loadExpedition, replaceLegs, addStay, removeStay, addPoi, removePoi, addAlert, clearAlerts, addBudgetItem }}>
      {children}
    </TripStoreContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripStoreContext);
  if (!ctx) throw new Error('useTripStore must be used within TripStoreProvider');
  return ctx;
}
