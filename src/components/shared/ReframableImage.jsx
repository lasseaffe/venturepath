import { useState, useRef, useCallback, useEffect } from 'react';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import ImageAttribution from '../ui/ImageAttribution';

const STORAGE_PREFIX = 'vp-imgpos:';

function loadPosition(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : { x: 50, y: 50 };
  } catch { return { x: 50, y: 50 }; }
}

function savePosition(key, pos) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(pos)); } catch {}
}

/**
 * Full-bleed image with drag-to-reframe + left/right chevron cycling.
 * Persists crop position to localStorage keyed by `storageKey`.
 */
export default function ReframableImage({
  query,
  type = 'city',
  storageKey,
  height = 220,
  className = '',
  style = {},
  children,
  showAttribution = true,
  showChevrons = true,
}) {
  const key = storageKey ?? `${type}:${query}`;
  const [imgIndex, setImgIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [position, setPosition] = useState(() => loadPosition(key));
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragStart = useRef(null);
  const containerRef = useRef(null);

  const { image, images, loading } = useDestinationImage(query, type, imgIndex);

  useEffect(() => { setImgError(false); }, [imgIndex]);
  useEffect(() => { savePosition(key, position); }, [key, position]);

  const startDrag = useCallback((clientX, clientY) => {
    setDragging(true);
    dragStart.current = { mx: clientX, my: clientY, px: position.x, py: position.y };
  }, [position]);

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragging || !dragStart.current || !containerRef.current) return;
    const { width, height: h } = containerRef.current.getBoundingClientRect();
    const dx = ((dragStart.current.mx - clientX) / width) * 100;
    const dy = ((dragStart.current.my - clientY) / h) * 100;
    setPosition({
      x: Math.max(0, Math.min(100, dragStart.current.px + dx)),
      y: Math.max(0, Math.min(100, dragStart.current.py + dy)),
    });
  }, [dragging]);

  const endDrag = useCallback(() => { setDragging(false); }, []);

  const hasMultiple = images?.length > 1;
  const currentDot = imgIndex < 0
    ? ((imgIndex % images?.length) + (images?.length ?? 0)) % (images?.length ?? 1)
    : imgIndex % (images?.length ?? 1);

  const chevronStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(14,16,18,0.72)',
    border: '1px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    zIndex: 10,
    cursor: 'pointer',
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.2s ease',
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ height, ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); endDrag(); }}
      onMouseMove={e => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onTouchMove={e => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={endDrag}
    >
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 animate-pulse" style={{ background: '#1a2030' }} />
      )}

      {/* Image */}
      {image?.url && !imgError && (
        <img
          src={image.url}
          alt={query}
          draggable={false}
          onError={() => setImgError(true)}
          onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: `${position.x}% ${position.y}%`,
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: dragging ? 'none' : 'object-position 0.1s ease',
          }}
        />
      )}

      {/* Chevrons */}
      {showChevrons && hasMultiple && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setImgIndex(i => i - 1); }}
            style={{ ...chevronStyle, left: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L5 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setImgIndex(i => i + 1); }}
            style={{ ...chevronStyle, right: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2L9 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Dot indicators */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 4,
              zIndex: 10,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            {images.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentDot ? 14 : 5,
                  height: 3,
                  borderRadius: 2,
                  background: idx === currentDot ? '#E67E22' : 'rgba(255,255,255,0.35)',
                  transition: 'width 0.2s ease, background 0.2s ease',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Reframe hint */}
      {image?.url && !imgError && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(14,16,18,0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: '0.6rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.08em',
            zIndex: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: hovered && !dragging ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          DRAG TO REFRAME
        </div>
      )}

      {/* Attribution */}
      {showAttribution && image?.author && (
        <ImageAttribution attribution={image} />
      )}

      {/* Slot for overlaid content */}
      {children}
    </div>
  );
}
