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
  planningMode: 'semi',
};

const DEFAULT_LEGS = [
  { id: 1, from: 'Home Base',        to: 'Gateway City',     mode: 'flight', durationH: 11, distanceKm: 8400, status: 'confirmed', waypoints: [] },
  { id: 2, from: 'Gateway City',     to: 'Trailhead Camp',   mode: 'bus',    durationH: 6,  distanceKm: 320,  status: 'confirmed', waypoints: [] },
  { id: 3, from: 'Trailhead Camp',   to: 'Summit Approach',  mode: 'foot',   durationH: 8,  distanceKm: 22,   status: 'pending',   waypoints: [] },
  { id: 4, from: 'Summit Approach',  to: 'Base Camp Alpha',  mode: 'foot',   durationH: 5,  distanceKm: 12,   status: 'pending',   waypoints: [] },
  { id: 5, from: 'Base Camp Alpha',  to: 'Home Base',        mode: 'flight', durationH: 13, distanceKm: 9100, status: 'pending',   waypoints: [] },
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
  stays: [],     // { id, name, coords, checkin, checkout, price, currency }
  pois: [],      // { id, name, coords, category, priority }
  alerts: [],    // { id, type, severity, coords, message }
  budget: { total: 0, items: [] }, // items: { id, label, amount, currency, legId? }
  dayLoops: [],  // { id, date, homebaseStayId, stopIds, autoLegIds, label, planningMode }
  heroImagePositions: {},  // { [imageUrl]: { x: number, y: number } }
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
        trip: { name: t.name, destination: t.destination, startDate: t.startDate, endDate: t.endDate, days, climate: t.climate ?? 'temperate', status: 'PLANNING', planningMode: t.planningMode ?? 'semi' },
        legs: [],
        objectives: [],
        manifestSettings: { climate: t.climate ?? 'temperate', days, hasChildren: false },
      };
    }
    case 'UPDATE_TRIP':
      return { ...state, trip: { ...state.trip, ...action.payload } };
    case 'ADD_LEG': {
      const leg = {
        ...action.payload,
        id: action.payload.id ?? nextLegId++,
        status: action.payload.status ?? 'pending',
        waypoints: action.payload.waypoints ?? [],
      };
      return { ...state, legs: [...state.legs, leg] };
    }
    case 'UPDATE_LEG': {
      const legs = state.legs.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l);
      // Climate cascade: if any leg carries a climate field, derive dominant climate for PackingEngine
      const climates = legs.map(l => l.climate).filter(Boolean);
      const dominant = climates.length > 0
        ? climates.sort((a, b) => climates.filter(c => c === b).length - climates.filter(c => c === a).length)[0]
        : state.manifestSettings.climate;
      const manifestSettings = climates.length > 0
        ? { ...state.manifestSettings, climate: dominant }
        : state.manifestSettings;
      return { ...state, legs, manifestSettings };
    }
    case 'REMOVE_LEG': {
      const legs = state.legs.filter(l => l.id !== action.payload);
      return { ...state, legs };
    }
    case 'ADD_WAYPOINT': {
      const { legId, waypoint } = action.payload;
      const wp = {
        ...waypoint,
        id: waypoint.id ?? crypto.randomUUID(),
        legId,
        status: waypoint.status ?? 'planned',
        source: waypoint.source ?? 'user',
      };
      const legs = state.legs.map(l =>
        l.id === legId
          ? { ...l, waypoints: [...(l.waypoints ?? []), wp] }
          : l
      );
      return { ...state, legs };
    }
    case 'UPDATE_WAYPOINT': {
      const { legId, waypointId, patch } = action.payload;
      const legs = state.legs.map(l =>
        l.id !== legId ? l : {
          ...l,
          waypoints: (l.waypoints ?? []).map(w =>
            w.id === waypointId ? { ...w, ...patch } : w
          ),
        }
      );

      // Auto-create budget line item when a waypoint is confirmed with a cost
      const updatedWp = legs
        .find(l => l.id === legId)
        ?.waypoints?.find(w => w.id === waypointId);
      const shouldAddBudget =
        patch.status === 'confirmed' &&
        updatedWp?.estCost > 0 &&
        !state.budget.items.some(i => i.id === waypointId);

      if (shouldAddBudget) {
        const newItem = {
          id: waypointId,
          label: updatedWp.name,
          amount: updatedWp.estCost,
          currency: 'EUR',
          legId,
          category: updatedWp.category,
        };
        const items = [...state.budget.items, newItem];
        const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);
        return { ...state, legs, budget: { total, items } };
      }

      return { ...state, legs };
    }
    case 'REMOVE_WAYPOINT': {
      const { legId, waypointId } = action.payload;
      const legs = state.legs.map(l =>
        l.id !== legId ? l : { ...l, waypoints: (l.waypoints ?? []).filter(w => w.id !== waypointId) }
      );
      return { ...state, legs };
    }
    case 'SET_LEG_META': {
      const { legId, legMeta } = action.payload;
      const legs = state.legs.map(l =>
        l.id === legId ? { ...l, legMeta } : l
      );
      return { ...state, legs };
    }
    case 'REPLACE_LEG_ROUTE': {
      const { legId, route } = action.payload;
      const legs = state.legs.map(l => {
        if (l.id !== legId) return l;
        return {
          ...l,
          coords: route.polyline ?? l.coords,
          durationH: route.durationH ?? l.durationH,
          distanceKm: route.distanceKm ?? l.distanceKm,
          waypoints: (route.waypoints ?? []).map(w => ({
            ...w,
            id: w.id ?? crypto.randomUUID(),
            legId,
            status: w.status ?? 'planned',
            source: w.source ?? 'auto',
          })),
        };
      });
      return { ...state, legs };
    }
    case 'CLONE_PATH': {
      const t = action.payload;
      return {
        ...state,
        dayLoops: [],   // cloned expedition starts with no day loops
        cloning: true,
        trip: { ...DEFAULT_TRIP, ...t.destinationMetadata },
        legs: t.legs ?? DEFAULT_LEGS,
        objectives: t.objectives ?? DEFAULT_OBJECTIVES,
        manifestSettings: t.manifest_settings ?? t.manifestSettings ?? DEFAULT_MANIFEST_SETTINGS,
        budget: t.budget ?? initialState.budget,
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
        legs: (e.legs ?? []).map(l => ({ ...l, waypoints: l.waypoints ?? [] })),
        objectives: e.objectives ?? [],
        manifestSettings: e.manifestSettings ?? initialState.manifestSettings,
        stays: e.stays ?? initialState.stays,
        pois: e.pois ?? initialState.pois,
        alerts: e.alerts ?? initialState.alerts,
        budget: e.budget ?? initialState.budget,
        dayLoops: e.dayLoops ?? [],
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
      const items = [...state.budget.items, item];
      const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);
      return { ...state, budget: { total, items } };
    }
    case 'ADD_DAY_LOOP': {
      const loop = {
        stopIds: [],
        autoLegIds: [],
        label: null,
        planningMode: state.trip.planningMode,
        ...action.payload,
        id: action.payload.id ?? crypto.randomUUID(),
      };
      return { ...state, dayLoops: [...state.dayLoops, loop] };
    }
    case 'ADD_STOP_TO_DAY_LOOP': {
      const { dayLoopId, stop } = action.payload;
      const poi = { ...stop, id: stop.id ?? crypto.randomUUID() };
      const dayLoops = state.dayLoops.map(dl =>
        dl.id === dayLoopId
          ? { ...dl, stopIds: [...dl.stopIds, poi.id] }
          : dl
      );
      const pois = state.pois.find(p => p.id === poi.id)
        ? state.pois
        : [...state.pois, poi];
      return { ...state, dayLoops, pois };
    }
    case 'REMOVE_STOP_FROM_DAY_LOOP': {
      // Note: intentionally leaves the POI in state.pois — it may be referenced
      // by other dayLoops or placed independently via addPoi().
      const { dayLoopId, stopId } = action.payload;
      const dayLoops = state.dayLoops.map(dl =>
        dl.id === dayLoopId
          ? { ...dl, stopIds: dl.stopIds.filter(id => id !== stopId) }
          : dl
      );
      return { ...state, dayLoops };
    }
    case 'SET_AUTO_LEGS': {
      const { dayLoopId, legs } = action.payload;
      const oldAutoIds = state.dayLoops.find(dl => dl.id === dayLoopId)?.autoLegIds ?? [];
      const filteredLegs = state.legs.filter(l => !oldAutoIds.includes(l.id));
      const newLegs = [...filteredLegs, ...legs];
      const dayLoops = state.dayLoops.map(dl =>
        dl.id === dayLoopId
          ? { ...dl, autoLegIds: legs.map(l => l.id) }
          : dl
      );
      return { ...state, legs: newLegs, dayLoops };
    }
    case 'SET_DAY_LOOP_MODE': {
      const { dayLoopId, mode } = action.payload;
      const dayLoops = state.dayLoops.map(dl =>
        dl.id === dayLoopId ? { ...dl, planningMode: mode } : dl
      );
      return { ...state, dayLoops };
    }
    case 'REMOVE_DAY_LOOP': {
      const loop = state.dayLoops.find(dl => dl.id === action.payload);
      const autoIds = loop?.autoLegIds ?? [];
      return {
        ...state,
        dayLoops: state.dayLoops.filter(dl => dl.id !== action.payload),
        legs: state.legs.filter(l => !autoIds.includes(l.id)),
      };
    }
    case 'SET_TRIP_PLANNING_MODE':
      return { ...state, trip: { ...state.trip, planningMode: action.payload } };
    case 'SET_HERO_IMAGE_POSITION': {
      const { url, x, y } = action.payload;
      return { ...state, heroImagePositions: { ...state.heroImagePositions, [url]: { x, y } } };
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
    const merged = { ...initialState, ...saved };
    merged.legs = (merged.legs ?? []).map(l => ({ ...l, waypoints: l.waypoints ?? [] }));
    return merged;
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
        dayLoops: state.dayLoops,
        heroImagePositions: state.heroImagePositions,
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
  const addWaypoint = (legId, waypoint) =>
    dispatch({ type: 'ADD_WAYPOINT', payload: { legId, waypoint } });
  const updateWaypoint = (legId, waypointId, patch) =>
    dispatch({ type: 'UPDATE_WAYPOINT', payload: { legId, waypointId, patch } });
  const removeWaypoint = (legId, waypointId) =>
    dispatch({ type: 'REMOVE_WAYPOINT', payload: { legId, waypointId } });
  const setLegMeta = (legId, legMeta) =>
    dispatch({ type: 'SET_LEG_META', payload: { legId, legMeta } });
  const replaceLegRoute = (legId, route) =>
    dispatch({ type: 'REPLACE_LEG_ROUTE', payload: { legId, route } });
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

  const addDayLoop = (data) => dispatch({ type: 'ADD_DAY_LOOP', payload: data });
  const addStopToDayLoop = (dayLoopId, stop) =>
    dispatch({ type: 'ADD_STOP_TO_DAY_LOOP', payload: { dayLoopId, stop } });
  const removeStopFromDayLoop = (dayLoopId, stopId) =>
    dispatch({ type: 'REMOVE_STOP_FROM_DAY_LOOP', payload: { dayLoopId, stopId } });
  const setAutoLegs = (dayLoopId, legs) =>
    dispatch({ type: 'SET_AUTO_LEGS', payload: { dayLoopId, legs } });
  const setDayLoopMode = (dayLoopId, mode) =>
    dispatch({ type: 'SET_DAY_LOOP_MODE', payload: { dayLoopId, mode } });
  const removeDayLoop = (id) => dispatch({ type: 'REMOVE_DAY_LOOP', payload: id });
  const setTripPlanningMode = (mode) =>
    dispatch({ type: 'SET_TRIP_PLANNING_MODE', payload: mode });

  const setHeroImagePosition = (url, x, y) =>
    dispatch({ type: 'SET_HERO_IMAGE_POSITION', payload: { url, x, y } });

  return (
    <TripStoreContext.Provider value={{
      ...state,
      dispatch,    // expose raw dispatch for onStopAdded()
      clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg, addWaypoint, updateWaypoint, removeWaypoint, setLegMeta, replaceLegRoute, resetTrip,
      setRole, updateLegStatus, loadExpedition, replaceLegs, addStay, removeStay,
      addPoi, removePoi, addAlert, clearAlerts, addBudgetItem,
      addDayLoop, addStopToDayLoop, removeStopFromDayLoop, setAutoLegs,
      setDayLoopMode, removeDayLoop, setTripPlanningMode, setHeroImagePosition,
    }}>
      {children}
    </TripStoreContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripStoreContext);
  if (!ctx) throw new Error('useTripStore must be used within TripStoreProvider');
  return ctx;
}
