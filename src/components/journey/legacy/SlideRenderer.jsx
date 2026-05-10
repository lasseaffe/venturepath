import { useState, useEffect } from 'react';
import StatOverlay from '../StatOverlay';
import * as enrichmentCache from '../../../utils/enrichmentCache';

// ── PhotoSlide ────────────────────────────────────────────────────────────────
function PhotoSlide({ slide }) {
  return (
    <div className="relative w-full h-full bg-black">
      <img
        src={slide.photo.url}
        alt=""
        className="w-full h-full object-cover"
      />
      <StatOverlay photo={slide.photo} />
    </div>
  );
}

// ── FactSlide ─────────────────────────────────────────────────────────────────
function FactSlide({ slide }) {
  const [enrichment, setEnrichment] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    enrichmentCache.get(slide.poi_id).then(data => {
      setEnrichment(data);
      setLoading(false);
    });
  }, [slide.poi_id]);

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6"
      style={{ background: '#0E1012' }}
    >
      <div className="font-mono text-xs tracking-widest mb-3" style={{ color: '#E67E22' }}>
        ── HISTORICAL CONTEXT ──────────────────
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '70%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '90%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '60%' }} />
        </div>
      ) : enrichment ? (
        <div className="flex gap-6">
          {enrichment.image_url && (
            <img
              src={enrichment.image_url}
              alt=""
              className="w-24 h-24 object-cover rounded shrink-0"
              style={{ border: '1px solid #1e2328' }}
            />
          )}
          <div className="flex flex-col gap-2">
            <div style={{ fontFamily: 'Playfair Display, serif', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>
              {slide.poi_name}
            </div>
            <div className="font-mono text-xs px-2 py-0.5 rounded self-start" style={{ background: '#1e2328', color: '#E67E22' }}>
              {enrichment.instance_of}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: '#D9C5B2' }}>
              {enrichment.description}
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-sm" style={{ color: '#D9C5B2' }}>
          {slide.poi_name} — no historical data available.
        </div>
      )}
    </div>
  );
}

// ── StatSlide ─────────────────────────────────────────────────────────────────
function StatSlide({ slide }) {
  const rows = [
    { label: 'LEG',      value: slide.leg_label   ?? '—' },
    { label: 'DISTANCE', value: slide.distance_km != null ? `${slide.distance_km} km` : '—' },
    { label: 'ASCENT',   value: slide.ascent_m    != null ? `${slide.ascent_m} m`    : '—' },
    { label: 'PHOTOS',   value: slide.photo_count != null ? String(slide.photo_count) : '—' },
  ];

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6 font-mono"
      style={{ background: '#0E1012' }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: '#E67E22' }}>
        ── LEG COMPLETE ────────────────────────
      </div>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline gap-4">
            <span className="text-xs tracking-widest w-20 shrink-0" style={{ color: '#E67E22' }}>{r.label}</span>
            <span className="text-lg font-bold" style={{ color: '#fff' }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="text-xs tracking-widest mt-4" style={{ color: '#1e2328' }}>
        ────────────────────────────────────────
      </div>
    </div>
  );
}

// ── BreadcrumbSlide ───────────────────────────────────────────────────────────
function BreadcrumbSlide({ slide }) {
  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6 font-mono"
      style={{ background: '#0E1012' }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: '#E67E22' }}>
        ── YOU PASSED THROUGH HERE ─────────────
      </div>
      <div className="space-y-2 mb-4">
        {slide.landmarks.length > 0 ? slide.landmarks.map((l, i) => (
          <div key={i} className="flex items-center gap-3">
            <span style={{ color: '#E67E22' }}>▸</span>
            <span className="text-sm" style={{ color: '#D9C5B2' }}>{l}</span>
          </div>
        )) : (
          <div className="text-sm" style={{ color: '#D9C5B2' }}>No landmarks recorded in this window.</div>
        )}
      </div>
      <div className="text-xs" style={{ color: '#64748b' }}>
        GAP: {slide.gap_minutes}m undocumented
      </div>
    </div>
  );
}

// ── SlideRenderer (dispatcher) ────────────────────────────────────────────────
export default function SlideRenderer({ slide }) {
  if (!slide) return null;
  switch (slide.type) {
    case 'photo':       return <PhotoSlide slide={slide} />;
    case 'fact':        return <FactSlide  slide={slide} />;
    case 'stat':        return <StatSlide  slide={slide} />;
    case 'breadcrumb':  return <BreadcrumbSlide slide={slide} />;
    default:            return null;
  }
}
