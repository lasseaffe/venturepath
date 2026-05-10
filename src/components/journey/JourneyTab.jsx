import { useState } from 'react';
import StudioView from './studio/StudioView';
import TourView from './tour/TourView';
import JourneyMap3D from './JourneyMap3D';
import JourneySlideshow from './JourneySlideshow';
import GpxImporter from './GpxImporter';
import { useTripStore } from '../../store/useTripStore';

export default function JourneyTab() {
  const [mode, setMode] = useState('MAP');
  const { journeyData } = useTripStore();
  const photos = journeyData?.photos ?? [];
  const breadcrumbs = journeyData?.breadcrumbs ?? [];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-1 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {['STUDIO', 'TOUR', 'MAP'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded text-xs font-mono tracking-wider uppercase transition-colors"
            style={{
              background: mode === m ? 'var(--ember)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${mode === m ? 'var(--ember)' : 'var(--border)'}`,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {mode === 'STUDIO' && <StudioView />}
        {mode === 'TOUR' && <TourView onExit={() => setMode('STUDIO')} />}
        {mode === 'MAP' && (
          <div className="space-y-4 p-4">
            <GpxImporter />
            <JourneySlideshow photos={photos} />
            <JourneyMap3D breadcrumbs={breadcrumbs} photos={photos} />
          </div>
        )}
      </div>
    </div>
  );
}
