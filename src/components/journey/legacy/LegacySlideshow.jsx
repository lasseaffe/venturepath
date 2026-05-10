import { useSlideDeck } from './useSlideDeck';
import SlideRenderer from './SlideRenderer';
import SlideshowMiniMap from './SlideshowMiniMap';
import SlideshowControls from './SlideshowControls';

export default function LegacySlideshow() {
  const { slides, currentIndex, currentSlide, goNext, goPrev, playing, setPlaying } = useSlideDeck();

  if (slides.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded border"
        style={{ height: 320, background: '#0E1012', borderColor: '#1e2328' }}
      >
        <div className="font-mono text-xs tracking-widest" style={{ color: '#E67E22' }}>
          ── LEGACY ARCHIVE EMPTY ──
        </div>
        <div className="text-sm" style={{ color: '#D9C5B2' }}>
          No photos in this expedition yet.
        </div>
        <div className="font-mono text-xs" style={{ color: '#64748b' }}>
          Add photos in STUDIO to generate the Legacy Slideshow.
        </div>
      </div>
    );
  }

  const coords  = currentSlide?.coords  ?? null;
  const bearing = currentSlide?.bearing ?? 0;

  return (
    <div
      className="flex flex-col rounded overflow-hidden border"
      style={{ background: '#0E1012', borderColor: '#1e2328', height: 400 }}
    >
      {/* Split-screen: slide left, map right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: slide content ~60% */}
        <div className="flex-1 relative overflow-hidden">
          <SlideRenderer slide={currentSlide} />
        </div>

        {/* Right: rotating mini-map ~40% */}
        <div className="w-2/5 shrink-0 border-l" style={{ borderColor: '#1e2328' }}>
          <SlideshowMiniMap coords={coords} bearing={bearing} />
        </div>
      </div>

      {/* Controls bar */}
      <SlideshowControls
        currentIndex={currentIndex}
        total={slides.length}
        slideType={currentSlide?.type}
        playing={playing}
        onPrev={goPrev}
        onNext={goNext}
        onTogglePlay={() => setPlaying(p => !p)}
      />
    </div>
  );
}
