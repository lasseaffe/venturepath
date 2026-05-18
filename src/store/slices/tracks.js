export const ADD_TRACK         = 'tracks/ADD';
export const REMOVE_TRACK      = 'tracks/REMOVE';
export const APPEND_POINTS     = 'tracks/APPEND_POINTS';
export const MOVE_POINT        = 'tracks/MOVE_POINT';
export const DELETE_POINT_RANGE= 'tracks/DELETE_POINT_RANGE';
export const ADD_WAYPOINT_TO_TRACK = 'tracks/ADD_WAYPOINT';
export const SET_TRACK_PROFILE = 'tracks/SET_PROFILE';
export const HYDRATE_ELEVATION = 'tracks/HYDRATE_ELEVATION';
export const UNDO              = 'tracks/UNDO';
export const REDO              = 'tracks/REDO';

const HISTORY_CAP = 50;

export const initialTracksState = {
  tracks: [],
  past: [],
  future: [],
};

function emptyStats() {
  return { distanceKm: 0, durationH: 0, ascentM: 0, descentM: 0, maxEleM: 0, minEleM: 0, difficulty: 'easy' };
}

function newTrack({ name, profile }) {
  return {
    id: crypto.randomUUID(),
    legId: null,
    name: name ?? 'Untitled Composition',
    profile: profile ?? 'foot',
    points: [],
    segments: [],
    waypoints: [],
    stats: emptyStats(),
    source: 'drawn',
    visibility: 'private',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function withHistory(prev, nextSnap) {
  const past = [...prev.past, { tracks: prev.tracks }].slice(-HISTORY_CAP);
  return { ...nextSnap, past, future: [] };
}

function recomputeStats(track) {
  const pts = track.points;
  if (pts.length < 2) return { ...track, stats: emptyStats() };
  let dist = 0, ascent = 0, descent = 0, maxE = -Infinity, minE = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sA = Math.sin(dLat / 2), sB = Math.sin(dLng / 2);
    const chord = sA * sA + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sB * sB;
    dist += R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
    if (a.ele != null && b.ele != null) {
      const d = b.ele - a.ele;
      if (d > 0) ascent += d; else descent -= d;
    }
    if (b.ele != null) { if (b.ele > maxE) maxE = b.ele; if (b.ele < minE) minE = b.ele; }
  }
  const SPEED = { foot: 5, cycling: 20, mtb: 12, car: 80, boat: 15, flight: 800 };
  const durationH = dist / (SPEED[track.profile] ?? 5);
  const difficulty =
    ascent > 1500 || dist > 30 ? 'expert' :
    ascent > 800  || dist > 18 ? 'hard'   :
    ascent > 300  || dist > 8  ? 'moderate' : 'easy';
  return {
    ...track,
    stats: {
      distanceKm: +dist.toFixed(2),
      durationH: +durationH.toFixed(2),
      ascentM: Math.round(ascent),
      descentM: Math.round(descent),
      maxEleM: maxE === -Infinity ? 0 : Math.round(maxE),
      minEleM: minE === Infinity ? 0 : Math.round(minE),
      difficulty,
    },
  };
}

function mapTrack(state, trackId, fn) {
  return state.tracks.map(t => t.id === trackId ? recomputeStats(fn(t)) : t);
}

export function tracksReducer(state = initialTracksState, action) {
  switch (action.type) {
    case ADD_TRACK: {
      const tracks = [...state.tracks, newTrack(action.payload ?? {})];
      return withHistory(state, { tracks });
    }
    case REMOVE_TRACK: {
      const tracks = state.tracks.filter(t => t.id !== action.payload.trackId);
      return withHistory(state, { tracks });
    }
    case APPEND_POINTS: {
      const { trackId, points, engine, profile } = action.payload;
      const tracks = mapTrack(state, trackId, t => {
        const fromIdx = t.points.length === 0 ? 0 : t.points.length - 1;
        const newPoints = [...t.points, ...points];
        const segment = {
          fromIdx,
          toIdx: newPoints.length - 1,
          profile: profile ?? t.profile,
          surface: null,
          routerEngine: engine ?? 'manual',
        };
        return { ...t, points: newPoints, segments: [...t.segments, segment], updatedAt: new Date().toISOString() };
      });
      return withHistory(state, { tracks });
    }
    case MOVE_POINT: {
      const { trackId, idx, lat, lng } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.map((p, i) => i === idx ? { ...p, lat, lng, ele: null } : p),
        updatedAt: new Date().toISOString(),
      }));
      return withHistory(state, { tracks });
    }
    case DELETE_POINT_RANGE: {
      const { trackId, fromIdx, toIdx } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.filter((_, i) => i < fromIdx || i > toIdx),
        segments: t.segments.filter(s => s.toIdx < fromIdx || s.fromIdx > toIdx),
        updatedAt: new Date().toISOString(),
      }));
      return withHistory(state, { tracks });
    }
    case ADD_WAYPOINT_TO_TRACK: {
      const { trackId, waypoint } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        waypoints: [...t.waypoints, { id: crypto.randomUUID(), category: 'view', note: null, ...waypoint }],
        updatedAt: new Date().toISOString(),
      }));
      return { ...state, tracks }; // waypoint add doesn't push history (cheap to redo manually)
    }
    case SET_TRACK_PROFILE: {
      const { trackId, profile } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({ ...t, profile, updatedAt: new Date().toISOString() }));
      return withHistory(state, { tracks });
    }
    case HYDRATE_ELEVATION: {
      const { trackId, elevations } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.map((p, i) => elevations[i] != null ? { ...p, ele: elevations[i] } : p),
      }));
      return { ...state, tracks };
    }
    case UNDO: {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        tracks: prev.tracks,
        past: state.past.slice(0, -1),
        future: [{ tracks: state.tracks }, ...state.future].slice(0, HISTORY_CAP),
      };
    }
    case REDO: {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        tracks: next.tracks,
        past: [...state.past, { tracks: state.tracks }].slice(-HISTORY_CAP),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}
