import { useEffect } from 'react';
import { useTracks } from '../store/useTripStore.jsx';
import { ADD_TRACK } from '../store/slices/tracks.js';
import TrackStudio from '../components/studio/TrackStudio.jsx';

export default function Studio({ onBack }) {
  const { tracks, dispatch } = useTracks();

  // Ensure there's always one active draft track to compose into
  useEffect(() => {
    if (tracks.length === 0) {
      dispatch({ type: ADD_TRACK, payload: { name: "Architect's Composition", profile: 'foot' } });
    }
  }, [tracks.length, dispatch]);

  const active = tracks[tracks.length - 1];

  return (
    <div className="h-screen w-screen bg-[#0E1012] text-[#D9C5B2] relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 right-20 z-[1100] rounded border border-[#3a2f25] bg-[#0E1012]/90 px-3 py-2 font-[JetBrains_Mono] text-xs uppercase tracking-wider text-[#D9C5B2] hover:border-[#E67E22]"
        >
          ← Basecamp
        </button>
      )}
      {active && <TrackStudio trackId={active.id} />}
    </div>
  );
}
