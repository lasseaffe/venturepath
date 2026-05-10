import { useState, useEffect } from 'react';
import { useInspireData, matchCity } from '../../hooks/useInspireData';
import ReportButton from './ReportButton.jsx';

const CATEGORY_META = {
  landmark:      { label: 'LANDMARK',      dot: '#E67E22' },
  food:          { label: 'FOOD',           dot: '#22C55E' },
  activity:      { label: 'ACTIVITY',       dot: '#60A5FA' },
  hidden_gem:    { label: 'HIDDEN GEM',     dot: '#A78BFA' },
  transport_hub: { label: 'TRANSPORT HUB',  dot: '#FBBF24' },
};

export default function InspirePanel({ open, dayLabel, onClose, onAddBlock }) {
  const { cities, loading, error } = useInspireData();
  const [selectedCity, setSelectedCity] = useState(null);

  const city = selectedCity ?? (open && cities.length ? matchCity(cities, dayLabel) : null);

  useEffect(() => {
    if (open) setSelectedCity(null);
  }, [open, dayLabel]);

  function handleAddPoi(poi) {
    onAddBlock({
      title:    poi.name,
      time:     poi.time_suggestion ?? '',
      category: poiCategoryToBlock(poi.category),
      icon:     poi.icon,
      duration: poi.duration_min ?? undefined,
      notes:    poi.description + (poi.notes ? `\n\n★ ${poi.notes}` : ''),
    });
  }

  function shuffleCity() {
    if (!cities.length) return;
    const others = cities.filter(c => c.id !== city?.id);
    setSelectedCity(others[Math.floor(Math.random() * others.length)]);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '360px', zIndex: 50,
          background: '#0E1012',
          borderLeft: '1px solid #1e2328',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #1e2328', background: '#0c0e10' }}
        >
          <div>
            <div className="text-[9px] font-mono tracking-[0.2em] text-[#E67E22] uppercase">
              Inspire Me
            </div>
            <div className="text-[11px] font-mono font-bold text-white tracking-wider mt-0.5 uppercase">
              {loading ? 'Loading…' : city ? `${city.name}, ${city.country}` : dayLabel || 'Explore'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {city && (
              <ReportButton
                cityId={city.id}
                cityName={city.name}
                country={city.country}
              />
            )}
            <button
              onClick={shuffleCity}
              title="Try another destination"
              className="text-[9px] font-mono px-2 py-1 rounded border border-[#2a2f36] text-slate-400 hover:text-[#E67E22] hover:border-[#E67E22]/50 transition-colors tracking-widest"
            >
              ↺ SHUFFLE
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded border border-[#2a2f36] text-slate-500 hover:text-white hover:border-[#3a3f46] transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-[10px] font-mono text-slate-600 tracking-widest animate-pulse">
                LOADING INTEL…
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
              <div className="text-2xl">⚠️</div>
              <div className="text-[10px] font-mono text-red-400 tracking-widest text-center">
                INTEL UNAVAILABLE
              </div>
              <div className="text-[9px] font-mono text-slate-600 text-center leading-relaxed">
                {error}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[9px] font-mono px-3 py-1.5 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
              >
                ↺ RETRY
              </button>
            </div>
          )}

          {!loading && !error && !city && (
            <div className="flex flex-col gap-0">
              <div className="flex flex-col items-center py-10 gap-3 px-4">
                <div className="text-2xl opacity-30">✦</div>
                <div className="text-[10px] font-mono text-slate-500 tracking-widest text-center">
                  NO DATA FOR THIS DESTINATION
                </div>
                <div className="text-[9px] font-mono text-slate-600 text-center leading-relaxed max-w-[240px]">
                  {dayLabel
                    ? `"${dayLabel}" isn't in our database yet. Browse curated destinations below or shuffle for inspiration.`
                    : 'Select a city below to explore local intel.'}
                </div>
                <button
                  onClick={shuffleCity}
                  className="mt-1 text-[9px] font-mono px-3 py-1.5 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
                >
                  ↺ INSPIRE ME ANYWAY
                </button>
              </div>
              {cities.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-[8px] font-mono text-slate-600 tracking-widest mb-2 uppercase">
                    Browse destinations
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {cities.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCity(c)}
                        className="text-[8px] font-mono px-2 py-1 rounded border border-[#1e2328] text-[#4b5563] hover:border-[#E67E22]/50 hover:text-[#E67E22] transition-colors tracking-widest uppercase"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && city && (
            <>
              {/* City image + description */}
              <div className="relative h-40 shrink-0 overflow-hidden">
                <img
                  src={city.image_url}
                  alt={city.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.55)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, #0E1012 0%, transparent 60%)' }}
                />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {city.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded tracking-widest uppercase"
                        style={{ background: 'rgba(230,126,34,0.2)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.3)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1e22' }}>
                <p className="text-[11px] leading-relaxed" style={{ color: '#6b7280' }}>
                  {city.description}
                </p>
              </div>

              {/* City selector pills */}
              {cities.length > 1 && (
                <div className="px-4 py-2 flex gap-1.5 flex-wrap" style={{ borderBottom: '1px solid #1a1e22' }}>
                  {cities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCity(c)}
                      className="text-[8px] font-mono px-2 py-1 rounded border transition-colors tracking-widest uppercase"
                      style={{
                        background: c.id === city.id ? 'rgba(230,126,34,0.15)' : 'transparent',
                        borderColor: c.id === city.id ? 'rgba(230,126,34,0.5)' : '#1e2328',
                        color: c.id === city.id ? '#E67E22' : '#4b5563',
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {/* POI list */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="label-tag text-[8px] mb-1">
                  SUGGESTED ACTIVITIES — TAP TO ADD
                </div>
                {city.pois.map(poi => {
                  const meta = CATEGORY_META[poi.category] ?? { label: poi.category.toUpperCase(), dot: '#64748B' };
                  return (
                    <div
                      key={poi.id}
                      onClick={() => handleAddPoi(poi)}
                      className="rounded-lg p-3 cursor-pointer group transition-all"
                      style={{
                        background: '#111316',
                        border: '1px solid #1e2328',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#E67E22';
                        e.currentTarget.style.background = '#141619';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#1e2328';
                        e.currentTarget.style.background = '#111316';
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl leading-none mt-0.5 shrink-0">{poi.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-white truncate">
                              {poi.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className="text-[7px] font-mono tracking-widest px-1.5 py-0.5 rounded"
                                style={{ background: `${meta.dot}22`, color: meta.dot, border: `1px solid ${meta.dot}44` }}
                              >
                                {meta.label}
                              </span>
                              <ReportButton
                                cityId={city.id}
                                cityName={city.name}
                                country={city.country}
                                poiId={poi.id}
                                small
                              />
                            </div>
                          </div>
                          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#4b5563' }}>
                            {poi.description}
                          </p>
                          {poi.notes && (
                            <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: '#374151' }}>
                              ★ {poi.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {poi.time_suggestion && (
                              <span className="text-[9px] font-mono" style={{ color: '#E67E22' }}>
                                {poi.time_suggestion}
                              </span>
                            )}
                            {poi.duration_min && (
                              <span className="text-[9px] font-mono" style={{ color: '#374151' }}>
                                {poi.duration_min >= 60
                                  ? `${Math.floor(poi.duration_min / 60)}h${poi.duration_min % 60 ? `${poi.duration_min % 60}m` : ''}`
                                  : `${poi.duration_min}m`}
                              </span>
                            )}
                            <span
                              className="text-[8px] font-mono ml-auto tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: '#E67E22' }}
                            >
                              + ADD TO DAY →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function poiCategoryToBlock(cat) {
  const map = {
    landmark:      'activity',
    food:          'food',
    activity:      'activity',
    hidden_gem:    'activity',
    transport_hub: 'transport',
  };
  return map[cat] ?? 'activity';
}
