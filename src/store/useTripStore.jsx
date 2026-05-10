import { createContext, useContext, useReducer, useEffect } from 'react';
import sentinelBus from '../utils/sentinelBus.js';

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
  journey: null,
  architect: {
    insights: [],
    lastGeneratedAt: null,
  },
  vault: { documents: [] },
  booking: { whatIfScenarios: [] },
  journeyData: { breadcrumbs: [], gpxImported: false, photos: [] },
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
    case 'ADD_PHOTO': {
      const legs = state.legs.map(l =>
        l.id === action.payload.legId
          ? { ...l, photos: [...(l.photos ?? []), action.payload.photo] }
          : l
      );
      return { ...state, legs };
    }
    case 'REMOVE_PHOTO': {
      const legs = state.legs.map(l =>
        l.id === action.payload.legId
          ? { ...l, photos: (l.photos ?? []).filter(p => p.id !== action.payload.photoId) }
          : l
      );
      return { ...state, legs };
    }
    case 'UPDATE_PHOTO': {
      const legs = state.legs.map(l =>
        l.id === action.payload.legId
          ? {
              ...l,
              photos: (l.photos ?? []).map(p =>
                p.id === action.payload.photoId ? { ...p, ...action.payload.changes } : p
              ),
            }
          : l
      );
      return { ...state, legs };
    }
    case 'REORDER_PHOTOS': {
      const legs = state.legs.map(l => {
        if (l.id !== action.payload.legId) return l;
        const byId = Object.fromEntries((l.photos ?? []).map(p => [p.id, p]));
        const photos = action.payload.orderedIds
          .filter(id => byId[id])
          .map((id, i) => ({ ...byId[id], order: i }));
        return { ...l, photos };
      });
      return { ...state, legs };
    }
    case 'SET_JOURNEY_META':
      return { ...state, journey: { ...(state.journey ?? {}), ...action.payload } };
    case 'COMPLETE_EXPEDITION': {
      return {
        ...state,
        trip: { ...state.trip, status: 'AFTER-ACTION' },
      };
    }
    case 'ADD_INSIGHT': {
      const insight = action.payload;
      const existing = state.architect.insights.filter(i => i.id !== insight.id);
      const next = [insight, ...existing].slice(0, 10);
      return {
        ...state,
        architect: { insights: next, lastGeneratedAt: Date.now() },
      };
    }
    case 'DISMISS_INSIGHT': {
      const { id } = action.payload;
      return {
        ...state,
        architect: {
          ...state.architect,
          insights: state.architect.insights.filter(i => i.id !== id),
        },
      };
    }
    case 'ADD_VAULT_DOCUMENT': {
      const doc = { ...action.payload, id: `doc_${Date.now()}` };
      return { ...state, vault: { ...state.vault, documents: [...state.vault.documents, doc] } };
    }
    case 'UPDATE_VAULT_DOCUMENT': {
      const documents = state.vault.documents.map(d =>
        d.id === action.payload.id ? { ...d, ...action.payload.changes } : d
      );
      return { ...state, vault: { ...state.vault, documents } };
    }
    case 'ADD_SCENARIO': {
      const scenario = { ...action.payload, id: `scenario_${Date.now()}` };
      return { ...state, booking: { ...state.booking, whatIfScenarios: [...state.booking.whatIfScenarios, scenario] } };
    }
    case 'SET_JOURNEY_DATA': {
      return { ...state, journeyData: { ...state.journeyData, ...action.payload } };
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
        journey: state.journey,
        vault: state.vault,
        booking: state.booking,
        journeyData: state.journeyData,
      }));
    } catch { /* storage full or unavailable */ }
  }, [state]);

  useEffect(() => {
    if (!state.trip.startDate) return;
    const departureMs = new Date(state.trip.startDate).getTime();
    const nowMs = Date.now();
    const hoursUntil = (departureMs - nowMs) / 3_600_000;
    if (hoursUntil > 0 && hoursUntil <= 24) {
      const nextLeg = state.legs.find(l => l.status !== 'confirmed') ?? state.legs[0];
      sentinelBus.emit('DEPARTURE_IMMINENT', { hoursUntil, leg: nextLeg });
    }
  }, [state.trip.startDate, state.legs]);

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
  const addPhoto = (legId, photo) => dispatch({ type: 'ADD_PHOTO', payload: { legId, photo } });
  const removePhoto = (legId, photoId) => dispatch({ type: 'REMOVE_PHOTO', payload: { legId, photoId } });
  const updatePhoto = (legId, photoId, changes) => dispatch({ type: 'UPDATE_PHOTO', payload: { legId, photoId, changes } });
  const reorderPhotos = (legId, orderedIds) => dispatch({ type: 'REORDER_PHOTOS', payload: { legId, orderedIds } });
  const setJourneyMeta = (meta) => dispatch({ type: 'SET_JOURNEY_META', payload: meta });
  const completeExpedition = () => dispatch({ type: 'COMPLETE_EXPEDITION' });
  const addInsight = (insight) => dispatch({ type: 'ADD_INSIGHT', payload: insight });
  const dismissInsight = (id) => dispatch({ type: 'DISMISS_INSIGHT', payload: { id } });
  const addVaultDocument = (doc) => dispatch({ type: 'ADD_VAULT_DOCUMENT', payload: doc });
  const updateVaultDocument = (id, changes) => dispatch({ type: 'UPDATE_VAULT_DOCUMENT', payload: { id, changes } });
  const addScenario = (scenario) => dispatch({ type: 'ADD_SCENARIO', payload: scenario });
  const setJourneyData = (data) => dispatch({ type: 'SET_JOURNEY_DATA', payload: data });

  return (
    <TripStoreContext.Provider value={{ ...state, clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg, resetTrip, setRole, updateLegStatus, loadExpedition, addPhoto, removePhoto, updatePhoto, reorderPhotos, setJourneyMeta, completeExpedition, addInsight, dismissInsight, addVaultDocument, updateVaultDocument, addScenario, setJourneyData }}>
      {children}
    </TripStoreContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripStoreContext);
  if (!ctx) throw new Error('useTripStore must be used within TripStoreProvider');
  return ctx;
}
