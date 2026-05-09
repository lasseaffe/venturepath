// src/components/nearby/NearbyMapOverlay.jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNearbySearch } from '../../hooks/useNearbySearch';
import { OTM_CATEGORIES } from '../../utils/otmEngine';
import NearbyResultCard from './NearbyResultCard';

export default function NearbyMapOverlay({ anchor: defaultAnchor, onClose }) {
  const map = useMap();
  const markerRef = useRef(null);

  const {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results, loading, error,
    inspireLabel, inspire,
  } = useNearbySearch(defaultAnchor);

  // Clean up highlight marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  function handleSelectPlace(place) {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (!place.coords) return;

    const marker = L.circleMarker([place.coords.lat, place.coords.lng], {
      radius: 8,
      color: '#E67E22',
      fillColor: '#E67E22',
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map);

    marker.bindPopup(`<span style="font-family:monospace;font-size:12px">${place.name}</span>`).openPopup();
    markerRef.current = marker;
    map.flyTo([place.coords.lat, place.coords.lng], 14, { duration: 0.8 });

    setTimeout(() => {
      if (markerRef.current === marker) {
        map.removeLayer(marker);
        markerRef.current = null;
      }
    }, 8000);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 288,
        zIndex: 1000,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 480,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
          🧭 NEARBY · {anchor}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {OTM_CATEGORIES.map(cat => (
            <button
              key={cat.kinds}
              type="button"
              onClick={() => setCategory(cat.kinds)}
              className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: category === cat.kinds ? 'var(--cta)' : 'var(--surface-raised)',
                color: category === cat.kinds ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${category === cat.kinds ? 'var(--cta)' : 'var(--border)'}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>SORT:</span>
          {[{ value: 'rating', label: 'Rating ↓' }, { value: 'name', label: 'Name A–Z' }].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className="text-[10px] px-2 py-0.5 rounded font-mono transition-colors"
              style={{
                background: sortBy === opt.value ? 'var(--accent)' : 'var(--surface-raised)',
                color: sortBy === opt.value ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${sortBy === opt.value ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Inspire me */}
        <button
          type="button"
          onClick={inspire}
          disabled={loading}
          className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
          style={{ background: 'var(--cta)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Searching…' : inspireLabel ? `✨ ${inspireLabel}` : '✨ Inspire me'}
        </button>

        {/* Results */}
        {error && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--status-alert)' }}>{error}</p>
        )}
        {!loading && !error && results.length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No places found.</p>
        )}
        <div className="space-y-2">
          {results.map(place => (
            <NearbyResultCard
              key={place.id}
              place={place}
              onSelect={handleSelectPlace}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
