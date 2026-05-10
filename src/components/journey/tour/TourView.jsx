import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import TourMap from './TourMap';
import PhotoStage from './PhotoStage';
import TourControls from './TourControls';

const DEFAULT_COORDS = {
  1: [-33.4569, -70.6483],
  2: [-53.1638, -70.9171],
  3: [-51.0,    -72.9],
  4: [-50.94,   -73.41],
  5: [-33.4569, -70.6483],
};

export default function TourView({ onExit }) {
  const { legs, journey } = useTripStore();

  const stops = legs.map(leg => ({
    leg,
    coords: leg.coords ?? DEFAULT_COORDS[leg.id] ?? null,
    photos: [...(leg.photos ?? [])].sort((a, b) => a.order - b.order),
  }));

  const playableStops = stops.filter(s => s.photos.length > 0);

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef(null);

  const activeStop = playableStops[activeStopIndex];

  const advance = useCallback(() => {
    setPhotoIndex(pi => {
      const maxPhoto = (activeStop?.photos.length ?? 1) - 1;
      if (pi < maxPhoto) return pi + 1;
      setActiveStopIndex(si => {
        if (si < playableStops.length - 1) {
          setPhotoIndex(0);
          return si + 1;
        }
        setPlaying(false);
        setComplete(true);
        return si;
      });
      return pi;
    });
  }, [activeStop, playableStops.length]);

  useEffect(() => {
    if (!playing || complete) return;
    timerRef.current = setTimeout(advance, 4000);
    return () => clearTimeout(timerRef.current);
  }, [playing, complete, advance, activeStopIndex, photoIndex]);

  function handleJumpTo(stopIndex) {
    setActiveStopIndex(stopIndex);
    setPhotoIndex(0);
    setComplete(false);
    setPlaying(true);
  }

  function handlePrevStop() {
    if (activeStopIndex > 0) handleJumpTo(activeStopIndex - 1);
  }

  function handleNextStop() {
    if (activeStopIndex < playableStops.length - 1) handleJumpTo(activeStopIndex + 1);
  }

  const mapActiveIndex = stops.findIndex(s => s.leg.id === activeStop?.leg.id);

  if (playableStops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0E1012' }}>
        <div className="text-center space-y-3">
          <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Add photos in Studio to start your journey
          </p>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
            style={{ background: 'var(--ember)', color: '#fff' }}
          >
            Go to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ background: '#0E1012' }}>
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
        style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        Exit Tour
      </button>

      {complete && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(14,16,18,0.85)' }}
        >
          <div className="text-center space-y-4">
            <p className="font-editorial text-2xl" style={{ color: '#fff' }}>
              {journey?.title ?? 'Journey Complete'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleJumpTo(0)}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
                style={{ background: 'var(--ember)', color: '#fff' }}
              >
                Replay
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
                style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Back to Studio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[45%] shrink-0">
          <TourMap stops={stops} activeStopIndex={mapActiveIndex >= 0 ? mapActiveIndex : 0} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <PhotoStage
            photos={activeStop?.photos ?? []}
            photoIndex={photoIndex}
            stopLabel={`Stop ${activeStopIndex + 1} of ${playableStops.length} — ${activeStop?.leg.to ?? ''}`}
          />
        </div>
      </div>

      <TourControls
        stops={playableStops}
        activeStopIndex={activeStopIndex}
        playing={playing}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onPrevStop={handlePrevStop}
        onNextStop={handleNextStop}
        onJumpTo={handleJumpTo}
      />
    </div>
  );
}
