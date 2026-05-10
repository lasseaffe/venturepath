import { useMemo, useEffect } from 'react';
import { TripStoreProvider, useTripStore } from '../store/useTripStore';
import TourView from '../components/journey/tour/TourView';

export default function TourPage({ slug }) {
  const tripData = useMemo(() => {
    try {
      const raw = localStorage.getItem('vp-trip-store');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (state.journey?.shareSlug === slug && state.journey?.published) return state;
      return null;
    } catch {
      return null;
    }
  }, [slug]);

  if (!tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1012' }}>
        <div className="text-center space-y-3">
          <p className="font-editorial text-xl" style={{ color: '#fff' }}>Tour not found</p>
          <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
            This tour link only works on the device where it was created.
          </p>
          <a
            href={window.location.pathname}
            className="text-xs font-mono underline"
            style={{ color: 'var(--ember)' }}
          >
            Open VenturePath
          </a>
        </div>
      </div>
    );
  }

  return (
    <TripStoreProvider>
      <TourPageInner tripData={tripData} />
    </TripStoreProvider>
  );
}

function TourPageInner({ tripData }) {
  const { loadExpedition } = useTripStore();

  useEffect(() => {
    loadExpedition({
      trip: tripData.trip,
      legs: tripData.legs,
      objectives: tripData.objectives ?? [],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex flex-col relative" style={{ background: '#0E1012' }}>
      <div
        className="absolute bottom-4 left-4 z-50 font-mono text-xs"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        Made with VenturePath
      </div>
      <TourView onExit={() => { window.location.hash = ''; }} />
    </div>
  );
}
