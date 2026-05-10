import { useEffect } from 'react';

const TYPE_LABELS = {
  photo:       'PHOTO',
  fact:        'FACT',
  stat:        'STAT',
  breadcrumb:  'BREADCRUMB',
};

export default function SlideshowControls({ currentIndex, total, slideType, playing, onPrev, onNext, onTogglePlay }) {
  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      if (e.key === ' ')          { e.preventDefault(); onTogglePlay(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onTogglePlay]);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: '#0c0e10', borderTop: '1px solid #1e2328' }}
    >
      <button
        onClick={onPrev}
        aria-label="Previous slide"
        className="w-8 h-8 flex items-center justify-center rounded font-mono text-lg hover:bg-white/10 transition-colors"
        style={{ color: '#D9C5B2' }}
      >‹</button>

      <button
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="px-4 py-1 rounded font-mono text-xs tracking-widest uppercase transition-colors hover:bg-white/10"
        style={{ color: '#E67E22', border: '1px solid #E67E22' }}
      >
        {playing ? '‖ PAUSE' : '▶ PLAY'}
      </button>

      <button
        onClick={onNext}
        aria-label="Next slide"
        className="w-8 h-8 flex items-center justify-center rounded font-mono text-lg hover:bg-white/10 transition-colors"
        style={{ color: '#D9C5B2' }}
      >›</button>

      <div className="flex items-center gap-3 ml-4">
        <span className="font-mono text-xs" style={{ color: '#D9C5B2' }}>
          {total > 0 ? `${currentIndex + 1} / ${total}` : '— / —'}
        </span>
        <span
          className="font-mono text-xs tracking-widest px-2 py-0.5 rounded"
          style={{ background: '#1e2328', color: '#E67E22' }}
        >
          {TYPE_LABELS[slideType] ?? 'SLIDE'}
        </span>
      </div>
    </div>
  );
}
