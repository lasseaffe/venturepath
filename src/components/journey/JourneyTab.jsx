import { useState } from 'react';
import StudioView from './studio/StudioView';
import TourView from './tour/TourView';

export default function JourneyTab() {
  const [mode, setMode] = useState('STUDIO');

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-1 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {['STUDIO', 'TOUR'].map(m => (
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

      <div className="flex-1 overflow-hidden">
        {mode === 'STUDIO' ? (
          <StudioView />
        ) : (
          <TourView onExit={() => setMode('STUDIO')} />
        )}
      </div>
    </div>
  );
}
